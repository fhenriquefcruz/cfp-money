import { expect, test } from 'vitest'
import { formatCurrency } from './index'

test('valores compactos usam formato brasileiro legível em gráficos', () => {
  expect(formatCurrency(6500, { compact: true })).toBe('R$ 6,5 mil')
  expect(formatCurrency(-1300000, { compact: true })).toBe('-R$ 1,3 mi')
  expect(formatCurrency(1300)).toBe('R$ 1.300,00')
})
