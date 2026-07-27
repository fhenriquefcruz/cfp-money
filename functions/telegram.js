const crypto = require('node:crypto')
const {
  FieldValue,
  Timestamp,
} = require('firebase-admin/firestore')
const {
  HttpsError,
  onCall,
  onRequest,
} = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { defineSecret } = require('firebase-functions/params')
const {
  DEFAULT_TIME_ZONE,
  addDaysIso,
  buildPeriod,
  buildTransactionDocuments,
  formatCurrency,
  isoDateInTimeZone,
  parseMoneyMessage,
  summarizeTransactions,
} = require('./lib/telegramDomain')

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN')
const TELEGRAM_WEBHOOK_SECRET = defineSecret(
  'TELEGRAM_WEBHOOK_SECRET',
)

const BOT_API = 'https://api.telegram.org'
const DRAFT_TTL_MINUTES = 15

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function hmacCode(code, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(String(code || '').trim().toUpperCase())
    .digest('hex')
}

function integrationDocId(uid) {
  return `${uid}_telegram`
}

function telegramLinkDocId(telegramUserId) {
  return String(telegramUserId)
}

function privateChat(update) {
  const message = update.message || update.callback_query?.message
  return message?.chat?.type === 'private'
}

function getTelegramIdentity(update) {
  const source =
    update.message?.from || update.callback_query?.from || {}

  return {
    telegramUserId: String(source.id || ''),
    username: source.username || '',
    firstName: source.first_name || '',
    lastName: source.last_name || '',
  }
}

function getChatId(update) {
  return String(
    update.message?.chat?.id ||
      update.callback_query?.message?.chat?.id ||
      '',
  )
}

async function telegramApi(token, method, payload = {}) {
  const response = await fetch(
    `${BOT_API}/bot${token}/${method}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )
  const data = await response.json()

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description || `Telegram API: ${method} falhou.`,
    )
  }

  return data.result
}

async function sendMessage(token, chatId, text, extra = {}) {
  return telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...extra,
  })
}

async function answerCallback(token, callbackId, text = '') {
  return telegramApi(token, 'answerCallbackQuery', {
    callback_query_id: callbackId,
    text,
    show_alert: false,
  })
}

async function getLinkByTelegramUser(db, telegramUserId) {
  const snapshot = await db
    .collection('integrationLinks')
    .doc(telegramLinkDocId(telegramUserId))
    .get()

  if (!snapshot.exists || snapshot.data().status !== 'active') {
    return null
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

async function getUserCards(db, uid) {
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('creditCards')
    .get()

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...document.data(),
    }))
    .filter((card) => card.active !== false)
}

async function getPeriodTransactions(db, uid, period) {
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('transactions')
    .where('date', '>=', period.start)
    .where('date', '<=', period.end)
    .orderBy('date', 'desc')
    .get()

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
}

async function getUserFinancialContext(db, uid) {
  const userSnapshot = await db.collection('users').doc(uid).get()

  if (!userSnapshot.exists) {
    throw new Error('Conta do Meu Real não encontrada.')
  }

  const userData = userSnapshot.data()
  const period = buildPeriod(
    userData.moneySettings || {},
    new Date(),
    DEFAULT_TIME_ZONE,
  )
  const transactions = await getPeriodTransactions(
    db,
    uid,
    period,
  )

  return {
    userData,
    period,
    transactions,
    summary: summarizeTransactions(transactions),
  }
}

function helpMessage(linked) {
  const accountLine = linked
    ? '✅ Conta vinculada ao Meu Real.'
    : '🔗 Use <code>/vincular SEU_CODIGO</code> para conectar sua conta.'

  return [
    '<b>Money no Telegram</b>',
    accountLine,
    '',
    '<b>Consultas</b>',
    '<code>/saldo</code> — saldo do ciclo financeiro',
    '<code>/resumo</code> — receitas, despesas e poupança',
    '<code>/ultimos</code> — últimos cinco lançamentos',
    '',
    '<b>Lançamentos</b>',
    'Envie uma frase como:',
    '• <i>Paguei R$ 180 no dentista por Pix</i>',
    '• <i>Recebi R$ 1.500 de renda extra</i>',
    '• <i>Comprei R$ 600 no Nubank em 3x no mercado</i>',
    '',
    'Todo lançamento exige confirmação antes de ser salvo.',
    '<code>/desvincular</code> — remover a conexão',
  ].join('\n')
}

function draftPreview(draft) {
  const lines = [
    '<b>Revise antes de salvar</b>',
    '',
    `${draft.type === 'income' ? 'Receita' : 'Despesa'}: <b>${formatCurrency(
      draft.amount,
    )}</b>`,
    `Descrição: ${escapeHtml(draft.description)}`,
    `Categoria: ${escapeHtml(draft.categoryName)}`,
    `Data: ${draft.date.split('-').reverse().join('/')}`,
  ]

  if (draft.kind === 'credit_purchase') {
    lines.push(
      `Cartão: ${escapeHtml(draft.card.name)}${
        draft.card.last4
          ? ` •••• ${escapeHtml(draft.card.last4)}`
          : ''
      }`,
      `Parcelas: ${draft.installments}x`,
    )
  } else {
    const labels = {
      pix: 'Pix',
      debit_card: 'Débito',
      cash: 'Dinheiro',
      transfer: 'Transferência',
      other: 'Outro',
    }
    lines.push(
      `Pagamento: ${
        labels[draft.paymentMethod] || 'Outro'
      }`,
    )
  }

  return lines.join('\n')
}

async function linkAccount({
  db,
  code,
  identity,
  chatId,
  integrationSecret,
  calculateEntitlement,
}) {
  const normalizedCode = String(code || '')
    .trim()
    .toUpperCase()

  if (!/^[A-Z2-9]{8}$/.test(normalizedCode)) {
    throw new Error('O código deve ter oito caracteres.')
  }

  const codeHash = hmacCode(
    normalizedCode,
    integrationSecret,
  )
  const querySnapshot = await db
    .collection('integrationLinkCodes')
    .where('codeHash', '==', codeHash)
    .limit(1)
    .get()

  if (querySnapshot.empty) {
    throw new Error('Código inválido ou já substituído.')
  }

  const codeRef = querySnapshot.docs[0].ref
  const telegramRef = db
    .collection('integrationLinks')
    .doc(telegramLinkDocId(identity.telegramUserId))

  await db.runTransaction(async (transaction) => {
    const codeSnapshot = await transaction.get(codeRef)

    if (!codeSnapshot.exists) {
      throw new Error('Código não encontrado.')
    }

    const codeData = codeSnapshot.data()
    const expiresAt = codeData.expiresAt?.toDate?.()

    if (
      codeData.status !== 'pending' ||
      !expiresAt ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new Error('Código expirado ou já utilizado.')
    }

    const userRef = db.collection('users').doc(codeData.uid)
    const userIntegrationRef = db
      .collection('userIntegrations')
      .doc(integrationDocId(codeData.uid))
    const [
      userSnapshot,
      telegramSnapshot,
      userIntegrationSnapshot,
    ] = await transaction.getAll(
      userRef,
      telegramRef,
      userIntegrationRef,
    )

    if (!userSnapshot.exists) {
      throw new Error('Conta do Meu Real não encontrada.')
    }

    const entitlement = calculateEntitlement(
      userSnapshot.data(),
    )

    if (!entitlement.isPremium || entitlement.blocked) {
      throw new Error(
        'A conta precisa estar com Premium ativo.',
      )
    }

    if (
      telegramSnapshot.exists &&
      telegramSnapshot.data().uid !== codeData.uid &&
      telegramSnapshot.data().status === 'active'
    ) {
      throw new Error(
        'Este Telegram já está vinculado a outra conta.',
      )
    }

    if (userIntegrationSnapshot.exists) {
      const previousTelegramUserId = String(
        userIntegrationSnapshot.data().telegramUserId || '',
      )
      if (
        previousTelegramUserId &&
        previousTelegramUserId !==
          identity.telegramUserId
      ) {
        transaction.delete(
          db
            .collection('integrationLinks')
            .doc(previousTelegramUserId),
        )
      }
    }

    const linkData = {
      provider: 'telegram',
      uid: codeData.uid,
      telegramUserId: identity.telegramUserId,
      chatId,
      username: identity.username,
      firstName: identity.firstName,
      lastName: identity.lastName,
      status: 'active',
      linkedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      preferences: {
        dailySummary: false,
        weeklySummary: false,
        invoiceAlerts: true,
      },
    }

    transaction.set(telegramRef, linkData)
    transaction.set(userIntegrationRef, linkData)
    transaction.update(codeRef, {
      status: 'used',
      usedAt: FieldValue.serverTimestamp(),
      telegramUserId: identity.telegramUserId,
    })
  })
}

async function unlinkByTelegramUser(
  db,
  telegramUserId,
) {
  const telegramRef = db
    .collection('integrationLinks')
    .doc(telegramLinkDocId(telegramUserId))
  const telegramSnapshot = await telegramRef.get()

  if (!telegramSnapshot.exists) return false

  const uid = telegramSnapshot.data().uid
  const batch = db.batch()
  batch.delete(telegramRef)

  if (uid) {
    batch.delete(
      db
        .collection('userIntegrations')
        .doc(integrationDocId(uid)),
    )
  }

  await batch.commit()
  return true
}

async function createDraft({
  db,
  link,
  message,
  telegramMessageId,
}) {
  const cards = await getUserCards(db, link.uid)
  const parsed = parseMoneyMessage({
    message,
    creditCards: cards,
    now: new Date(),
    timeZone: DEFAULT_TIME_ZONE,
  })

  if (!parsed.ok) return parsed

  const draftRef = db.collection('telegramDrafts').doc()
  const expiresAt = new Date(
    Date.now() + DRAFT_TTL_MINUTES * 60 * 1000,
  )

  await draftRef.set({
    uid: link.uid,
    telegramUserId: link.telegramUserId,
    chatId: link.chatId,
    telegramMessageId,
    draft: parsed.draft,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  })

  return {
    ok: true,
    draftId: draftRef.id,
    draft: parsed.draft,
  }
}

async function confirmDraft({
  db,
  draftId,
  telegramUserId,
}) {
  const draftRef = db.collection('telegramDrafts').doc(draftId)
  let createdCount = 0

  await db.runTransaction(async (transaction) => {
    const draftSnapshot = await transaction.get(draftRef)

    if (!draftSnapshot.exists) {
      throw new Error('Rascunho não encontrado.')
    }

    const data = draftSnapshot.data()
    const expiresAt = data.expiresAt?.toDate?.()

    if (
      data.telegramUserId !== telegramUserId ||
      data.status !== 'pending'
    ) {
      throw new Error('Rascunho indisponível.')
    }

    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      transaction.update(draftRef, {
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      })
      throw new Error('O rascunho expirou.')
    }

    const groupId = crypto.randomUUID()
    const documents = buildTransactionDocuments(
      data.draft,
      groupId,
    )
    createdCount = documents.length

    documents.forEach((documentData) => {
      const transactionRef = db
        .collection('users')
        .doc(data.uid)
        .collection('transactions')
        .doc()

      transaction.set(transactionRef, {
        ...documentData,
        telegramDraftId: draftId,
        createdAt: FieldValue.serverTimestamp(),
      })
    })

    transaction.update(draftRef, {
      status: 'confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
      createdCount,
    })
  })

  return createdCount
}

async function cancelDraft({
  db,
  draftId,
  telegramUserId,
}) {
  const draftRef = db.collection('telegramDrafts').doc(draftId)

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(draftRef)

    if (!snapshot.exists) return
    const data = snapshot.data()

    if (
      data.telegramUserId !== telegramUserId ||
      data.status !== 'pending'
    ) {
      return
    }

    transaction.update(draftRef, {
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
    })
  })
}

async function sendFinancialSummary(
  token,
  chatId,
  context,
  title = 'Resumo do ciclo',
) {
  const { period, summary } = context

  return sendMessage(
    token,
    chatId,
    [
      `<b>${escapeHtml(title)}</b>`,
      `${period.start.split('-').reverse().join('/')} a ${period.end
        .split('-')
        .reverse()
        .join('/')}`,
      '',
      `Receitas: <b>${formatCurrency(summary.income)}</b>`,
      `Despesas: <b>${formatCurrency(summary.expenses)}</b>`,
      `Poupança: <b>${formatCurrency(summary.savings)}</b>`,
      `Saldo: <b>${formatCurrency(summary.balance)}</b>`,
      `Lançamentos: ${summary.count}`,
    ].join('\n'),
  )
}

async function recentTransactions(db, uid) {
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('transactions')
    .orderBy('date', 'desc')
    .limit(5)
    .get()

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))
}

async function invoiceAlerts(db, uid) {
  const today = isoDateInTimeZone(
    new Date(),
    DEFAULT_TIME_ZONE,
  )
  const limitDate = addDaysIso(today, 3)
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('transactions')
    .where('dueDate', '>=', today)
    .where('dueDate', '<=', limitDate)
    .orderBy('dueDate')
    .get()

  const grouped = new Map()

  snapshot.docs.forEach((document) => {
    const item = document.data()
    if (!item.isCreditPurchase || !item.cardId) return

    const key = `${item.cardId}:${item.invoiceMonth}`
    const current = grouped.get(key) || {
      cardId: item.cardId,
      cardName: item.cardName || 'Cartão',
      invoiceMonth: item.invoiceMonth,
      dueDate: item.dueDate,
      total: 0,
    }
    current.total += Number(item.amount || 0)
    grouped.set(key, current)
  })

  if (!grouped.size) return []

  const eventsSnapshot = await db
    .collection('users')
    .doc(uid)
    .collection('invoiceEvents')
    .get()
  const events = eventsSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }))

  return [...grouped.values()]
    .map((invoice) => {
      const invoiceKey = `${invoice.cardId}:${invoice.invoiceMonth}`
      const invoiceEvents = events.filter(
        (event) =>
          event.invoiceKey === invoiceKey ||
          (event.cardId === invoice.cardId &&
            event.invoiceMonth === invoice.invoiceMonth),
      )
      const paid =
        invoiceEvents
          .filter((event) => event.type === 'payment')
          .reduce(
            (total, event) =>
              total + Number(event.amount || 0),
            0,
          ) -
        invoiceEvents
          .filter((event) => event.type === 'reversal')
          .reduce(
            (total, event) =>
              total + Number(event.amount || 0),
            0,
          )

      return {
        ...invoice,
        remaining: Math.max(0, invoice.total - paid),
      }
    })
    .filter((invoice) => invoice.remaining > 0)
}

async function handleMessage({
  db,
  token,
  update,
  integrationSecret,
  calculateEntitlement,
}) {
  const message = update.message
  const chatId = getChatId(update)
  const identity = getTelegramIdentity(update)
  const text = String(message.text || '').trim()
  const link = await getLinkByTelegramUser(
    db,
    identity.telegramUserId,
  )
  const [command, argument = ''] = text.split(/\s+/, 2)
  const normalizedCommand = command
    .split('@')[0]
    .toLowerCase()

  if (normalizedCommand === '/start' || normalizedCommand === '/ajuda') {
    await sendMessage(token, chatId, helpMessage(Boolean(link)))
    return
  }

  if (normalizedCommand === '/vincular') {
    try {
      await linkAccount({
        db,
        code: argument,
        identity,
        chatId,
        integrationSecret,
        calculateEntitlement,
      })
      await sendMessage(
        token,
        chatId,
        [
          '<b>Conta vinculada com sucesso.</b>',
          'Agora você pode consultar e registrar lançamentos pelo Telegram.',
          '',
          'Digite <code>/ajuda</code> para ver os comandos.',
        ].join('\n'),
      )
    } catch (error) {
      await sendMessage(
        token,
        chatId,
        `Não foi possível vincular: ${escapeHtml(error.message)}`,
      )
    }
    return
  }

  if (normalizedCommand === '/desvincular') {
    const removed = await unlinkByTelegramUser(
      db,
      identity.telegramUserId,
    )
    await sendMessage(
      token,
      chatId,
      removed
        ? 'A conexão com o Meu Real foi removida.'
        : 'Este Telegram não estava vinculado.',
    )
    return
  }

  if (!link) {
    await sendMessage(
      token,
      chatId,
      [
        'Este Telegram ainda não está vinculado.',
        'Gere um código em <b>Money → Preferências do Money → Telegram</b> e envie:',
        '<code>/vincular SEU_CODIGO</code>',
      ].join('\n'),
    )
    return
  }

  if (normalizedCommand === '/saldo') {
    const context = await getUserFinancialContext(db, link.uid)
    await sendMessage(
      token,
      chatId,
      [
        '<b>Saldo do ciclo financeiro</b>',
        `${context.period.start
          .split('-')
          .reverse()
          .join('/')} a ${context.period.end
          .split('-')
          .reverse()
          .join('/')}`,
        '',
        `<b>${formatCurrency(
          context.summary.balance,
        )}</b>`,
        `Receitas ${formatCurrency(
          context.summary.income,
        )} · despesas ${formatCurrency(
          context.summary.expenses,
        )}`,
      ].join('\n'),
    )
    return
  }

  if (normalizedCommand === '/resumo') {
    await sendFinancialSummary(
      token,
      chatId,
      await getUserFinancialContext(db, link.uid),
    )
    return
  }

  if (normalizedCommand === '/ultimos') {
    const items = await recentTransactions(db, link.uid)

    if (!items.length) {
      await sendMessage(
        token,
        chatId,
        'Nenhum lançamento encontrado.',
      )
      return
    }

    await sendMessage(
      token,
      chatId,
      [
        '<b>Últimos lançamentos</b>',
        '',
        ...items.map((item) => {
          const sign =
            item.type === 'income' && !item.isSavings
              ? '+'
              : '−'
          return `${item.date
            .split('-')
            .reverse()
            .join('/')} · ${escapeHtml(
            item.description || 'Lançamento',
          )}\n${sign}${formatCurrency(item.amount)}`
        }),
      ].join('\n\n'),
    )
    return
  }

  if (normalizedCommand.startsWith('/')) {
    await sendMessage(
      token,
      chatId,
      'Comando não reconhecido. Use <code>/ajuda</code>.',
    )
    return
  }

  const result = await createDraft({
    db,
    link,
    message: text,
    telegramMessageId: String(message.message_id || ''),
  })

  if (!result.ok) {
    const cards = result.needsCard
      ? await getUserCards(db, link.uid)
      : []

    await sendMessage(
      token,
      chatId,
      [
        escapeHtml(result.reason),
        cards.length
          ? `Cartões ativos: ${cards
              .map((card) => escapeHtml(card.name))
              .join(', ')}.`
          : '',
        'Exemplo: <i>Paguei R$ 80 no mercado por Pix</i>.',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    return
  }

  await sendMessage(
    token,
    chatId,
    draftPreview(result.draft),
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Confirmar',
              callback_data: `c:${result.draftId}`,
            },
            {
              text: '✏️ Cancelar',
              callback_data: `x:${result.draftId}`,
            },
          ],
        ],
      },
    },
  )
}

async function handleCallback({
  db,
  token,
  update,
}) {
  const callback = update.callback_query
  const identity = getTelegramIdentity(update)
  const data = String(callback.data || '')
  const [action, draftId] = data.split(':', 2)

  if (!draftId || !['c', 'x'].includes(action)) {
    await answerCallback(
      token,
      callback.id,
      'Ação inválida.',
    )
    return
  }

  try {
    if (action === 'c') {
      const count = await confirmDraft({
        db,
        draftId,
        telegramUserId: identity.telegramUserId,
      })

      await answerCallback(
        token,
        callback.id,
        'Lançamento salvo.',
      )
      await telegramApi(token, 'editMessageText', {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        text: [
          callback.message.text,
          '',
          `✅ <b>Confirmado:</b> ${count} registro${
            count === 1 ? '' : 's'
          } salvo${count === 1 ? '' : 's'}.`,
        ].join('\n'),
        parse_mode: 'HTML',
      })
      return
    }

    await cancelDraft({
      db,
      draftId,
      telegramUserId: identity.telegramUserId,
    })
    await answerCallback(
      token,
      callback.id,
      'Rascunho cancelado.',
    )
    await telegramApi(token, 'editMessageText', {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      text: `${callback.message.text}\n\n❌ <b>Cancelado.</b>`,
      parse_mode: 'HTML',
    })
  } catch (error) {
    await answerCallback(
      token,
      callback.id,
      error.message,
    )
  }
}

function createTelegramFunctions({
  db,
  callableOptions,
  integrationLinkSecret,
  calculateEntitlement,
}) {
  const callableSecrets = [
    integrationLinkSecret,
    TELEGRAM_BOT_TOKEN,
  ]

  const getTelegramIntegrationStatus = onCall(
    callableOptions({
      secrets: callableSecrets,
    }),
    async (request) => {
      if (!request.auth?.uid) {
        throw new HttpsError(
          'unauthenticated',
          'Faça login para continuar.',
        )
      }

      const snapshot = await db
        .collection('userIntegrations')
        .doc(integrationDocId(request.auth.uid))
        .get()

      if (!snapshot.exists) {
        return {
          linked: false,
          provider: 'telegram',
        }
      }

      const data = snapshot.data()

      return {
        linked: data.status === 'active',
        provider: 'telegram',
        username: data.username || '',
        firstName: data.firstName || '',
        linkedAt:
          data.linkedAt?.toDate?.()?.toISOString?.() || null,
        preferences: {
          dailySummary: Boolean(
            data.preferences?.dailySummary,
          ),
          weeklySummary: Boolean(
            data.preferences?.weeklySummary,
          ),
          invoiceAlerts:
            data.preferences?.invoiceAlerts !== false,
        },
      }
    },
  )

  const updateTelegramPreferences = onCall(
    callableOptions(),
    async (request) => {
      if (!request.auth?.uid) {
        throw new HttpsError(
          'unauthenticated',
          'Faça login para continuar.',
        )
      }

      const preferences = {
        dailySummary: Boolean(
          request.data?.dailySummary,
        ),
        weeklySummary: Boolean(
          request.data?.weeklySummary,
        ),
        invoiceAlerts:
          request.data?.invoiceAlerts !== false,
      }
      const ref = db
        .collection('userIntegrations')
        .doc(integrationDocId(request.auth.uid))
      const snapshot = await ref.get()

      if (!snapshot.exists) {
        throw new HttpsError(
          'failed-precondition',
          'Telegram ainda não vinculado.',
        )
      }

      const telegramUserId = String(
        snapshot.data().telegramUserId || '',
      )
      const batch = db.batch()
      batch.update(ref, {
        preferences,
        updatedAt: FieldValue.serverTimestamp(),
      })

      if (telegramUserId) {
        batch.update(
          db
            .collection('integrationLinks')
            .doc(telegramUserId),
          {
            preferences,
            updatedAt: FieldValue.serverTimestamp(),
          },
        )
      }

      await batch.commit()
      return {
        ok: true,
        preferences,
      }
    },
  )

  const unlinkTelegramIntegration = onCall(
    callableOptions(),
    async (request) => {
      if (!request.auth?.uid) {
        throw new HttpsError(
          'unauthenticated',
          'Faça login para continuar.',
        )
      }

      const ref = db
        .collection('userIntegrations')
        .doc(integrationDocId(request.auth.uid))
      const snapshot = await ref.get()

      if (!snapshot.exists) return { ok: true }

      const telegramUserId = String(
        snapshot.data().telegramUserId || '',
      )
      const batch = db.batch()
      batch.delete(ref)

      if (telegramUserId) {
        batch.delete(
          db
            .collection('integrationLinks')
            .doc(telegramUserId),
        )
      }

      await batch.commit()
      return { ok: true }
    },
  )

  const telegramWebhook = onRequest(
    {
      region: 'southamerica-east1',
      timeoutSeconds: 60,
      memory: '256MiB',
      maxInstances: 10,
      secrets: [
        integrationLinkSecret,
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_WEBHOOK_SECRET,
      ],
    },
    async (request, response) => {
      if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed')
        return
      }

      const expectedSecret =
        TELEGRAM_WEBHOOK_SECRET.value()
      const receivedSecret = request.get(
        'x-telegram-bot-api-secret-token',
      )

      if (
        !expectedSecret ||
        receivedSecret !== expectedSecret
      ) {
        response.status(403).send('Forbidden')
        return
      }

      const update = request.body || {}

      if (!privateChat(update)) {
        response.status(200).send('ignored')
        return
      }

      const token = TELEGRAM_BOT_TOKEN.value()

      try {
        if (update.callback_query) {
          await handleCallback({
            db,
            token,
            update,
          })
        } else if (update.message?.text) {
          await handleMessage({
            db,
            token,
            update,
            integrationSecret:
              integrationLinkSecret.value(),
            calculateEntitlement,
          })
        }
      } catch (error) {
        console.error(
          '[Meu Real] Telegram webhook:',
          error,
        )
        const chatId = getChatId(update)

        if (chatId) {
          await sendMessage(
            token,
            chatId,
            'Ocorreu um erro ao processar a solicitação. Nenhum lançamento foi salvo parcialmente.',
          ).catch(() => {})
        }
      }

      response.status(200).send('ok')
    },
  )

  const telegramDailyDigest = onSchedule(
    {
      region: 'southamerica-east1',
      schedule: '0 8 * * *',
      timeZone: DEFAULT_TIME_ZONE,
      timeoutSeconds: 540,
      memory: '256MiB',
      maxInstances: 1,
      secrets: [TELEGRAM_BOT_TOKEN],
    },
    async () => {
      const snapshot = await db
        .collection('userIntegrations')
        .where('provider', '==', 'telegram')
        .get()
      const token = TELEGRAM_BOT_TOKEN.value()
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_TIME_ZONE,
        weekday: 'short',
      }).format(new Date())

      for (const document of snapshot.docs) {
        const integration = document.data()

        if (
          integration.status !== 'active' ||
          !integration.chatId
        ) {
          continue
        }

        const preferences = integration.preferences || {}

        try {
          if (
            preferences.dailySummary ||
            (preferences.weeklySummary &&
              weekday === 'Mon')
          ) {
            const context = await getUserFinancialContext(
              db,
              integration.uid,
            )
            await sendFinancialSummary(
              token,
              integration.chatId,
              context,
              preferences.weeklySummary &&
                weekday === 'Mon'
                ? 'Resumo semanal'
                : 'Resumo diário',
            )
          }

          if (preferences.invoiceAlerts !== false) {
            const alerts = await invoiceAlerts(
              db,
              integration.uid,
            )

            if (alerts.length) {
              await sendMessage(
                token,
                integration.chatId,
                [
                  '<b>Faturas próximas do vencimento</b>',
                  '',
                  ...alerts.map(
                    (invoice) =>
                      `${escapeHtml(
                        invoice.cardName,
                      )} · ${invoice.dueDate
                        .split('-')
                        .reverse()
                        .join('/')}\nPendente: <b>${formatCurrency(
                        invoice.remaining,
                      )}</b>`,
                  ),
                ].join('\n\n'),
              )
            }
          }
        } catch (error) {
          console.error(
            '[Meu Real] Resumo Telegram:',
            integration.uid,
            error,
          )
        }
      }
    },
  )

  return {
    getTelegramIntegrationStatus,
    updateTelegramPreferences,
    unlinkTelegramIntegration,
    telegramWebhook,
    telegramDailyDigest,
  }
}

module.exports = {
  createTelegramFunctions,
}
