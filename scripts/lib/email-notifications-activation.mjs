const REQUIRED_ACTIVATION_KEYS = [
  'EMAIL_NOTIFICATIONS_WORKER_URL',
  'EMAIL_NOTIFICATIONS_ADMIN_SECRET',
  'EMAIL_NOTIFICATIONS_TEST_UID',
]

const HEALTH_MAX_ATTEMPTS = 8
const HEALTH_RETRY_DELAY_MS = 1500

function text(value) {
  return String(value || '').trim()
}

function validateHttpsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

async function parseJson(response, label) {
  try {
    return await response.json()
  } catch {
    throw new Error(`${label} retornou uma resposta inválida.`)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function validateActivationEnvironment(env = {}) {
  const missing = REQUIRED_ACTIVATION_KEYS.filter((key) => !text(env[key]))

  if (missing.length) {
    throw new Error(`Variáveis ausentes para ativação: ${missing.join(', ')}.`)
  }

  const workerUrl = text(env.EMAIL_NOTIFICATIONS_WORKER_URL).replace(/\/+$/, '')
  if (!validateHttpsUrl(workerUrl)) {
    throw new Error('EMAIL_NOTIFICATIONS_WORKER_URL deve usar HTTPS.')
  }

  const adminSecret = text(env.EMAIL_NOTIFICATIONS_ADMIN_SECRET)
  if (adminSecret.length < 32) {
    throw new Error('EMAIL_NOTIFICATIONS_ADMIN_SECRET deve ter pelo menos 32 caracteres.')
  }

  return {
    workerUrl,
    adminSecret,
    testUid: text(env.EMAIL_NOTIFICATIONS_TEST_UID),
  }
}

async function waitForReadyHealth({
  workerUrl,
  fetchImpl,
  sleepImpl,
  maxAttempts = HEALTH_MAX_ATTEMPTS,
  retryDelayMs = HEALTH_RETRY_DELAY_MS,
}) {
  let lastStatus = 0
  let lastConfiguration = 'desconhecida'
  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${workerUrl}/health`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'cache-control': 'no-cache',
        },
      })
      const health = await parseJson(response, '/health')

      lastStatus = response.status
      lastConfiguration = String(health?.configuration || 'desconhecida')

      if (response.status === 200 && health?.ok === true && health?.configuration === 'ready') {
        return {
          response,
          health,
          attempts: attempt,
        }
      }
    } catch (error) {
      lastError = error
    }

    if (attempt < maxAttempts) {
      await sleepImpl(retryDelayMs)
    }
  }

  if (lastError && lastStatus === 0) {
    throw lastError
  }

  throw new Error(
    `Worker não está pronto após ${maxAttempts} tentativa(s): /health retornou HTTP ${lastStatus} e configuração ${lastConfiguration}.`,
  )
}

export async function runEmailNotificationActivationCheck({
  env = {},
  fetchImpl = fetch,
  sleepImpl = sleep,
  healthMaxAttempts = HEALTH_MAX_ATTEMPTS,
  healthRetryDelayMs = HEALTH_RETRY_DELAY_MS,
} = {}) {
  const config = validateActivationEnvironment(env)

  await waitForReadyHealth({
    workerUrl: config.workerUrl,
    fetchImpl,
    sleepImpl,
    maxAttempts: healthMaxAttempts,
    retryDelayMs: healthRetryDelayMs,
  })

  const testResponse = await fetchImpl(`${config.workerUrl}/activation-test`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${config.adminSecret}`,
    },
  })
  const activationTest = await parseJson(testResponse, '/activation-test')

  if (
    testResponse.status !== 200 ||
    activationTest?.ok !== true ||
    activationTest?.status !== 'sent'
  ) {
    throw new Error(
      `Teste operacional falhou com HTTP ${testResponse.status} e status ${String(
        activationTest?.status || 'desconhecido',
      )}.`,
    )
  }

  if (activationTest.uid !== config.testUid) {
    throw new Error('O Worker respondeu com um UID diferente da conta de teste configurada.')
  }

  return {
    health: 'ready',
    activationTest: 'sent',
    uid: activationTest.uid,
    providerMessageId: String(activationTest.providerMessageId || ''),
  }
}
