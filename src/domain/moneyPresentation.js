export function formatMoneyPeriodLabel(period) {
  if (!period?.start || !period?.end) return ''
  const format = (value) => {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  return `${format(period.start)} a ${format(period.end)}`
}

const PROJECTION_CONFIDENCE_LABELS = {
  low: 'inicial',
  medium: 'moderada',
  high: 'alta',
}

export function getMoneyProjectionPresentation(projection = {}, period, today = new Date()) {
  const periodLabel = formatMoneyPeriodLabel(period)
  const suffix = periodLabel ? ` · ${periodLabel}` : ''
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  if (period?.start > todayIso) {
    return {
      label: 'Despesas cadastradas para ciclo futuro',
      detail: `Ciclo ainda não iniciado${suffix}`,
    }
  }

  if (!projection.isAvailable) {
    return {
      label: 'Despesa estimada até o fim do ciclo',
      detail: `Estimativa após ${projection.minimumElapsedDays ?? 0} dias${suffix}`,
    }
  }

  if (!projection.isPartial) {
    return {
      label: 'Despesas do ciclo encerrado',
      detail: periodLabel ? `Ciclo ${periodLabel}` : 'Ciclo encerrado',
    }
  }

  const confidence = PROJECTION_CONFIDENCE_LABELS[projection.confidence] || 'inicial'
  return {
    label: 'Despesa estimada até o fim do ciclo',
    detail: `Estimativa · confiança ${confidence}${suffix}`,
  }
}

export function getMoneyInsightHeadline(analysis) {
  if (analysis?.dataQuality?.categoryReviewCount > 0) return 'Revise algumas classificações'
  const change = analysis?.comparison?.expenseChangePercent
  if (change === null || change === undefined) return 'Construindo seu histórico financeiro'
  if (change <= -10) return 'Seus gastos desaceleraram'
  if (change >= 15) return 'Seus gastos pedem atenção'
  if (change > 0) return 'Seus gastos aumentaram levemente'
  if (change < 0) return 'Seus gastos estão menores'
  return 'Seus gastos estão estáveis'
}

export function getMoneyInsightTone(analysis) {
  if (analysis?.dataQuality?.categoryReviewCount > 0) return 'warning'
  const change = analysis?.comparison?.expenseChangePercent
  if (change === null || change === undefined) return 'neutral'
  if (change >= 15) return 'warning'
  if (change <= -10) return 'positive'
  return 'neutral'
}
