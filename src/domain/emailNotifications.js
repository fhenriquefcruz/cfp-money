export const NOTIFICATION_SETTINGS_VERSION =
  '1.0.0'

export const DEFAULT_EMAIL_NOTIFICATION_SETTINGS =
  Object.freeze({
    enabled: false,
    frequency: 'weekly',
    weekday: 1,
    monthDay: 1,
    reportHour: 8,
    timeZone: 'America/Campo_Grande',
    budgetAlerts: true,
    budgetThresholds: [70, 90, 100],
    budgetOverLimit: true,
    goalAlerts: true,
    goalProgressThresholds: [80, 100],
    goalDeadlineDays: [30, 7, 1],
    consentVersion: '',
    consentAt: null,
    testRequestId: '',
    lastTestProcessedId: '',
  })

const VALID_FREQUENCIES = new Set([
  'weekly',
  'fortnightly',
  'monthly',
])

export function normalizeEmailNotificationSettings(
  value = {},
) {
  const frequency = VALID_FREQUENCIES.has(
    value.frequency,
  )
    ? value.frequency
    : 'weekly'

  const weekday = Math.min(
    7,
    Math.max(1, Number(value.weekday) || 1),
  )
  const monthDay = Math.min(
    28,
    Math.max(1, Number(value.monthDay) || 1),
  )
  const reportHour = Math.min(
    22,
    Math.max(6, Number(value.reportHour) || 8),
  )

  const budgetThresholds = [
    ...new Set(
      (Array.isArray(value.budgetThresholds)
        ? value.budgetThresholds
        : [70, 90, 100]
      )
        .map(Number)
        .filter((item) =>
          [70, 90, 100].includes(item),
        ),
    ),
  ].sort((a, b) => a - b)

  const goalProgressThresholds = [
    ...new Set(
      (Array.isArray(
        value.goalProgressThresholds,
      )
        ? value.goalProgressThresholds
        : [80, 100]
      )
        .map(Number)
        .filter((item) =>
          [80, 100].includes(item),
        ),
    ),
  ].sort((a, b) => a - b)

  const goalDeadlineDays = [
    ...new Set(
      (Array.isArray(value.goalDeadlineDays)
        ? value.goalDeadlineDays
        : [30, 7, 1]
      )
        .map(Number)
        .filter((item) =>
          [30, 7, 1].includes(item),
        ),
    ),
  ].sort((a, b) => b - a)

  return {
    ...DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
    ...value,
    enabled: Boolean(value.enabled),
    frequency,
    weekday,
    monthDay,
    reportHour,
    timeZone:
      String(
        value.timeZone ||
          'America/Campo_Grande',
      ).trim() || 'America/Campo_Grande',
    budgetAlerts:
      value.budgetAlerts !== false,
    budgetThresholds,
    budgetOverLimit:
      value.budgetOverLimit !== false,
    goalAlerts: value.goalAlerts !== false,
    goalProgressThresholds,
    goalDeadlineDays,
    consentVersion: String(
      value.consentVersion || '',
    ),
    testRequestId: String(
      value.testRequestId || '',
    ),
    lastTestProcessedId: String(
      value.lastTestProcessedId || '',
    ),
  }
}

export function canEnableEmailNotifications(
  settings,
) {
  const normalized =
    normalizeEmailNotificationSettings(
      settings,
    )

  return (
    normalized.consentVersion ===
    NOTIFICATION_SETTINGS_VERSION
  )
}

export function nextTestRequestId() {
  const random =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`

  return `test-${random}`
}
