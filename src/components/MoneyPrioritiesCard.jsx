import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from './ui'

const LEVEL = {
  critical: ['Prioridade', 'border-[--danger-border] bg-[--danger-bg]'],
  warning: ['Atenção', 'border-[--warning-border] bg-[--warning-bg]'],
  opportunity: ['Oportunidade', 'border-[--brand-200] bg-[--brand-50]'],
}

export default function MoneyPrioritiesCard({ report }) {
  const priorities = report?.priorities || []

  return (
    <Card className="overflow-hidden shadow-sm" padding={false}>
      <div className="border-b border-[--border-subtle] p-4">
        <h2 className="text-sm font-black text-[--text-primary]">Suas prioridades agora</h2>
        <p className="mt-1 text-[10px] text-[--text-tertiary]">
          Até três ações reunidas pelo Money em ordem de relevância.
        </p>
      </div>

      <div className="space-y-2 p-4">
        {!priorities.length ? (
          <p className="rounded-xl bg-[--success-bg] p-3 text-xs font-bold text-[--success-text]">
            Nenhuma prioridade relevante agora
          </p>
        ) : (
          priorities.map((priority, index) => {
            const [label, tone] = LEVEL[priority.level] || LEVEL.opportunity
            return (
              <div
                key={priority.id}
                data-testid="money-priority"
                className={`rounded-xl border p-3 ${tone}`}
              >
                <p className="text-[9px] font-black uppercase text-[--text-tertiary]">
                  {index + 1}. {label}
                </p>
                <p className="mt-1 text-xs font-black text-[--text-primary]">{priority.title}</p>
                <p className="mt-1 text-[10px] text-[--text-secondary]">{priority.detail}</p>
                <Link
                  to={priority.to}
                  className="mt-2 inline-flex min-h-8 items-center text-[10px] font-bold text-[--text-brand]"
                >
                  {priority.actionLabel}
                </Link>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
