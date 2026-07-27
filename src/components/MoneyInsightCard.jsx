import React, { useMemo } from 'react'
import { Bot, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useMoney } from '../contexts/MoneyContext'
import { analyzeMoney } from '../domain/money'
import {
  formatMoneyPeriodLabel,
  getMoneyInsightHeadline,
  getMoneyInsightTone,
} from '../domain/moneyPresentation'
import { formatCurrency } from '../utils'
import { Card } from './ui'

const TONE_STYLES = {
  positive: {
    icon: TrendingDown,
    iconClass: 'text-[--success-icon]',
    boxClass: 'bg-[--success-bg] border-[--success-border]',
  },
  warning: {
    icon: TrendingUp,
    iconClass: 'text-[--warning-icon]',
    boxClass: 'bg-[--warning-bg] border-[--warning-border]',
  },
  neutral: {
    icon: Bot,
    iconClass: 'text-[--brand-600]',
    boxClass: 'bg-[--brand-50] border-[--brand-200]',
  },
}

function resolveAnalysisDate(referenceDate) {
  const reference = new Date(referenceDate)
  const now = new Date()
  const isCurrentMonth =
    reference.getFullYear() === now.getFullYear() &&
    reference.getMonth() === now.getMonth()

  if (isCurrentMonth) return now
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
}

export default function MoneyInsightCard({ referenceDate }) {
  const { transactions, loading } = useApp()
  const { settings, isLoading: settingsLoading } = useMoney()

  const analysis = useMemo(
    () => analyzeMoney(transactions, settings, resolveAnalysisDate(referenceDate)),
    [transactions, settings, referenceDate],
  )

  const tone = getMoneyInsightTone(analysis)
  const toneStyle = TONE_STYLES[tone]
  const ToneIcon = toneStyle.icon
  const primaryInsight = analysis.insights[0]?.message
  const categoryInsight = analysis.insights.find((insight) => insight.type === 'category_increase')
  const isLoading = loading.transactions || settingsLoading

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[--brand-100] flex items-center justify-center flex-shrink-0">
            <Bot size={18} className="text-[--brand-600]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[--brand-600]">Money</p>
            <h2 className="text-sm font-bold text-[--text-primary]">
              {isLoading ? 'Analisando seu período...' : getMoneyInsightHeadline(analysis)}
            </h2>
          </div>
        </div>
        <Link
          to="/profile"
          className="min-h-11 inline-flex items-center gap-1 px-2 text-xs text-[--text-brand] hover:underline flex-shrink-0"
        >
          Configurar <ArrowRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 rounded bg-[--bg-hover] animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-[--bg-hover] animate-pulse" />
        </div>
      ) : analysis.current.transactionCount === 0 && analysis.previous.transactionCount === 0 ? (
        <div className="rounded-xl border border-[--border-default] bg-[--bg-subtle] p-4">
          <p className="text-sm font-medium text-[--text-primary]">
            Ainda não há dados suficientes neste período.
          </p>
          <p className="text-xs text-[--text-tertiary] mt-1">
            Registre receitas e despesas para o Money começar a comparar seus ciclos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-xl border p-3 ${toneStyle.boxClass}`}>
            <div className="flex items-start gap-2">
              <ToneIcon size={15} className={`mt-0.5 flex-shrink-0 ${toneStyle.iconClass}`} />
              <p className="text-sm text-[--text-primary] leading-relaxed">{primaryInsight}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[--text-tertiary]">Despesas</p>
              <p className="text-sm font-black text-[--text-primary]">
                {formatCurrency(analysis.current.expenses)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[--text-tertiary]">Projeção</p>
              <p className="text-sm font-black text-[--text-primary]">
                {formatCurrency(analysis.projection.expenses)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-wide text-[--text-tertiary]">
                Período comparado
              </p>
              <p className="text-xs font-semibold text-[--text-secondary]">
                {formatMoneyPeriodLabel(analysis.periods.current)}
              </p>
            </div>
          </div>

          {categoryInsight && (
            <p className="text-xs text-[--text-tertiary] border-t border-[--border-subtle] pt-3">
              {categoryInsight.message}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
