import React from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

const STATE_STYLES = {
  attention: {
    icon: AlertTriangle,
    wrapper: 'border-[--warning-border] bg-[--warning-bg]',
    iconClass: 'text-[--warning-icon]',
    titleClass: 'text-[--warning-text]',
  },
  clear: {
    icon: CheckCircle2,
    wrapper: 'border-[--success-border] bg-[--success-bg]',
    iconClass: 'text-[--success-icon]',
    titleClass: 'text-[--success-text]',
  },
  insufficient: {
    icon: Search,
    wrapper: 'border-[--border-subtle] bg-[--bg-subtle]',
    iconClass: 'text-[--text-tertiary]',
    titleClass: 'text-[--text-secondary]',
  },
}

export default function SpendingLeakDiagnostic({ report }) {
  const status = report?.status || 'insufficient'
  const styles = STATE_STYLES[status] || STATE_STYLES.insufficient
  const StateIcon = styles.icon

  const summary =
    status === 'attention'
      ? 'Alguns padrões merecem revisão. Eles não significam gasto errado; apenas mostram onde o dinheiro está se concentrando.'
      : status === 'clear'
        ? 'Nenhum padrão de gasto fora do seu comportamento recente foi identificado neste período.'
        : `O diagnóstico começa a ficar confiável após pelo menos ${report?.minimumExpenseCount || 5} despesas no período.`

  return (
    <section
      className="money-leak-diagnostic border-t border-[--border-subtle] pt-4"
      aria-labelledby="money-leak-diagnostic-title"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${styles.wrapper}`}
        >
          <StateIcon size={16} className={styles.iconClass} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                Diagnóstico
              </p>
              <h3
                id="money-leak-diagnostic-title"
                className={`mt-0.5 text-sm font-black ${styles.titleClass}`}
              >
                Vazamentos de gastos
              </h3>
            </div>
            {status === 'attention' && (
              <span className="rounded-full border border-[--warning-border] bg-[--warning-bg] px-2 py-1 text-[10px] font-bold text-[--warning-text]">
                {report.findings.length} {report.findings.length === 1 ? 'sinal' : 'sinais'}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[--text-tertiary]">{summary}</p>
        </div>
      </div>

      {status === 'attention' && (
        <div className="mt-3 space-y-2" data-testid="spending-leak-findings">
          {report.findings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3"
            >
              <p className="text-xs font-black text-[--text-primary]">{finding.title}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                {finding.detail}
              </p>
              <Link
                to={finding.to}
                className="mt-2 inline-flex min-h-8 items-center gap-1 text-[10px] font-bold text-[--text-brand] hover:underline"
              >
                {finding.actionLabel}
                <ArrowRight size={11} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
