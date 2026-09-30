import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { ProgressBar } from './ui'

export default function FinancialHealthScore({ report }) {
  const [expanded, setExpanded] = useState(false)
  const score = Number(report?.score || 0)
  const color =
    score >= 75 ? 'var(--success-icon)' : score >= 50 ? 'var(--warning-icon)' : 'var(--danger-icon)'
  const r = 28
  const circ = 2 * Math.PI * r

  return (
    <div className="dashboard-health-score min-w-0">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="dashboard-health-ring relative h-16 w-16 flex-shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeDasharray={`${(score / 100) * circ} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black" style={{ color }}>
              {score}
            </span>
          </div>
        </div>

        <div className="dashboard-health-copy min-w-0 flex-1">
          <p className="text-sm font-bold text-[--text-primary]">
            Indicador financeiro · {report?.label || 'Em atenção'}
          </p>
          <p className="mt-0.5 text-xs text-[--text-tertiary]">
            {report?.summary || 'Revise os fatores do indicador.'}
          </p>
          {report?.nextAction && (
            <p className="mt-1 text-[10px] font-semibold text-[--text-secondary]">
              Maior oportunidade: {report.nextAction.label} (+{report.nextAction.missingPoints} pts)
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        className="mt-3 flex min-h-10 w-full items-center justify-between rounded-xl border border-[--border-subtle] bg-[--bg-subtle] px-3 text-left text-xs font-bold text-[--text-secondary] transition-colors hover:bg-[--bg-hover]"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span>{expanded ? 'Ocultar cálculo' : 'Entender indicador'}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3" data-testid="financial-health-breakdown">
          {report?.factors?.map((factor) => (
            <div
              key={factor.id}
              className="rounded-xl border border-[--border-subtle] bg-[--bg-subtle] p-3"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-[--text-primary]">{factor.label}</p>
                <span className="flex-shrink-0 text-[10px] font-black tabular-nums text-[--text-secondary]">
                  {factor.points}/{factor.maxPoints} pts
                </span>
              </div>
              <ProgressBar value={factor.points} max={factor.maxPoints} />
              <p className="mt-2 text-[10px] leading-relaxed text-[--text-tertiary]">
                {factor.detail}
              </p>
              {factor.missingPoints > 0 && (
                <Link
                  to={factor.to}
                  className="mt-2 inline-flex min-h-8 items-center gap-1 text-[10px] font-bold text-[--text-brand] hover:underline"
                >
                  {factor.actionLabel}
                  <ArrowRight size={11} aria-hidden="true" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
