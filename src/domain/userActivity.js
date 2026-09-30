export const ONLINE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000
export const ACTIVITY_DAY_MS = 24 * 60 * 60 * 1000

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

export function getUserActivityState(user = {}, now = new Date()) {
  const seen = toActivityDate(user.lastSeenAt)
  const reference = seen || toActivityDate(user.lastSignInAt)
  const ageMs = reference ? Math.max(0, now.getTime() - reference.getTime()) : null
  return {
    reference,
    ageMs,
    online: Boolean(seen && ageMs <= ONLINE_ACTIVITY_WINDOW_MS),
  }
}

export function formatRelativeActivity(value, now = new Date()) {
  const date = toActivityDate(value)
  if (!date) return 'Sem registro'
  const minutes = Math.floor(Math.max(0, now - date) / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `há ${hours}h` : `há ${Math.floor(hours / 24)}d`
}

