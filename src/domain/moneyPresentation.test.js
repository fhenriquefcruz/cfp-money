import {
  formatMoneyPeriodLabel,
  getMoneyInsightHeadline,
  getMoneyInsightTone,
  getMoneyProjectionPresentation,
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

test('prioriza aviso de qualidade quando há classificação a revisar', () => {
  const analysis = {
    dataQuality: { categoryReviewCount: 2 },
    comparison: { expenseChangePercent: -20 },
  }

  expect(getMoneyInsightHeadline(analysis)).toBe('Revise algumas classificações')
  expect(getMoneyInsightTone(analysis)).toBe('warning')
})

test('rotula projeção parcial como estimativa e informa confiança e período', () => {
  expect(
    getMoneyProjectionPresentation(
      { isAvailable: true, isPartial: true, confidence: 'medium' },
      { start: '2026-11-01', end: '2026-11-30' },
    ),
  ).toEqual({
    label: 'Despesa estimada até o fim do ciclo',
    detail: 'Estimativa · confiança moderada · 01/11/2026 a 30/11/2026',
  })
})

test('diferencia ciclo fechado de projeção e dados ainda insuficientes', () => {
  expect(
    getMoneyProjectionPresentation(
      { isAvailable: true, isPartial: false, confidence: 'high' },
      { start: '2026-10-01', end: '2026-10-31' },
    ),
  ).toEqual({
    label: 'Despesas do ciclo encerrado',
    detail: 'Ciclo 01/10/2026 a 31/10/2026',
  })
  expect(
    getMoneyProjectionPresentation(
      { isAvailable: false, isPartial: true, minimumElapsedDays: 5 },
      { start: '2026-11-01', end: '2026-11-30' },
    ),
  ).toEqual({
    label: 'Despesa estimada até o fim do ciclo',
    detail: 'Estimativa após 5 dias · 01/11/2026 a 30/11/2026',
  })
})
