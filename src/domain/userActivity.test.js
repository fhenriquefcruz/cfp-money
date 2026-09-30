import { describe, expect, it } from 'vitest'
import {
  buildActivitySummary,
  formatRelativeActivity,
  getUserActivityState,
  matchesActivityFilter,
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

    expect(state.key).toBe('online')
    expect(state.online).toBe(true)
  })

  it('usa o último login quando ainda não existe heartbeat', () => {
    const state = getUserActivityState(
      {
        lastSignInAt: new Date('2026-09-28T12:00:00.000Z'),
      },
      now,
    )

    expect(state.key).toBe('week')
    expect(state.online).toBe(false)
  })

  it('não presume que ausência de telemetria significa nunca acessou', () => {
    expect(getUserActivityState({}, now)).toMatchObject({
      key: 'untracked',
      label: 'Sem registro',
      online: false,
    })
  })

  it('identifica inatividade de 30 dias ou mais', () => {
    const state = getUserActivityState(
      {
        lastSignInAt: new Date('2026-08-01T12:00:00.000Z'),
      },
      now,
    )

    expect(state.key).toBe('inactive30')
  })

  it('filtra por janelas de atividade', () => {
    const online = { lastSeenAt: new Date('2026-09-30T11:59:00.000Z') }
    const week = { lastSignInAt: new Date('2026-09-26T12:00:00.000Z') }
    const old = { lastSignInAt: new Date('2026-08-01T12:00:00.000Z') }

    expect(matchesActivityFilter(online, 'online', now)).toBe(true)
    expect(matchesActivityFilter(week, '7d', now)).toBe(true)
    expect(matchesActivityFilter(old, '30d+', now)).toBe(true)
    expect(matchesActivityFilter({}, 'untracked', now)).toBe(true)
  })

  it('gera resumo sem dupla interpretação de ausência de dados', () => {
    const summary = buildActivitySummary(
      [
        { lastSeenAt: new Date('2026-09-30T11:59:00.000Z') },
        { lastSignInAt: new Date('2026-09-26T12:00:00.000Z') },
        { lastSignInAt: new Date('2026-08-01T12:00:00.000Z') },
        {},
      ],
      now,
    )

    expect(summary).toEqual({
      online: 1,
      active7d: 2,
      inactive30: 1,
      untracked: 1,
    })
  })

  it('formata tempo relativo de maneira compacta', () => {
    expect(formatRelativeActivity(new Date('2026-09-30T11:59:00.000Z'), now)).toBe('há 1 min')
    expect(formatRelativeActivity(new Date('2026-09-29T12:00:00.000Z'), now)).toBe('há 1d')
  })
})
