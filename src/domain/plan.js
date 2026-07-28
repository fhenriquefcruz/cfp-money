export const TRIAL_DAYS = 7
export const DAY_IN_MS = 86_400_000

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function calculatePlanStatus(data, { now = new Date(), isAdmin = false } = {}) {
  const base = {
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
    return { ...base, isExpired: true, blocked: true }
  }

  if (data.plan === 'premium') {
    const premiumUntil = toDate(data.premiumUntil)
    if (!premiumUntil) return { ...base, isExpired: true }

    const daysLeft = Math.ceil((premiumUntil.getTime() - now.getTime()) / DAY_IN_MS)
    return daysLeft > 0 ? { ...base, isPremium: true, daysLeft } : { ...base, isExpired: true }
  }

  if (data.plan === 'trial' || !data.plan) {
    const trialStart = toDate(data.trialStart)
    if (!trialStart) return { ...base, isTrial: true }

    const elapsedDays = Math.floor((now.getTime() - trialStart.getTime()) / DAY_IN_MS)
    const daysLeft = TRIAL_DAYS - elapsedDays
    return daysLeft > 0
      ? { ...base, isPremium: true, isTrial: true, daysLeft }
      : { ...base, isTrial: true, isExpired: true }
  }

  return { ...base, isExpired: data.plan !== 'free' }
}

export function getPlanPresentation(data, options) {
  const status = calculatePlanStatus(data, options)

  if (status.isAdminBypass) return { key: 'admin', label: 'Administrador', sub: '' }
  if (status.blocked) return { key: 'blocked', label: 'Bloqueado', sub: '' }
  if (status.isPremium && status.isTrial) {
    return { key: 'trial_active', label: 'Trial', sub: `${status.daysLeft}d restantes` }
  }
  if (status.isTrial && status.isExpired) {
    return { key: 'trial_expired', label: 'Trial', sub: 'Expirado' }
  }
  if (status.isPremium) {
    return { key: 'premium', label: 'Premium', sub: `${status.daysLeft}d restantes` }
  }
  if (data?.plan === 'premium' && status.isExpired) {
    return { key: 'premium_expired', label: 'Premium', sub: 'Expirado' }
  }
  return { key: 'free', label: 'Free', sub: '' }
}

export function formatPlanExpiration(data, locale = 'pt-BR') {
  const premiumUntil = toDate(data?.premiumUntil)
  return premiumUntil ? premiumUntil.toLocaleDateString(locale) : '—'
}
