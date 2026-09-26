import React from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from './ui'

const LEVEL_STYLES = {
  critical: {
    label: 'Prioridade',
    icon: AlertTriangle,
    iconClass: 'text-[--danger-icon]',
    boxClass: 'border-[--danger-border] bg-[--danger-bg]',
    badgeClass: 'border-[--danger-border] bg-[--danger-bg] text-[--danger-text]',
  },
  warning: {
    label: 'Atenção',
    icon: AlertTriangle,
    iconClass: 'text-[--warning-icon]',
    boxClass: 'border-[--warning-border] bg-[--warning-bg]',
    badgeClass: 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]',
  },
  opportunity: {
    label: 'Oportunidade',
    icon: Sparkles,
    iconClass: 'text-[--brand-600]',
    boxClass: 'border-[--brand-200] bg-[--brand-50]',
    badgeClass: 'border-[--brand-200] bg-[--brand-50] text-[--brand-700]',
  },
}

export default function MoneyPrioritiesCard({ report }) {
  const priorities = report?.priorities || []

  return (
    <Card className="overflow-hidden shadow-sm" padding={false}>
      <div className="border-b border-[--border-subtle] bg-gradient-to-r from-[--brand-50] to-[--bg-surface] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[--brand-600]">
              Money
            </p>
            <h2 className="mt-0.5 text-sm font-black text-[--text-primary]">
              Suas prioridades agora
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
              Sinais de pagamentos, orçamento, saúde financeira e comportamento reunidos em ordem
              de relevância.
            </p>
          </div>

          {priorities.length > 0 && (
            <span className="rounded-full border border-[--border-default] bg-[--bg-surface] px-2 py-1 text-[10px] font-bold text-[--text-secondary]">
              {priorities.length} {priorities.length === 1 ? 'ação' : 'ações'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-4">
        {priorities.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[--success-border] bg-[--success-bg] p-3">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[--success-icon]" />
            <div>
              <p className="text-xs font-bold text-[--success-text]">
                Nenhuma prioridade relevante agora
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[--success-text]">
                O Money não encontrou um ponto que mereça ser elevado acima dos demais neste
                momento.
              </p>
            </div>
          </div>
        ) : (
          priorities.map((priority, index) => {
            const styles = LEVEL_STYLES[priority.level] || LEVEL_STYLES.opportunity
            const PriorityIcon = styles.icon

            return (
              <div
                key={priority.id}
                className={`rounded-2xl border p-3 ${styles.boxClass}`}
                data-testid="money-priority"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[--bg-surface]/70">
                    <PriorityIcon size={14} className={styles.iconClass} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-[--text-tertiary]">
                        {index + 1}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${styles.badgeClass}`}
                      >
                        {styles.label}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs font-black text-[--text-primary]">
                      {priority.title}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[--text-secondary]">
                      {priority.detail}
                    </p>

                    <Link
                      to={priority.to}
                      className="mt-2 inline-flex min-h-8 items-center gap-1 text-[10px] font-bold text-[--text-brand] hover:underline"
                    >
                      {priority.actionLabel}
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
