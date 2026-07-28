import React, { useMemo } from 'react'
import {
  Bot,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info,
  Sparkles,
  CalendarRange,
} from 'lucide-react'
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
import PremiumGate from './PremiumGate'

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
    icon: Sparkles,
    iconClass: 'text-[--brand-600]',
    boxClass: 'bg-[--brand-50] border-[--brand-200]',
  },
}

function resolveAnalysisDate(referenceDate) {
  const reference = new Date(referenceDate)
  const now = new Date()
  const isCurrentMonth =
    reference.getFullYear() === now.getFullYear() && reference.getMonth() === now.getMonth()

  if (isCurrentMonth) return now
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
}

function MoneyMetric({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
        {label}
      </p>
      <p className="mt-1 text-base font-black tabular-nums text-[--text-primary]">{value}</p>
      {detail && <p className="mt-0.5 text-[10px] text-[--text-tertiary]">{detail}</p>}
    </div>
  )
}

function MoneyInsightContent({ referenceDate }) {
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
    <Card className="h-full overflow-hidden shadow-sm" padding={false}>
      <div className="border-b border-[--border-subtle] bg-gradient-to-r from-[--brand-50] via-[--bg-surface] to-[--bg-surface] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-600] text-white shadow-sm">
              <Bot size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[--brand-600]">
                  Money
                </p>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                  Premium
                </span>
              </div>
              <h2 className="mt-1 text-base font-black text-[--text-primary]">
                {isLoading ? 'Analisando seu período...' : getMoneyInsightHeadline(analysis)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link
              to="/money"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[--text-brand] transition-colors hover:bg-[--brand-50]"
            >
              Conversar
              <ArrowRight size={12} />
            </Link>
            <Link
              to="/profile"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs text-[--text-tertiary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
            >
              Configurar
            </Link>
          </div>
        </div>
      </div>

      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3.5">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
          <div>
            <p className="text-xs font-bold text-[--text-primary]">O que este painel mostra?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[--text-tertiary]">
              O Money compara o período visualizado com a referência definida no seu ciclo
              financeiro. Os valores são apenas analíticos e não alteram nenhum lançamento.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-2xl bg-[--bg-hover] animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 rounded-2xl bg-[--bg-hover] animate-pulse" />
              <div className="h-20 rounded-2xl bg-[--bg-hover] animate-pulse" />
              <div className="h-20 rounded-2xl bg-[--bg-hover] animate-pulse" />
            </div>
          </div>
        ) : analysis.current.transactionCount === 0 && analysis.previous.transactionCount === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[--border-default] bg-[--bg-subtle] p-5 text-center">
            <div>
              <CalendarRange size={24} className="mx-auto text-[--text-tertiary]" />
              <p className="mt-2 text-sm font-bold text-[--text-primary]">
                Ainda não há dados suficientes
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
                Registre receitas e despesas para o Money começar a comparar seus ciclos.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={`rounded-2xl border p-4 ${toneStyle.boxClass}`}>
              <div className="flex items-start gap-2.5">
                <ToneIcon size={17} className={`mt-0.5 flex-shrink-0 ${toneStyle.iconClass}`} />
                <p className="text-sm font-medium leading-relaxed text-[--text-primary]">
                  {primaryInsight}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MoneyMetric
                label="Despesas"
                value={formatCurrency(analysis.current.expenses)}
                detail="No período analisado"
              />
              <MoneyMetric
                label="Projeção"
                value={formatCurrency(analysis.projection.expenses)}
                detail={
                  analysis.projection.isPartial ? 'Estimativa de fechamento' : 'Ciclo fechado'
                }
              />
              <MoneyMetric
                label="Período"
                value={formatMoneyPeriodLabel(analysis.periods.current)}
                detail="Intervalo utilizado"
              />
            </div>

            {categoryInsight && (
              <div className="mt-auto border-t border-[--border-subtle] pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                  Movimento de destaque
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">
                  {categoryInsight.message}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

export default function MoneyInsightCard({ referenceDate }) {
  return (
    <PremiumGate
      variant="card"
      feature="Análise inteligente do Money"
      description="Receba comparações equivalentes, projeções de fechamento e destaques automáticos diretamente no Dashboard."
      benefits={[
        'Comparação adaptada ao ciclo',
        'Projeção de fechamento',
        'Destaques por categoria',
        'Acesso ao assistente conversacional',
      ]}
    >
      <MoneyInsightContent referenceDate={referenceDate} />
    </PremiumGate>
  )
}
