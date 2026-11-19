import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { escapeCsvText, exportToCSV, formatCsvAmount, formatRelativeDate } from './index'

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

describe('formatCsvAmount', () => {
  test('aceita valores legados em string e preserva centavos', () => {
    expect(formatCsvAmount('125.50')).toBe('125,50')
    expect(formatCsvAmount('0.29')).toBe('0,29')
    expect(formatCsvAmount(10.01)).toBe('10,01')
  })

  test('normaliza valores inválidos conforme o seletor financeiro existente', () => {
    expect(formatCsvAmount('invalid')).toBe('0,00')
  })
})

describe('exportToCSV', () => {
  test('exporta transação legada com valor string e conteúdo correto', async () => {
    const originalCreateObjectURL = URL.createObjectURL
    const createObjectURL = vi.fn(() => 'blob:meu-real-test')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = createObjectURL

    try {
      expect(() =>
        exportToCSV([
          {
            date: '2026-11-19',
            type: 'expense',
            description: 'Compra legada',
            amount: '125.50',
            paymentMethod: 'pix',
          },
        ]),
      ).not.toThrow()
      expect(createObjectURL).toHaveBeenCalledOnce()
      const blob = createObjectURL.mock.calls[0][0]
      expect(blob).toBeInstanceOf(Blob)
      const csv = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(blob)
      })
      expect(csv).toContain('"Compra legada"')
      expect(csv).toContain('"125,50"')
      expect(click).toHaveBeenCalledOnce()
    } finally {
      URL.createObjectURL = originalCreateObjectURL
      click.mockRestore()
    }
  })
})

describe('escapeCsvText', () => {
  test('neutraliza fórmulas de planilha em descrições e categorias', () => {
    expect(escapeCsvText('=1+1')).toBe("'=1+1")
    expect(escapeCsvText('  @SUM(1)')).toBe("'  @SUM(1)")
    expect(escapeCsvText('+cmd')).toBe("'+cmd")
    expect(escapeCsvText('-cmd')).toBe("'-cmd")
  })

  test('preserva texto comum e valores ausentes', () => {
    expect(escapeCsvText('Compra legada')).toBe('Compra legada')
    expect(escapeCsvText(null)).toBe('')
  })
})
