const REQUIRED_ACTIVATION_KEYS = [
  'EMAIL_NOTIFICATIONS_WORKER_URL',
  'EMAIL_NOTIFICATIONS_ADMIN_SECRET',
  'EMAIL_NOTIFICATIONS_TEST_UID',
]

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

export async function runEmailNotificationActivationCheck({ env = {}, fetchImpl = fetch } = {}) {
  const config = validateActivationEnvironment(env)

  const healthResponse = await fetchImpl(`${config.workerUrl}/health`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })
  const health = await parseJson(healthResponse, '/health')

  if (healthResponse.status !== 200 || health?.ok !== true || health?.configuration !== 'ready') {
    throw new Error(
      `Worker não está pronto: /health retornou HTTP ${healthResponse.status} e configuração ${String(
        health?.configuration || 'desconhecida',
      )}.`,
    )
  }

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
