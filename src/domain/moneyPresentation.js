export function formatMoneyPeriodLabel(period) {
  if (!period?.start || !period?.end) return ''
  const format = (value) => {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  return `${format(period.start)} a ${format(period.end)}`
}

export function getMoneyInsightHeadline(analysis) {
  const change = analysis?.comparison?.expenseChangePercent
  if (change === null || change === undefined) return 'Construindo seu histórico financeiro'
  if (change <= -10) return 'Seus gastos desaceleraram'
  if (change >= 15) return 'Seus gastos pedem atenção'
  if (change > 0) return 'Seus gastos aumentaram levemente'
  if (change < 0) return 'Seus gastos estão menores'
  return 'Seus gastos estão estáveis'
}

export function getMoneyInsightTone(analysis) {
  const change = analysis?.comparison?.expenseChangePercent
  if (change === null || change === undefined) return 'neutral'
  if (change >= 15) return 'warning'
  if (change <= -10) return 'positive'
  return 'neutral'
}
