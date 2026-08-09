const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const parseBoolean = (value, fallback, variableName) => {
  const normalized = normalize(value)

  if (!normalized) return fallback
  if (TRUE_VALUES.has(normalized)) return true
  if (FALSE_VALUES.has(normalized)) return false

  throw new Error(`${variableName} possui um valor booleano inválido: ${String(value)}`)
}

export function resolveSecurityRuntime(env = {}) {
  const mode = normalize(env.MODE || env.NODE_ENV || 'development')
  const appCheckSiteKey = String(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim()

  const appCheckEnabled = parseBoolean(
    env.VITE_APP_CHECK_ENABLED,
    Boolean(appCheckSiteKey),
    'VITE_APP_CHECK_ENABLED',
  )

  const appCheckRequired = parseBoolean(env.VITE_REQUIRE_APP_CHECK, false, 'VITE_REQUIRE_APP_CHECK')

  const appCheckDebug = parseBoolean(env.VITE_APP_CHECK_DEBUG, false, 'VITE_APP_CHECK_DEBUG')

  if (appCheckDebug && mode === 'production') {
    throw new Error('O modo debug do Firebase App Check é proibido em produção.')
  }

  if (appCheckDebug && !appCheckEnabled) {
    throw new Error('O modo debug do Firebase App Check exige que o App Check esteja habilitado.')
  }

  if (appCheckRequired && !appCheckEnabled) {
    throw new Error('Firebase App Check é obrigatório, mas VITE_APP_CHECK_ENABLED não está ativo.')
  }

  if (appCheckEnabled && !appCheckSiteKey) {
    throw new Error(
      'Firebase App Check está habilitado, mas a chave reCAPTCHA Enterprise não foi configurada.',
    )
  }

  return Object.freeze({
    mode,
    appCheckEnabled,
    appCheckRequired,
    appCheckDebug,
    appCheckSiteKey,
  })
}

export const securityRuntime = resolveSecurityRuntime(import.meta.env)
