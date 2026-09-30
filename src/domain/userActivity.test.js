import { describe, expect, it } from 'vitest'
import {
  formatRelativeActivity,
  getUserActivityState,
  ONLINE_ACTIVITY_WINDOW_MS,
} from './userActivity'

const now = new Date('2026-09-30T12:00:00.000Z')

describe('userActivity', () => {
  it('classifica atividade recente como online aproximado', () => {
    const state = getUserActivityState(
      {
        lastSeenAt: new Date(now.getTime() - ONLINE_ACTIVITY_WINDOW_MS + 1_000),
        lastSignInAt: new Date('2026-09-29T12:00:00.000Z'),
      },
      now,
    )

    expect(state.online).toBe(true)
  })

  it('usa o último login quando ainda não existe heartbeat', () => {
    const state = getUserActivityState(
      {
        lastSignInAt: new Date('2026-09-28T12:00:00.000Z'),
      },
      now,
    )

    expect(state.online).toBe(false)
    expect(state.ageMs).toBe(2 * 24 * 60 * 60 * 1000)
  })

  it('não presume que ausência de telemetria significa nunca acessou', () => {
    expect(getUserActivityState({}, now)).toMatchObject({
      online: false,
      ageMs: null,
      reference: null,
    })
  })

  it('identifica inatividade de 30 dias ou mais', () => {
    const state = getUserActivityState(
      {
        lastSignInAt: new Date('2026-08-01T12:00:00.000Z'),
      },
      now,
    )

    expect(state.online).toBe(false)
    expect(state.ageMs).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000)
  })

  it('formata tempo relativo de maneira compacta', () => {
    expect(formatRelativeActivity(new Date('2026-09-30T11:59:00.000Z'), now)).toBe('há 1 min')
    expect(formatRelativeActivity(new Date('2026-09-29T12:00:00.000Z'), now)).toBe('há 1d')
  })
})
