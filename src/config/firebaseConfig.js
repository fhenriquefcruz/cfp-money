const CONFIG_FIELDS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}

const TEST_CONFIG = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:test',
}

function isPlaceholder(value) {
  const normalized = String(value || '').trim().toLowerCase()

  return (
    !normalized ||
    normalized.includes('seu-projeto') ||
    normalized.startsWith('your_') ||
    normalized.includes('...') ||
    normalized === 'undefined' ||
    normalized === 'null'
  )
}

export function buildFirebaseConfig(env = {}) {
  return Object.fromEntries(
    Object.entries(CONFIG_FIELDS).map(([configKey, envKey]) => [
      configKey,
      String(env[envKey] || '').trim(),
    ]),
  )
}

export function validateFirebaseConfig(config = {}) {
  return Object.entries(CONFIG_FIELDS)
    .filter(([configKey]) => isPlaceholder(config[configKey]))
    .map(([configKey, envKey]) => ({
      configKey,
      envKey,
      message: `${envKey} ausente ou com valor de exemplo`,
    }))
}

export function resolveFirebaseConfig(env = {}) {
  const config = buildFirebaseConfig(env)
  const issues = validateFirebaseConfig(config)

  if (!issues.length) return config

  if (env.MODE === 'test') return TEST_CONFIG

  const details = issues.map((issue) => issue.envKey).join(', ')
  throw new Error(
    `[Meu Real] Configuração Firebase inválida. Revise: ${details}.`,
  )
}
