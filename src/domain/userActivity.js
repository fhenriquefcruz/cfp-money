export const ONLINE_ACTIVITY_WINDOW_MS = 5 * 60 * 1000
export const ONE_DAY_MS = 24 * 60 * 60 * 1000
export const SEVEN_DAYS_MS = 7 * ONE_DAY_MS
export const THIRTY_DAYS_MS = 30 * ONE_DAY_MS

export function toActivityDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

export function getUserActivityReference(user = {}) {
  return toActivityDate(user.lastSeenAt) || toActivityDate(user.lastSignInAt)
}

export function getUserActivityState(user = {}, now = new Date()) {
  const lastSeenAt = toActivityDate(user.lastSeenAt)
  const lastSignInAt = toActivityDate(user.lastSignInAt)
  const reference = lastSeenAt || lastSignInAt

  if (!reference) {
    return {
      key: 'untracked',
      label: 'Sem registro',
      detail: 'Aguardando próximo login',
      online: false,
      ageMs: null,
      reference: null,
    }
  }

  const ageMs = Math.max(0, now.getTime() - reference.getTime())

  if (lastSeenAt && ageMs <= ONLINE_ACTIVITY_WINDOW_MS) {
    return {
      key: 'online',
      label: 'Online agora',
      detail: 'Atividade recente',
      online: true,
      ageMs,
      reference,
    }
  }

  if (ageMs <= ONE_DAY_MS) {
    return {
      key: 'today',
      label: 'Ativo hoje',
      detail: 'Últimas 24 horas',
      online: false,
      ageMs,
      reference,
    }
  }

  if (ageMs <= SEVEN_DAYS_MS) {
    return {
      key: 'week',
      label: 'Ativo na semana',
      detail: 'Últimos 7 dias',
      online: false,
      ageMs,
      reference,
    }
  }

  if (ageMs >= THIRTY_DAYS_MS) {
    return {
      key: 'inactive30',
      label: 'Inativo há 30+ dias',
      detail: 'Requer atenção',
      online: false,
      ageMs,
      reference,
    }
  }

  return {
    key: 'inactive',
    label: 'Inativo',
    detail: 'Sem atividade recente',
    online: false,
    ageMs,
    reference,
  }
}

export function matchesActivityFilter(user, filter = 'all', now = new Date()) {
  if (filter === 'all') return true

  const state = getUserActivityState(user, now)

  if (filter === 'online') return state.key === 'online'
  if (filter === '24h') return state.ageMs !== null && state.ageMs <= ONE_DAY_MS
  if (filter === '7d') return state.ageMs !== null && state.ageMs <= SEVEN_DAYS_MS
  if (filter === '30d+') return state.key === 'inactive30'
  if (filter === 'untracked') return state.key === 'untracked'

  return true
}

export function formatRelativeActivity(value, now = new Date()) {
  const date = toActivityDate(value)
  if (!date) return 'Sem registro'

  const diffMs = Math.max(0, now.getTime() - date.getTime())
  const minutes = Math.floor(diffMs / 60_000)

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
  if (!date) return 'Sem registro'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function buildActivitySummary(users = [], now = new Date()) {
  return {
    online: users.filter((user) => getUserActivityState(user, now).key === 'online').length,
    active7d: users.filter((user) => {
      const state = getUserActivityState(user, now)
      return state.ageMs !== null && state.ageMs <= SEVEN_DAYS_MS
    }).length,
    inactive30: users.filter((user) => getUserActivityState(user, now).key === 'inactive30').length,
    untracked: users.filter((user) => getUserActivityState(user, now).key === 'untracked').length,
  }
}
