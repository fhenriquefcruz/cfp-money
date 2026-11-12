import { formatCurrency } from '../../utils'

/**
 * Primitivo de leitura de valores. O consumidor informa o regime e o período,
 * este componente apenas apresenta a métrica e seu estado visual.
 */
export default function FinanceKpi({ label, value, kind = 'neutral', loading = false }) {
  return (
    <div className="dashboard-period-metric mr-v2-kpi" data-kind={kind}>
      <p className="dashboard-period-metric__label">
        <span aria-hidden="true" />
        {label}
      </p>
      <p className="dashboard-period-metric__value tabular-nums">
        {loading ? '—' : formatCurrency(value)}
      </p>
    </div>
  )
}
