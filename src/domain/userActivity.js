export const ONLINE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000

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
  const date = seen || toActivityDate(user.lastSignInAt)
  const age = date ? Math.max(0, now - date) : null
  return { date, age, online: Boolean(seen && age <= ONLINE_ACTIVITY_WINDOW_MS) }
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
