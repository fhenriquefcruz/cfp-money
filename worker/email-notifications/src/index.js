import {
  goalAlertCandidates,
  isPremiumUser,
  isReportDue,
  localParts,
  reportRange,
  summarizeTransactions,
} from './domain.js'
import {
  createOrReplaceDocument,
  deleteDocument,
  getDocument,
  hashKey,
  listCollection,
  patchDocument,
} from './firestore.js'
import { alertsEmail, currency, reportEmail, sendEmail } from './mailer.js'

const CONSENT_VERSION = '1.0.0'
const DEFAULT_TIME_ZONE = 'America/Campo_Grande'

function settingsDefaults(value = {}) {
  return {
    enabled: false,
    frequency: 'weekly',
    weekday: 1,
    monthDay: 1,
    reportHour: 8,
    timeZone: DEFAULT_TIME_ZONE,
    budgetAlerts: true,
    budgetThresholds: [70, 90, 100],
    budgetOverLimit: true,
    goalAlerts: true,
    goalProgressThresholds: [80, 100],
    goalDeadlineDays: [30, 7, 1],
    consentVersion: '',
    testRequestId: '',
    lastTestProcessedId: '',
    ...value,
  }
}

function periodLabel(range) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return `${formatter.format(range.start)} a ${formatter.format(range.end)}`
}

async function deliveryPath(env, rawKey) {
  const id = await hashKey(rawKey)
  return `notificationDeliveries/${id}`
}

async function wasDelivered(env, rawKey) {
  return Boolean(await getDocument(env, await deliveryPath(env, rawKey)))
}

async function recordDelivery(env, rawKey, data) {
  await createOrReplaceDocument(env, await deliveryPath(env, rawKey), {
    key: rawKey,
    status: 'sent',
    sentAt: new Date(),
    ...data,
  })
}

async function readTransactions(env, uid) {
  return listCollection(env, `users/${uid}/transactions`, { limit: 3000 })
}

function goalAlertMessage(goal, candidate) {
  const target = Number(goal.targetAmount || 0)
  const current = Number(goal.currentAmount || 0)
  const remaining = Math.max(0, target - current)
  const name = goal.name || 'Meta'

  if (candidate === 'progress-100') {
    return {
      level: 'warning',
      title: `${name}: meta concluída`,
      message: `O objetivo de ${currency(target)} foi alcançado.`,
    }
  }

  if (candidate === 'progress-80') {
    return {
      level: 'warning',
      title: `${name}: reta final`,
      message: `A meta atingiu pelo menos 80%. Faltam ${currency(remaining)}.`,
    }
  }

  if (candidate === 'deadline-overdue') {
    return {
      level: 'danger',
      title: `${name}: prazo encerrado`,
      message: `A meta ainda possui ${currency(remaining)} pendentes após o prazo.`,
    }
  }

  const days = candidate.split('-').pop()
  return {
    level: Number(days) <= 1 ? 'danger' : 'warning',
    title: `${name}: prazo próximo`,
    message: `Faltam ${days} dia(s) para o prazo e ${currency(remaining)} para concluir.`,
  }
}

function acceptsQueueAlert(settings, item) {
  if (item.type !== 'budget') return false
  if (!settings.budgetAlerts) return false

  if (item.threshold === 'over') {
    return settings.budgetOverLimit !== false
  }

  return (
    Array.isArray(settings.budgetThresholds) &&
    settings.budgetThresholds.includes(Number(item.threshold))
  )
}

function queueAlertMessage(item) {
  const exceeded = Number(item.spent || 0) - Number(item.limit || 0)
  const over = item.threshold === 'over'

  return {
    key: `queue:${item.id}`,
    queuePath: item.name.split('/documents/').pop(),
    level: over || Number(item.threshold) >= 100 ? 'danger' : 'warning',
    title: over
      ? `${item.categoryName}: limite ultrapassado`
      : `${item.categoryName}: ${item.threshold}% do limite`,
    message: over
      ? `Gasto atual ${currency(item.spent)}, limite ${currency(item.limit)} e excesso ${currency(
          exceeded,
        )}.`
      : `Gasto atual ${currency(item.spent)} de ${currency(item.limit)} (${Number(
          item.percentage || 0,
        ).toFixed(0)}%).`,
  }
}

async function collectQueueAlerts({ env, user, settings, local }) {
  const queue = await listCollection(env, `users/${user.id}/notificationQueue`, { limit: 100 })
  const pending = []

  for (const item of queue) {
    const path = `users/${user.id}/notificationQueue/${item.id}`

    if (item.type === 'budget' && item.monthKey && item.monthKey !== local.monthKey) {
      await deleteDocument(env, path)
      continue
    }

    if (!acceptsQueueAlert(settings, item)) {
      await deleteDocument(env, path)
      continue
    }

    const alert = queueAlertMessage(item)
    const deliveryKey = `${user.id}:${alert.key}`

    if (await wasDelivered(env, deliveryKey)) {
      await deleteDocument(env, path)
      continue
    }

    pending.push({
      ...alert,
      deliveryKey,
      queuePath: path,
    })
  }

  return pending
}

async function collectGoalAlerts({ env, user, settings, now, local }) {
  if (
    !settings.goalAlerts ||
    local.hour !== Number(settings.reportHour || 8) ||
    local.minute >= 15
  ) {
    return []
  }

  const goals = await listCollection(env, `users/${user.id}/goals`, { limit: 500 })
  const pending = []

  for (const goal of goals) {
    const candidates = goalAlertCandidates(goal, now).filter((candidate) => {
      if (candidate.startsWith('progress-')) {
        const threshold = Number(candidate.split('-').pop())
        return (settings.goalProgressThresholds || []).includes(threshold)
      }

      if (candidate === 'deadline-overdue') {
        return true
      }

      const days = Number(candidate.split('-').pop())
      return (settings.goalDeadlineDays || []).includes(days)
    })

    for (const candidate of candidates) {
      const deliveryKey = `${user.id}:goal:${goal.id}:${candidate}`
      if (await wasDelivered(env, deliveryKey)) {
        continue
      }

      pending.push({
        key: `goal:${goal.id}:${candidate}`,
        deliveryKey,
        ...goalAlertMessage(goal, candidate),
      })
    }
  }

  return pending
}

async function sendReport({ env, user, settings, transactions, now, test, local }) {
  const range = reportRange(test ? 'weekly' : settings.frequency, now)
  const summary = summarizeTransactions(transactions, range)
  const key = test
    ? `test:${user.id}:${settings.testRequestId}`
    : `report:${user.id}:${settings.frequency}:${local.dateKey}`

  if (await wasDelivered(env, key)) {
    return false
  }

  const email = reportEmail({
    name: user.displayName,
    summary,
    periodLabel: periodLabel(range),
    appUrl: env.APP_URL,
    test,
  })
  const response = await sendEmail(env, {
    to: user.email,
    name: user.displayName,
    ...email,
    tags: [test ? 'test' : 'report', settings.frequency],
  })

  await recordDelivery(env, key, {
    uid: user.id,
    type: test ? 'test' : 'report',
    providerMessageId: response.messageId || '',
  })

  return true
}

async function sendAlerts({ env, user, alerts }) {
  if (!alerts.length) return 0

  const email = alertsEmail({
    name: user.displayName,
    alerts,
    appUrl: env.APP_URL,
  })
  const response = await sendEmail(env, {
    to: user.email,
    name: user.displayName,
    ...email,
    tags: ['alerts'],
  })

  for (const alert of alerts) {
    await recordDelivery(env, alert.deliveryKey, {
      uid: user.id,
      type: 'alert',
      alertKey: alert.key,
      providerMessageId: response.messageId || '',
    })

    if (alert.queuePath) {
      await deleteDocument(env, alert.queuePath)
    }
  }

  return alerts.length
}

async function processUser({ env, user, now }) {
  if (!isPremiumUser(user, now)) {
    return {
      uid: user.id,
      status: 'premium-inactive',
    }
  }

  const rawSettings = await getDocument(env, `users/${user.id}/notificationSettings/email`)
  const settings = settingsDefaults(rawSettings || {})

  const hasConsent = settings.consentVersion === CONSENT_VERSION
  if (!settings.enabled || !hasConsent) {
    return {
      uid: user.id,
      status: 'disabled',
    }
  }

  if (!user.email) {
    return {
      uid: user.id,
      status: 'missing-email',
    }
  }

  const local = localParts(now, settings.timeZone || DEFAULT_TIME_ZONE)
  const testPending =
    Boolean(settings.testRequestId) && settings.testRequestId !== settings.lastTestProcessedId
  const reportDue = isReportDue(settings, now)

  let transactions = null
  let reports = 0

  if (testPending || reportDue) {
    transactions = await readTransactions(env, user.id)
  }

  if (testPending) {
    const sent = await sendReport({
      env,
      user,
      settings,
      transactions,
      now,
      test: true,
      local,
    })

    await patchDocument(
      env,
      `users/${user.id}/notificationSettings/email`,
      {
        lastTestProcessedId: settings.testRequestId,
        lastTestSentAt: new Date(),
      },
      ['lastTestProcessedId', 'lastTestSentAt'],
    )
    if (sent) reports += 1
  }

  if (reportDue) {
    const sent = await sendReport({
      env,
      user,
      settings,
      transactions,
      now,
      test: false,
      local,
    })
    if (sent) reports += 1
  }

  const alerts = [
    ...(await collectQueueAlerts({
      env,
      user,
      settings,
      local,
    })),
    ...(await collectGoalAlerts({
      env,
      user,
      settings,
      now,
      local,
    })),
  ]
  const alertCount = await sendAlerts({
    env,
    user,
    alerts,
  })

  return {
    uid: user.id,
    status: 'processed',
    reports,
    alerts: alertCount,
  }
}

async function resolveUsers(env, onlyUid) {
  if (onlyUid) {
    const user = await getDocument(env, `users/${onlyUid}`)
    return user ? [user] : []
  }

  const maxUsers = Math.max(1, Math.min(1000, Number(env.MAX_USERS_PER_RUN || 250)))
  const subscriptions = await listCollection(env, 'notificationSubscribers', { limit: maxUsers })
  const users = []

  for (const subscription of subscriptions) {
    if (subscription.enabled === false || !subscription.uid) {
      continue
    }

    const user = await getDocument(env, `users/${subscription.uid}`)
    if (user) users.push(user)
  }

  return users
}

async function processAll(env, { now = new Date(), onlyUid = '' } = {}) {
  const users = await resolveUsers(env, onlyUid)
  const results = []

  for (const user of users) {
    try {
      results.push(
        await processUser({
          env,
          user,
          now,
        }),
      )
    } catch (error) {
      console.error('[Meu Real] Falha no usuário:', user.id, error)
      results.push({
        uid: user.id,
        status: 'failed',
        error: String(error?.message || error).slice(0, 300),
      })
    }
  }

  return {
    processedAt: now.toISOString(),
    total: users.length,
    results,
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      processAll(env, {
        now: new Date(controller.scheduledTime),
      }),
    )
  },

  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        service: 'meu-real-email-notifications',
        version: '19.0.0',
      })
    }

    if (request.method === 'POST' && url.pathname === '/run') {
      const authorization = request.headers.get('authorization')
      if (authorization !== `Bearer ${env.ADMIN_TRIGGER_SECRET}`) {
        return json({ ok: false, error: 'forbidden' }, 403)
      }

      const body = await request.json().catch(() => ({}))
      return json(
        await processAll(env, {
          onlyUid: String(body.uid || ''),
        }),
      )
    }

    return json({ ok: false, error: 'not-found' }, 404)
  },
}

export { processAll }
