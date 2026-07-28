const TRIAL_DAYS = 7
const DAY_IN_MS = 86_400_000
const MAX_PREMIUM_MONTHS = 24

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function differenceInDays(futureDate, now) {
  return Math.ceil((futureDate.getTime() - now.getTime()) / DAY_IN_MS)
}

function addThirtyDayMonths(baseDate, months) {
  return new Date(baseDate.getTime() + Number(months) * 30 * DAY_IN_MS)
}

function calculateEntitlement(data, { now = new Date(), isAdmin = false } = {}) {
  const base = {
    plan: data?.plan || 'free',
    isPremium: false,
    isTrial: false,
    isExpired: false,
    daysLeft: 0,
    blocked: Boolean(data?.blocked),
    isAdminBypass: Boolean(isAdmin),
  }

  if (isAdmin) {
    return {
      ...base,
      isPremium: true,
      blocked: false,
    }
  }

  if (!data) return base

  if (data.blocked) {
    return {
      ...base,
      isExpired: true,
      blocked: true,
    }
  }

  if (data.plan === 'premium') {
    const premiumUntil = toDate(data.premiumUntil)
    if (!premiumUntil) {
      return {
        ...base,
        isExpired: true,
      }
    }

    const daysLeft = differenceInDays(premiumUntil, now)

    return daysLeft > 0
      ? {
          ...base,
          isPremium: true,
          daysLeft,
        }
      : {
          ...base,
          isExpired: true,
        }
  }

  if (data.plan === 'trial' || !data.plan) {
    const trialStart = toDate(data.trialStart)

    if (!trialStart) {
      return {
        ...base,
        isPremium: true,
        isTrial: true,
        daysLeft: TRIAL_DAYS,
      }
    }

    const elapsedDays = Math.floor((now.getTime() - trialStart.getTime()) / DAY_IN_MS)
    const daysLeft = TRIAL_DAYS - elapsedDays

    return daysLeft > 0
      ? {
          ...base,
          isPremium: true,
          isTrial: true,
          daysLeft,
        }
      : {
          ...base,
          isTrial: true,
          isExpired: true,
        }
  }

  return base
}

function normalizeAdminAction(data = {}) {
  const targetUid = String(data.targetUid || '').trim()
  const action = String(data.action || '').trim()
  const allowedActions = new Set(['activate', 'remove', 'block', 'unblock'])

  if (!targetUid) {
    throw new Error('Usuário de destino não informado.')
  }

  if (!allowedActions.has(action)) {
    throw new Error('Ação administrativa inválida.')
  }

  const normalized = {
    targetUid,
    action,
  }

  if (action === 'activate') {
    const months = Number(data.months)

    if (!Number.isInteger(months) || months < 1 || months > MAX_PREMIUM_MONTHS) {
      throw new Error(`Use entre 1 e ${MAX_PREMIUM_MONTHS} meses.`)
    }

    normalized.months = months
  }

  return normalized
}

function buildAccessUpdate(currentData, command, now = new Date()) {
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
    return {
      blocked: true,
    }
  }

  return {
    blocked: false,
  }
}

function publicAccessSnapshot(data = {}) {
  return {
    plan: data.plan || 'free',
    blocked: Boolean(data.blocked),
    premiumUntil: toDate(data.premiumUntil)?.toISOString() || null,
  }
}

module.exports = {
  TRIAL_DAYS,
  MAX_PREMIUM_MONTHS,
  calculateEntitlement,
  normalizeAdminAction,
  buildAccessUpdate,
  publicAccessSnapshot,
}
