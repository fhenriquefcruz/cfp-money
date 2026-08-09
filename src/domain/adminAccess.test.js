import { describe, expect, it } from 'vitest'
import { buildAdminAccessUpdate, MAX_PREMIUM_MONTHS, normalizeAdminAction } from './adminAccess'

describe('adminAccess', () => {
  it('normaliza ações válidas e limita a ativação', () => {
    expect(
      normalizeAdminAction({
        targetUid: ' user-1 ',
        action: 'activate',
        months: '3',
      }),
    ).toEqual({
      targetUid: 'user-1',
      action: 'activate',
      months: 3,
    })

    expect(() =>
      normalizeAdminAction({
        targetUid: 'user-1',
        action: 'activate',
        months: MAX_PREMIUM_MONTHS + 1,
      }),
    ).toThrow(`Use entre 1 e ${MAX_PREMIUM_MONTHS} meses.`)

    expect(() => normalizeAdminAction({ action: 'block' })).toThrow(
      'Usuário de destino não informado.',
    )
  })

  it('ativa premium a partir de agora quando não há vigência futura', () => {
    const now = new Date('2026-08-09T12:00:00.000Z')
    const update = buildAdminAccessUpdate(
      { plan: 'free', premiumUntil: null, blocked: true },
      { targetUid: 'user-1', action: 'activate', months: 1 },
      now,
    )

    expect(update).toEqual({
      plan: 'premium',
      premiumUntil: new Date('2026-09-08T12:00:00.000Z'),
      blocked: false,
    })
  })

  it('estende premium vigente a partir do vencimento atual', () => {
    const now = new Date('2026-08-09T12:00:00.000Z')
    const update = buildAdminAccessUpdate(
      {
        plan: 'premium',
        premiumUntil: new Date('2026-08-20T12:00:00.000Z'),
        blocked: false,
      },
      { targetUid: 'user-1', action: 'activate', months: 2 },
      now,
    )

    expect(update.premiumUntil).toEqual(new Date('2026-10-19T12:00:00.000Z'))
  })

  it('remove premium e controla bloqueio sem alterar outros campos', () => {
    expect(buildAdminAccessUpdate({}, { targetUid: 'user-1', action: 'remove' })).toEqual({
      plan: 'free',
      premiumUntil: null,
    })

    expect(buildAdminAccessUpdate({}, { targetUid: 'user-1', action: 'block' })).toEqual({
      blocked: true,
    })

    expect(buildAdminAccessUpdate({}, { targetUid: 'user-1', action: 'unblock' })).toEqual({
      blocked: false,
    })
  })
})
