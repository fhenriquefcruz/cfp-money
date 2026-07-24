import { describe, expect, it } from 'vitest'
import { calculatePlanStatus, getPlanPresentation } from './plan'

const now = new Date('2026-07-24T12:00:00.000Z')

describe('calculatePlanStatus', () => {
  it('mantém Premium ativo e calcula os dias restantes', () => {
    const data = {
      plan: 'premium',
      premiumUntil: '2026-08-23T12:00:00.000Z',
    }

    expect(calculatePlanStatus(data, { now })).toEqual({
      isPremium: true,
      isTrial: false,
      isExpired: false,
      daysLeft: 30,
      blocked: false,
      isAdminBypass: false,
    })
    expect(getPlanPresentation(data, { now })).toEqual({
      key: 'premium',
      label: 'Premium',
      sub: '30d restantes',
    })
  })

  it('concede bypass ao administrador sem criar vencimento artificial', () => {
    const status = calculatePlanStatus(
      { plan: 'premium', premiumUntil: '2020-01-01T00:00:00.000Z', blocked: true },
      { now, isAdmin: true },
    )

    expect(status).toEqual({
      isPremium: true,
      isTrial: false,
      isExpired: false,
      daysLeft: 0,
      blocked: false,
      isAdminBypass: true,
    })
  })

  it('não calcula vencimento quando o documento ainda não foi carregado', () => {
    expect(calculatePlanStatus(null, { now })).toEqual({
      isPremium: false,
      isTrial: false,
      isExpired: false,
      daysLeft: 0,
      blocked: false,
      isAdminBypass: false,
    })
  })
})
