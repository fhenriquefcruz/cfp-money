export const ONLINE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY
const MONTH = 30 * DAY

export function toActivityDate(value) {
  if (!value) return null
  const date =
    value instanceof Date
      ? value
      : typeof value?.toDate === 'function'
        ? value.toDate()
        : typeof value?.seconds === 'number'
          ? new Date(value.seconds * 1000)
          : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const getUserActivityReference = (user = {}) =>
  toActivityDate(user.lastSeenAt) || toActivityDate(user.lastSignInAt)

export function getUserActivityState(user = {}, now = new Date()) {
  const seen = toActivityDate(user.lastSeenAt)
  const reference = seen || toActivityDate(user.lastSignInAt)
  if (!reference) return { key: 'untracked', ageMs: null, reference: null }

  const ageMs = Math.max(0, now.getTime() - reference.getTime())
  const key =
    seen && ageMs <= ONLINE_ACTIVITY_WINDOW_MS
      ? 'online'
      : ageMs <= DAY
        ? 'today'
        : ageMs <= WEEK
          ? 'week'
          : ageMs >= MONTH
            ? 'inactive30'
            : 'inactive'

  return { key, ageMs, reference }
}

export function matchesActivityFilter(user, filter = 'all', now = new Date()) {
  if (filter === 'all') return true
  const state = getUserActivityState(user, now)
  if (filter === 'online') return state.key === 'online'
  if (filter === '24h') return state.ageMs !== null && state.ageMs <= DAY
  if (filter === '7d') return state.ageMs !== null && state.ageMs <= WEEK
  if (filter === '30d+') return state.key === 'inactive30'
  return filter === 'untracked' ? state.key === 'untracked' : true
}

export function formatRelativeActivity(value, now = new Date()) {
  const date = toActivityDate(value)
  if (!date) return 'Sem registro'
  const minutes = Math.floor(Math.max(0, now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(days / 365)
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
}

export function formatActivityDate(value) {
  const date = toActivityDate(value)
  return date
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
    : 'Sem registro'
}

export function buildActivitySummary(users = [], now = new Date()) {
  const states = users.map((user) => getUserActivityState(user, now))
  return {
    online: states.filter(({ key }) => key === 'online').length,
    active7d: states.filter(({ ageMs }) => ageMs !== null && ageMs <= WEEK).length,
    inactive30: states.filter(({ key }) => key === 'inactive30').length,
  }
}
