import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { formatRelativeDate } from './index'

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 23, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('formata datas recentes no passado', () => {
    expect(formatRelativeDate('2026-07-23')).toBe('Hoje')
    expect(formatRelativeDate('2026-07-22')).toBe('Ontem')
    expect(formatRelativeDate('2026-07-20')).toBe('3 dias atrás')
  })

  test('formata datas futuras sem produzir dias negativos', () => {
    expect(formatRelativeDate('2026-07-24')).toBe('Amanhã')
    expect(formatRelativeDate('2026-07-25')).toBe('Daqui a 2 dias')
    expect(formatRelativeDate('2026-08-01')).toBe('01/08/2026')
  })
})
