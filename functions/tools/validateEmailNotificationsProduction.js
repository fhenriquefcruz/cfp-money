const crypto = require('node:crypto')
const { cert, deleteApp, initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore, Timestamp } = require('firebase-admin/firestore')

const PROJECT_ID = 'cfp-money'
const CONSENT_VERSION = '1.0.0'
const TIME_ZONE = 'America/Campo_Grande'

const REQUIRED_ENV = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'EMAIL_NOTIFICATIONS_ADMIN_SECRET',
  'EMAIL_NOTIFICATIONS_TEST_UID',
  'EMAIL_NOTIFICATIONS_WORKER_URL',
]

function required(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`)
  return value
}

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isPremiumActive(user, now = new Date()) {
  if (!user || user.blocked || user.plan !== 'premium') return false
  const until = toDate(user.premiumUntil)
  return Boolean(until && until.getTime() > now.getTime())
}

function localDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    day: '2-digit',
  }).formatToParts(date)

  return Number(parts.find((part) => part.type === 'day')?.value || 1)
}

async function restoreDocument(ref, snapshot) {
  if (snapshot.exists) {
    await ref.set(snapshot.data())
    return
  }

  await ref.delete().catch(() => {})
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  const text = await response.text()

  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    throw new Error(
      `Worker retornou HTTP ${response.status}: ${typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body)}`,
    )
  }

  return body
}

async function main() {
  for (const key of REQUIRED_ENV) required(key)

  const workerUrl = required('EMAIL_NOTIFICATIONS_WORKER_URL').replace(/\/+$/, '')
  const adminSecret = required('EMAIL_NOTIFICATIONS_ADMIN_SECRET')
  const uid = required('EMAIL_NOTIFICATIONS_TEST_UID')
  const privateKey = required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n')
  const clientEmail = required('GOOGLE_CLIENT_EMAIL')

  if (!workerUrl.startsWith('https://')) {
    throw new Error('EMAIL_NOTIFICATIONS_WORKER_URL deve usar HTTPS.')
  }

  if (adminSecret.length < 32) {
    throw new Error('EMAIL_NOTIFICATIONS_ADMIN_SECRET deve ter pelo menos 32 caracteres.')
  }

  const app = initializeApp({
    projectId: PROJECT_ID,
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail,
      privateKey,
    }),
  })

  const db = getFirestore(app)
  const auth = getAuth(app)
  const userRef = db.doc(`users/${uid}`)
  const settingsRef = db.doc(`users/${uid}/notificationSettings/email`)
  const subscriberRef = db.doc(`notificationSubscribers/${uid}`)

  const [authUser, userSnapshot, settingsBefore, subscriberBefore] = await Promise.all([
    auth.getUser(uid),
    userRef.get(),
    settingsRef.get(),
    subscriberRef.get(),
  ])

  const blockers = []

  if (!authUser.email) {
    blockers.push('conta sem e-mail no Firebase Authentication')
  } else if (!authUser.emailVerified) {
    blockers.push('e-mail não verificado no Firebase Authentication')
  }

  if (!userSnapshot.exists) {
    blockers.push('perfil ausente no Firestore')
  }

  const user = userSnapshot.exists ? userSnapshot.data() : null

  if (user?.blocked) {
    blockers.push('conta bloqueada')
  }

  if (user?.email && authUser.email && user.email !== authUser.email) {
    blockers.push('e-mail do Firestore diverge do Firebase Authentication')
  }

  if (blockers.length) {
    throw new Error(`Pré-requisitos da conta de teste não atendidos: ${blockers.join('; ')}.`)
  }

  const temporaryPremium = !isPremiumActive(user)
  const requestId = `production-validation-${Date.now()}-${crypto.randomUUID()}`
  const requestKey = `test:${uid}:${requestId}`
  const deliveryId = crypto.createHash('sha256').update(requestKey).digest('hex')
  const deliveryRef = db.doc(`notificationDeliveries/${deliveryId}`)

  const today = localDay()
  const safeMonthDay = today === 1 ? 2 : 1
  let delivered = false

  try {
    const now = Timestamp.now()

    if (temporaryPremium) {
      await userRef.set(
        {
          plan: 'premium',
          premiumUntil: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
        },
        { merge: true },
      )
    }

    await settingsRef.set(
      {
        enabled: true,
        frequency: 'monthly',
        weekday: 1,
        monthDay: safeMonthDay,
        reportHour: 8,
        timeZone: TIME_ZONE,
        budgetAlerts: false,
        budgetThresholds: [70, 90, 100],
        budgetOverLimit: false,
        goalAlerts: false,
        goalProgressThresholds: [80, 100],
        goalDeadlineDays: [30, 7, 1],
        consentVersion: CONSENT_VERSION,
        consentAt: now,
        settingsVersion: CONSENT_VERSION,
        testRequestId: requestId,
        testRequestedAt: now,
        updatedAt: now,
      },
      { merge: true },
    )

    await subscriberRef.set(
      {
        uid,
        enabled: true,
        updatedAt: now,
      },
      { merge: true },
    )

    const result = await fetchJson(`${workerUrl}/run`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${adminSecret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    })

    if (
      Number(result?.total) !== 1 ||
      !Array.isArray(result?.results) ||
      result.results.length !== 1
    ) {
      throw new Error('O Worker não processou exatamente a conta Premium de teste.')
    }

    const userResult = result.results[0]
    if (userResult?.status !== 'processed' || Number(userResult?.reports || 0) < 1) {
      throw new Error(
        `O Worker não confirmou o relatório de teste: status=${String(
          userResult?.status || 'desconhecido',
        )}, reports=${Number(userResult?.reports || 0)}.`,
      )
    }

    const [settingsAfter, deliverySnapshot] = await Promise.all([
      settingsRef.get(),
      deliveryRef.get(),
    ])

    const processed = settingsAfter.data() || {}
    if (processed.lastTestProcessedId !== requestId || !processed.lastTestSentAt) {
      throw new Error('O Firestore não registrou o processamento do pedido de teste.')
    }

    if (!deliverySnapshot.exists) {
      throw new Error('O registro de entrega do relatório de teste não foi encontrado.')
    }

    const delivery = deliverySnapshot.data() || {}
    if (delivery.status !== 'sent' || delivery.type !== 'test' || delivery.key !== requestKey) {
      throw new Error('O registro de entrega não corresponde ao relatório de teste solicitado.')
    }

    delivered = true

    console.log(
      'Homologação Premium concluída: conta ativa, consentimento, processamento e entrega validados.',
    )
    console.log('As preferências temporárias serão restauradas automaticamente.')
  } finally {
    await deliveryRef.delete().catch(() => {})
    await restoreDocument(settingsRef, settingsBefore)
    await restoreDocument(subscriberRef, subscriberBefore)

    if (temporaryPremium && user) {
      await userRef.set(
        {
          plan: Object.prototype.hasOwnProperty.call(user, 'plan')
            ? user.plan
            : FieldValue.delete(),
          premiumUntil: Object.prototype.hasOwnProperty.call(user, 'premiumUntil')
            ? user.premiumUntil
            : FieldValue.delete(),
        },
        { merge: true },
      )
    }

    await deleteApp(app).catch(() => {})

    if (!delivered) {
      console.error(
        'A homologação não chegou à confirmação de entrega; o estado anterior foi restaurado.',
      )
    }
  }
}

main().catch((error) => {
  console.error(`[notifications:production-validation] ${error?.message || error}`)
  process.exitCode = 1
})
