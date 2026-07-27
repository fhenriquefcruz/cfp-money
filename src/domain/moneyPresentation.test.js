import {
  formatMoneyPeriodLabel,
  getMoneyInsightHeadline,
  getMoneyInsightTone,
} from './moneyPresentation'

test('formata o período em pt-BR', () => {
  expect(formatMoneyPeriodLabel({ start: '2026-07-01', end: '2026-07-15' })).toBe(
    '01/07/2026 a 15/07/2026',
  )
})

test('classifica aumento relevante como atenção', () => {
  const analysis = { comparison: { expenseChangePercent: 18 } }
  expect(getMoneyInsightHeadline(analysis)).toBe('Seus gastos pedem atenção')
  expect(getMoneyInsightTone(analysis)).toBe('warning')
})

test('classifica redução relevante como positiva', () => {
  const analysis = { comparison: { expenseChangePercent: -12 } }
  expect(getMoneyInsightHeadline(analysis)).toBe('Seus gastos desaceleraram')
  expect(getMoneyInsightTone(analysis)).toBe('positive')
})
