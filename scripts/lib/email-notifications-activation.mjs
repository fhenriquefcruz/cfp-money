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

export async function runEmailNotificationActivationCheck({
  env = {},
  fetchImpl = fetch,
} = {}) {
  const config = validateActivationEnvironment(env)

  const healthResponse = await fetchImpl(`${config.workerUrl}/health`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })
  const health = await parseJson(healthResponse, '/health')

  if (
    healthResponse.status !== 200 ||
    health?.ok !== true ||
    health?.configuration !== 'ready'
  ) {
    throw new Error(
      `Worker não está pronto: /health retornou HTTP ${healthResponse.status} e configuração ${String(
        health?.configuration || 'desconhecida',
      )}.`,
    )
  }

  const runResponse = await fetchImpl(`${config.workerUrl}/run`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${config.adminSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      uid: config.testUid,
    }),
  })
  const run = await parseJson(runResponse, '/run')

  if (runResponse.status !== 200) {
    throw new Error(`Execução de teste falhou com HTTP ${runResponse.status}.`)
  }

  const result = Array.isArray(run?.results)
    ? run.results.find((item) => item?.uid === config.testUid)
    : null

  if (!result) {
    throw new Error('O Worker não retornou resultado para o usuário de teste configurado.')
  }

  if (result.status !== 'processed') {
    throw new Error(`Usuário de teste não foi processado: status ${String(result.status)}.`)
  }

  const reports = Number(result.reports || 0)
  if (reports < 1) {
    throw new Error(
      'Nenhum relatório de teste foi processado. Solicite um teste no Perfil antes de executar o gate.',
    )
  }

  return {
    health: 'ready',
    processed: true,
    reports,
    alerts: Number(result.alerts || 0),
  }
}
