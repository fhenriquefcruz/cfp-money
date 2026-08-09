const DAY_IN_MS = 86_400_000
export const MAX_PREMIUM_MONTHS = 24

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addThirtyDayMonths(baseDate, months) {
  return new Date(baseDate.getTime() + Number(months) * 30 * DAY_IN_MS)
}

export function normalizeAdminAction(data = {}) {
  const targetUid = String(data.targetUid || '').trim()
  const action = String(data.action || '').trim()
  const allowedActions = new Set(['activate', 'remove', 'block', 'unblock'])

  if (!targetUid) {
    throw new Error('Usuário de destino não informado.')
  }

  if (!allowedActions.has(action)) {
    throw new Error('Ação administrativa inválida.')
  }

  const normalized = { targetUid, action }

  if (action === 'activate') {
    const months = Number(data.months)

    if (!Number.isInteger(months) || months < 1 || months > MAX_PREMIUM_MONTHS) {
      throw new Error(`Use entre 1 e ${MAX_PREMIUM_MONTHS} meses.`)
    }

    normalized.months = months
  }

  return normalized
}

export function buildAdminAccessUpdate(currentData, command, now = new Date()) {
  const normalized = normalizeAdminAction(command)

  if (normalized.action === 'activate') {
    const currentPremiumUntil = toDate(currentData?.premiumUntil)
    const baseDate =
      currentPremiumUntil && currentPremiumUntil.getTime() > now.getTime()
        ? currentPremiumUntil
        : now

    return {
      plan: 'premium',
      premiumUntil: addThirtyDayMonths(baseDate, normalized.months),
      blocked: false,
    }
  }

  if (normalized.action === 'remove') {
    return {
      plan: 'free',
      premiumUntil: null,
    }
  }

  if (normalized.action === 'block') {
    return { blocked: true }
  }

  return { blocked: false }
}
