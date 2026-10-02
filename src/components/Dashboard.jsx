// src/components/Dashboard.jsx
import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Wallet,
  Plus,
  ArrowRight,
  Target,
  AlertTriangle,
  Zap,
  Heart,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  useBudgets,
  useCategories,
  useCreditCards,
  useGoals,
  useInvoiceEvents,
  useTransactions,
} from '../contexts/AppContext'
import { Card, Button, ProgressBar, EmptyState } from './ui'
import InfoTooltip from './InfoTooltip'
import MoneyInsightCard from './MoneyInsightCard'
import PaymentControlCard from './PaymentControlCard'
import FinancialHealthScore from './FinancialHealthScore'
import { formatCurrency, formatRelativeDate } from '../utils'
import { getMonthlyFinancialData } from '../domain/monthlyFinance'
import {
  buildCategoryBreakdown,
  buildMonthAttentionSignals,
  getCalendarMonthBounds,
  getLargestMonthlyExpenseChange,
  getRecentDashboardTransactions,
} from '../domain/dashboard'
import { getTransactionActivityDate, getTransactionDateContext } from '../domain/transactionDates'
import { buildCategoryReviewQueue } from '../domain/categoryReview'
import { buildPaymentControlOverview } from '../domain/paymentControl'
import { buildFinancialHealth } from '../domain/financialHealth'
import { budgetMonthKey, buildMonthlyBudgetOverview } from '../domain/budgetPeriods'
import { format, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const formatAxisCurrency = (value) =>
  `R$ ${new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'long',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)}`

const formatVariation = (value) => {
  if (value === null || value === undefined) return 'sem base anterior'
  const formatted = Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  if (value === 0) return 'sem variação'
  return `${formatted}% ${value > 0 ? 'acima' : 'abaixo'} do mês anterior`
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[--bg-elevated] border border-[--border-default] rounded-xl p-3 shadow-lg">
      <p className="text-xs font-semibold text-[--text-secondary] mb-2">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-[--text-secondary]">{e.name}:</span>
          <span className="font-bold text-[--text-primary]">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

const TxItem = ({ tx, categories }) => {
  const cat = categories.find((c) => c.id === tx.categoryId)
  const isIncome = tx.type === 'income' && !tx.isSavings
  const dateContext = getTransactionDateContext(tx)
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: tx.isSavings ? '#c49d6b15' : (cat?.color || '#c49d6b') + '18' }}
      >
        {tx.isSavings ? '🐷' : cat?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {tx.description || (tx.isSavings ? 'Poupança' : cat?.name) || 'Sem descrição'}
        </p>
        <p className="text-xs text-[--text-tertiary]">
          {formatRelativeDate(dateContext.activityDate)}
          {dateContext.hasSeparateAccountingDate ? ` · fatura ${dateContext.accountingLabel}` : ''}
          {cat && !tx.isSavings ? ` · ${cat.name}` : ''}
        </p>
      </div>
      <span
        className={`max-w-[46%] flex-shrink-0 break-words text-right text-xs font-bold tabular-nums [overflow-wrap:anywhere] sm:text-sm ${
          tx.isSavings
            ? 'text-[--brand-500]'
            : isIncome
              ? 'text-[--success-icon]'
              : 'text-[--danger-icon]'
        }`}
      >
        {tx.isSavings ? '🐷' : isIncome ? '+' : '−'}
        {formatCurrency(tx.amount)}
      </span>
    </div>
  )
}

function MonthAttentionCard({ items }) {
  const toneClasses = {
    danger: {
      icon: 'bg-[--danger-bg] text-[--danger-icon] border-[--danger-border]',
      link: 'hover:border-[--danger-border]',
    },
    warning: {
      icon: 'bg-[--warning-bg] text-[--warning-icon] border-[--warning-border]',
      link: 'hover:border-[--warning-border]',
    },
    brand: {
      icon: 'bg-[--brand-50] text-[--brand-700] border-[--brand-200]',
      link: 'hover:border-[--brand-300]',
    },
  }

  return (
    <Card variant="elevated" className="dashboard-attention-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-[--brand-600]" />
            <h2 className="text-sm font-black text-[--text-primary]">O que exige atenção</h2>
          </div>
          <p className="mt-1 text-xs text-[--text-tertiary]">
            Prioridades do período, ordenadas por impacto e urgência.
          </p>
        </div>
        {items.length > 0 && (
          <span className="rounded-full border border-[--border-default] bg-[--bg-subtle] px-2.5 py-1 text-[10px] font-bold text-[--text-secondary]">
            {items.length} {items.length === 1 ? 'ponto' : 'pontos'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[--success-border] bg-[--success-bg] p-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[--success-border] text-[--success-icon]">
            <CheckCircle2 size={17} />
          </div>
          <div>
            <p className="text-sm font-bold text-[--success-text]">Nada crítico por agora</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[--success-text]">
              Pagamentos e orçamentos não apresentam alertas relevantes neste mês.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2">
          {items.map(({ id, title, detail, actionLabel, to, tone, icon: Icon }) => {
            const classes = toneClasses[tone] || toneClasses.brand

            return (
              <Link
                key={id}
                to={to}
                className={`group flex min-w-0 items-start gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3 transition-colors hover:bg-[--bg-hover] ${classes.link}`}
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${classes.icon}`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-[--text-primary]">{title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                    {detail}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[--text-brand]">
                    {actionLabel || 'Ver detalhes'}
                    <ChevronRight
                      size={11}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function PeriodResultHero({
  summary,
  paymentSummary,
  savingsBalance,
  monthLabel,
  loading,
}) {
  const income = Number(summary.income) || 0
  const expenses = Number(summary.expenses) || 0
  const balance = Number(summary.balance) || 0
  const reservedThisMonth = Number(summary.savings) || 0
  const committed = Number(paymentSummary.committedAmount) || 0
  const expenseShare = income > 0 ? (expenses / income) * 100 : null
  const marginShare = income > 0 ? (balance / income) * 100 : null
  const usageWidth = expenseShare === null ? 0 : Math.min(100, Math.max(0, expenseShare))
  const tone = balance < 0 ? 'danger' : balance === 0 ? 'neutral' : 'success'
  const statusLabel =
    balance < 0 ? 'Fluxo em atenção' : balance === 0 ? 'Mês equilibrado' : 'Resultado positivo'

  const narrative =
    expenseShare === null
      ? 'Registre receitas para comparar o peso das despesas no período.'
      : expenseShare > 100
        ? `As despesas estão ${(expenseShare - 100).toLocaleString('pt-BR', {
            maximumFractionDigits: 0,
          })}% acima das receitas registradas.`
        : `As despesas consumiram ${expenseShare.toLocaleString('pt-BR', {
            maximumFractionDigits: 0,
          })}% das receitas registradas.`

  const metrics = [
    {
      label: 'Receitas',
      value: income,
      detail: 'Entradas do mês',
      tone: 'success',
    },
    {
      label: 'Despesas',
      value: expenses,
      detail: 'Saídas do mês',
      tone: 'danger',
    },
    {
      label: 'Reservado',
      value: reservedThisMonth,
      detail: 'Separado neste mês',
      tone: 'brand',
    },
    {
      label: 'Comprometido',
      value: committed,
      detail: 'Obrigações do período',
      tone: 'warning',
    },
  ]

  return (
    <Card variant="elevated" className="dashboard-period-hero h-full">
      <div className="dashboard-period-hero__glow" aria-hidden="true" />
      <div className="dashboard-period-hero__content">
        <div className="dashboard-period-hero__main">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <p className="dashboard-period-hero__eyebrow">Resultado do período</p>
              <InfoTooltip text="Receitas menos despesas registradas pela data da movimentação no mês visualizado. Não representa saldo bancário nem dinheiro livre em conta." />
            </div>
            <span className="dashboard-period-status" data-tone={tone}>
              <span className="dashboard-period-status__dot" aria-hidden="true" />
              {statusLabel}
            </span>
          </div>

          <p className="dashboard-period-hero__month">{monthLabel}</p>

          {loading ? (
            <div className="mt-3 h-12 w-52 animate-pulse rounded-2xl bg-[--bg-hover]" />
          ) : (
            <p
              className="dashboard-period-hero__value"
              data-tone={tone}
              aria-label={`Resultado do período: ${formatCurrency(balance)}`}
            >
              {formatCurrency(balance)}
            </p>
          )}

          <p className="dashboard-period-hero__narrative">{narrative}</p>

          <div className="dashboard-period-flow">
            <div className="dashboard-period-flow__header">
              <span>Uso das receitas</span>
              <strong>
                {expenseShare === null
                  ? 'Sem base'
                  : `${expenseShare.toLocaleString('pt-BR', {
                      maximumFractionDigits: 0,
                    })}%`}
              </strong>
            </div>
            <div className="dashboard-period-flow__track" aria-hidden="true">
              <div
                className="dashboard-period-flow__fill"
                data-tone={expenseShare !== null && expenseShare > 100 ? 'danger' : 'brand'}
                style={{ width: `${usageWidth}%` }}
              />
            </div>
            <div className="dashboard-period-flow__footer">
              <span>
                {marginShare === null
                  ? 'Margem ainda sem base'
                  : `Margem do período ${marginShare.toLocaleString('pt-BR', {
                      maximumFractionDigits: 0,
                    })}%`}
              </span>
              {savingsBalance > 0 && (
                <span>Reserva acumulada {formatCurrency(savingsBalance)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-period-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="dashboard-period-metric" data-tone={metric.tone}>
              <div className="dashboard-period-metric__header">
                <span className="dashboard-period-metric__signal" aria-hidden="true" />
                <span>{metric.label}</span>
              </div>
              <strong>{formatCurrency(metric.value)}</strong>
              <small>{metric.detail}</small>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function DashboardSectionHeading({ eyebrow, title, description }) {
  return (
    <div className="dashboard-section-heading">
      <p className="dashboard-section-heading__eyebrow">{eyebrow}</p>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const {
    transactions,
    loading: transactionsLoading,
    getSummary,
    getCategoryTotals,
    getSpendingForecast,
  } = useTransactions()
  const { budgets } = useBudgets()
  const { categories } = useCategories()
  const { creditCards } = useCreditCards()
  const { goals } = useGoals()
  const { invoiceEvents } = useInvoiceEvents()

  const [viewDate, setViewDate] = useState(new Date())
  const [trendMonths, setTrendMonths] = useState(6)
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const rawMonthLabel = format(viewDate, "MMMM 'de' yyyy", { locale: ptBR })
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  const currentSummary = useMemo(() => getSummary(year, month), [year, month, transactions])
  const categoryTotals = useMemo(() => getCategoryTotals(year, month), [year, month, transactions])
  const previousViewDate = useMemo(() => subMonths(viewDate, 1), [year, month])
  const previousCategoryTotals = useMemo(
    () => getCategoryTotals(previousViewDate.getFullYear(), previousViewDate.getMonth()),
    [previousViewDate, transactions],
  )
  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(categoryTotals, previousCategoryTotals),
    [categoryTotals, previousCategoryTotals],
  )
  const availableMonthCount = useMemo(
    () =>
      new Set(
        transactions
          .map((transaction) => getTransactionActivityDate(transaction)?.slice(0, 7))
          .filter(Boolean),
      ).size,
    [transactions],
  )
  const monthlyData = useMemo(
    () => getMonthlyFinancialData(transactions, trendMonths, viewDate),
    [transactions, trendMonths, viewDate],
  )
  const trendHighlight = useMemo(() => getLargestMonthlyExpenseChange(monthlyData), [monthlyData])
  const selectedTrend =
    monthlyData.find((item) => item.monthKey === selectedMonthKey) || monthlyData.at(-1) || null
  const forecast = useMemo(() => getSpendingForecast(), [transactions])

  const monthBounds = useMemo(() => getCalendarMonthBounds(viewDate), [year, month])
  const paymentSummary = useMemo(
    () =>
      buildPaymentControlOverview({
        transactions,
        creditCards,
        invoiceEvents,
        bounds: monthBounds,
      }),
    [transactions, creditCards, invoiceEvents, monthBounds],
  )

  const categoryReviewCount = useMemo(
    () =>
      buildCategoryReviewQueue(
        transactions.filter((transaction) => {
          const activityDate = getTransactionActivityDate(transaction)
          return activityDate >= monthBounds.start && activityDate <= monthBounds.end
        }),
        categories,
      ).length,
    [transactions, categories, monthBounds],
  )

  const monthTx = useMemo(
    () => getRecentDashboardTransactions(transactions, monthBounds),
    [transactions, monthBounds],
  )

  const savingsBalance = useMemo(
    () => transactions.filter((t) => t.isSavings).reduce((s, t) => s + t.amount, 0),
    [transactions],
  )

  const budgetOverview = useMemo(
    () =>
      buildMonthlyBudgetOverview({
        budgets,
        transactions,
        monthKey: budgetMonthKey(viewDate),
        currentMonthKey: budgetMonthKey(),
      }),
    [budgets, transactions, viewDate],
  )

  const budgetAlerts = useMemo(
    () =>
      budgetOverview.items
        .map((item) => ({
          budget: item,
          cat: categories.find((category) => category.id === item.categoryId),
          spent: item.spent,
          pct: item.percent,
        }))
        .filter((item) => item.pct >= 70)
        .sort((first, second) => second.pct - first.pct)
        .slice(0, 3),
    [budgetOverview, categories],
  )

  const healthReport = useMemo(() => {
    const savingRate =
      currentSummary.income > 0 ? (currentSummary.savings / currentSummary.income) * 100 : 0
    const hasBudgets = budgetOverview.items.length > 0
    const budgetsOk = hasBudgets && budgetOverview.items.every((budget) => budget.percent <= 100)

    const report = buildFinancialHealth({
      balance: currentSummary.balance,
      income: currentSummary.income,
      expenses: currentSummary.expenses,
      savingRate,
      hasBudgets,
      budgetsOk,
      overdueCount: paymentSummary.overdueCount,
      categoryReviewCount,
    })

    if (report.nextAction?.to !== '/budgets') return report

    return {
      ...report,
      nextAction: {
        ...report.nextAction,
        to: `/budgets?month=${budgetOverview.monthKey}`,
      },
    }
  }, [currentSummary, budgetOverview, paymentSummary.overdueCount, categoryReviewCount])

  const monthAttention = useMemo(
    () =>
      buildMonthAttentionSignals({
        paymentSummary,
        budgetAlerts,
        balance: currentSummary.balance,
      }).map((signal) => {
        if (signal.type === 'overdue') {
          return {
            id: 'overdue',
            title: `${signal.count} ${
              signal.count === 1 ? 'pagamento atrasado' : 'pagamentos atrasados'
            }`,
            detail: `${formatCurrency(signal.amount)} aguardando regularização.`,
            to: '/transactions',
            tone: 'danger',
            icon: AlertTriangle,
            actionLabel: 'Regularizar',
          }
        }

        if (signal.type === 'due-soon') {
          return {
            id: 'due-soon',
            title: `${signal.count} ${
              signal.count === 1 ? 'vencimento próximo' : 'vencimentos próximos'
            }`,
            detail: `${formatCurrency(signal.amount)} vencem nos próximos 7 dias.`,
            to: '/transactions',
            tone: 'warning',
            icon: Clock3,
            actionLabel: 'Ver vencimentos',
          }
        }

        if (signal.type === 'budget') {
          return {
            id: `budget-${signal.budgetId}`,
            title: `${signal.categoryName} em atenção`,
            detail: signal.isOver
              ? `${formatCurrency(signal.excess)} acima do limite mensal.`
              : `${signal.pct.toFixed(0)}% do limite mensal já foi utilizado.`,
            to: `/budgets?month=${budgetOverview.monthKey}`,
            tone: signal.pct >= 100 ? 'danger' : 'warning',
            icon: Target,
            actionLabel: 'Revisar orçamento',
          }
        }

        return {
          id: 'negative-balance',
          title: 'Saldo do mês negativo',
          detail: `${formatCurrency(signal.amount)} acima das receitas do período.`,
          to: '/transactions',
          tone: 'danger',
          icon: Wallet,
          actionLabel: 'Revisar gastos',
        }
      }),
    [paymentSummary, budgetAlerts, currentSummary.balance, budgetOverview.monthKey],
  )

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  }
  const isLoading = transactionsLoading
  const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <div
      data-tour="dashboard"
      className="dashboard-premium mx-auto min-w-0 max-w-[1600px] space-y-4 pb-24 sm:space-y-5 lg:pb-6"
    >
      {/* Header — mês com destaque, saudação secundária */}
      <motion.div
        className="dashboard-premium__toolbar flex flex-wrap items-start justify-between gap-3"
        {...fade}
      >
        <div className="min-w-0 flex-1">
          {/* Mês é o destaque principal */}
          <div className="dashboard-month-nav mb-0.5 flex min-w-0 flex-nowrap items-center gap-1">
            <button
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="w-11 h-11 -ml-3 inline-flex items-center justify-center rounded-xl hover:bg-[--bg-hover] text-[--text-tertiary] transition-colors"
              aria-label="Visualizar mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="min-w-0 truncate text-base font-black text-[--text-primary] min-[390px]:text-lg sm:text-2xl">
              {monthLabel}
            </h1>
            <button
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl hover:bg-[--bg-hover] text-[--text-tertiary] transition-colors"
              aria-label="Visualizar próximo mês"
            >
              <ChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setViewDate(new Date())}
                className="dashboard-today min-h-11 px-2 text-xs text-[--text-brand] hover:underline"
              >
                Hoje
              </button>
            )}
          </div>
          {/* Saudação secundária */}
          <p className="dashboard-greeting text-xs text-[--text-tertiary]">
            {greeting()}, {user?.displayName?.split(' ')[0] || 'usuário'}
          </p>
        </div>
        <Link to="/transactions" className="dashboard-quick-add w-auto flex-shrink-0">
          <Button
            variant="primary"
            icon={<Plus />}
            size="sm"
            aria-label="Nova transação"
            className="dashboard-quick-add__button"
          >
            <span className="dashboard-quick-add__label">Nova transação</span>
          </Button>
        </Link>
      </motion.div>

      <div className="dashboard-executive-grid">
        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.05 }}>
          <PeriodResultHero
            summary={currentSummary}
            paymentSummary={paymentSummary}
            savingsBalance={savingsBalance}
            monthLabel={monthLabel}
            loading={isLoading}
          />
        </motion.div>

        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.075 }}>
          <MonthAttentionCard items={monthAttention} />
        </motion.div>
      </div>

      {/* Controle mensal sem alterar os cálculos financeiros existentes */}
      <motion.div {...fade} transition={{ delay: 0.08 }}>
        <PaymentControlCard summary={paymentSummary} loading={isLoading} />
      </motion.div>

      <DashboardSectionHeading
        eyebrow="Leitura inteligente"
        title="Entenda o que está por trás dos números"
        description="Contexto, tendência e saúde financeira para transformar dados em decisões mais claras."
      />

      {/* Resumo executivo: indicadores essenciais e análise do Money */}
      <motion.div
        className="dashboard-bento-grid grid min-w-0 grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="dashboard-compact-kpis grid min-w-0 gap-2 sm:gap-4 md:grid-cols-[1.15fr_0.85fr] xl:col-span-5 xl:grid-cols-1 xl:grid-rows-2">
          <Card variant="elevated" className="dashboard-forecast-card h-full shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <Zap size={14} className="text-[--brand-600]" />
                  <p className="text-xs font-semibold text-[--text-tertiary]">
                    Média de gastos · 3 meses
                  </p>
                  <InfoTooltip text="Média das despesas dos últimos 3 meses. Serve como referência, não como valor definitivo." />
                </div>
                {isLoading ? (
                  <div className="h-7 w-28 animate-pulse rounded bg-[--bg-hover]" />
                ) : (
                  <p className="text-2xl font-black tabular-nums text-[--text-primary]">
                    {formatCurrency(forecast)}
                  </p>
                )}
                <p className="dashboard-forecast-helper mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                  Média dos 3 meses anteriores para apoiar o planejamento.
                </p>
              </div>
              <div className="rounded-xl bg-[--brand-100] p-2 text-[--brand-700]">
                <Zap size={16} />
              </div>
            </div>
          </Card>

          <Card variant="elevated" className="dashboard-health-card h-full shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Heart size={14} className="text-[--danger-icon]" />
                <p className="text-xs font-semibold text-[--text-tertiary]">Indicador financeiro</p>
                <InfoTooltip text="Indicador de 0 a 100 baseado em equilíbrio do período, reserva, aderência a orçamentos, atrasos e relação despesas/receitas. Não representa diagnóstico financeiro completo." />
              </div>
            </div>
            <FinancialHealthScore report={healthReport} />
          </Card>
        </div>

        <div className="dashboard-money-insight col-span-2 min-w-0 xl:col-span-7">
          <MoneyInsightCard referenceDate={viewDate} />
        </div>
      </motion.div>

      <DashboardSectionHeading
        eyebrow="Comportamento financeiro"
        title="Evolução e composição do seu mês"
        description="Compare períodos, identifique mudanças e veja onde o dinheiro está concentrado."
      />

      {/* Análise principal: evolução e composição */}
      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[--text-primary]">
                    Receitas e despesas nos últimos {trendMonths} meses
                  </h3>
                  <InfoTooltip text="Valores agrupados pela data da movimentação. As linhas ligam pontos mensais reais, sem estimar valores entre os meses." />
                </div>
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  Selecione um mês para ver os valores exatos e abrir os lançamentos.
                </p>
              </div>

              <div
                className="inline-flex rounded-xl border border-[--border-default] bg-[--bg-subtle] p-1"
                aria-label="Período da evolução financeira"
              >
                {[6, 12].map((months) => {
                  const disabled = months === 12 && availableMonthCount < 12
                  return (
                    <button
                      key={months}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTrendMonths(months)}
                      aria-pressed={trendMonths === months}
                      className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        trendMonths === months
                          ? 'bg-[--bg-elevated] text-[--text-primary] shadow-sm'
                          : 'text-[--text-tertiary] hover:text-[--text-primary]'
                      }`}
                    >
                      {months} meses
                    </button>
                  )
                })}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tickFormatter={formatAxisCurrency}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="linear"
                  dataKey="income"
                  name="Receitas"
                  stroke="var(--success-icon)"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  fill="transparent"
                />
                <Area
                  type="linear"
                  dataKey="expenses"
                  name="Despesas"
                  stroke="var(--danger-icon)"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>

            <div
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
              role="group"
              aria-label="Selecionar mês da evolução financeira"
            >
              {monthlyData.map((item) => (
                <button
                  key={item.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(item.monthKey)}
                  aria-pressed={selectedTrend?.monthKey === item.monthKey}
                  className={`min-w-0 rounded-xl border p-2 text-left transition-colors ${
                    selectedTrend?.monthKey === item.monthKey
                      ? 'border-[--brand-300] bg-[--brand-50]'
                      : 'border-[--border-subtle] bg-[--bg-subtle] hover:bg-[--bg-hover]'
                  }`}
                >
                  <span className="block text-[10px] font-bold text-[--text-secondary]">
                    {item.month}
                  </span>
                  <span className="mt-1 block truncate text-[10px] tabular-nums text-[--success-text]">
                    R {formatCurrency(item.income)}
                  </span>
                  <span className="block truncate text-[10px] tabular-nums text-[--danger-text]">
                    D {formatCurrency(item.expenses)}
                  </span>
                </button>
              ))}
            </div>

            {selectedTrend && (
              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black text-[--text-primary]">
                    {selectedTrend.fullMonth}
                  </p>
                  <p className="mt-1 text-[10px] text-[--text-tertiary]">
                    Receitas {formatCurrency(selectedTrend.income)} · Despesas{' '}
                    {formatCurrency(selectedTrend.expenses)} · Resultado{' '}
                    {formatCurrency(selectedTrend.balance)}
                  </p>
                </div>
                <Link
                  to={`/transactions?month=${selectedTrend.monthKey}`}
                  className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[--border-default] px-3 text-xs font-bold text-[--text-brand] hover:bg-[--bg-hover]"
                >
                  Ver lançamentos
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {trendHighlight && (
              <p className="mt-3 text-[10px] leading-relaxed text-[--text-tertiary]">
                Maior mudança de despesas: <strong>{trendHighlight.month}</strong>,{' '}
                {formatCurrency(Math.abs(trendHighlight.delta))}{' '}
                {trendHighlight.delta >= 0 ? 'a mais' : 'a menos'} que{' '}
                {trendHighlight.previousMonth}
                {trendHighlight.percent !== null
                  ? ` · ${formatVariation(trendHighlight.percent)}`
                  : ' · sem base percentual anterior'}
                .
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div {...fade} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">Gastos por categoria</h3>
                <InfoTooltip text="Despesas do mês pela data da movimentação, ordenadas do maior para o menor gasto." />
              </div>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Valor, participação no total e comparação com o mês anterior.
              </p>
            </div>

            {categoryReviewCount > 0 && (
              <Link
                to="/transactions?review=categories&scope=all"
                className="mb-3 flex min-h-10 items-center justify-between gap-2 rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 text-[10px] font-bold text-[--warning-text]"
              >
                <span>
                  {categoryReviewCount}{' '}
                  {categoryReviewCount === 1
                    ? 'classificação para revisar'
                    : 'classificações para revisar'}
                </span>
                <ArrowRight size={12} />
              </Link>
            )}

            {categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-xs text-[--text-tertiary]">
                Nenhuma despesa no mês
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.slice(0, 6).map((cat) => {
                  const width = Math.max(4, cat.sharePercent)
                  const isOtherLarge =
                    String(cat.categoryName || '').toLowerCase() === 'outros' &&
                    cat.sharePercent >= 25

                  return (
                    <Link
                      key={cat.categoryId || cat.categoryName}
                      to={`/transactions?category=${encodeURIComponent(cat.categoryId || '')}&month=${budgetOverview.monthKey}`}
                      className="group block rounded-xl border border-transparent p-1.5 transition-colors hover:border-[--border-default] hover:bg-[--bg-hover]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[--text-primary]">
                            {cat.categoryName}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                            {cat.sharePercent.toLocaleString('pt-BR', {
                              maximumFractionDigits: 1,
                            })}
                            % do total · {formatVariation(cat.changePercent)}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs font-black tabular-nums text-[--text-primary]">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[--bg-hover]">
                        <div
                          className="h-full rounded-full bg-[--brand-600] transition-[width]"
                          style={{ width: `${Math.min(100, width)}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      {isOtherLarge && (
                        <p className="mt-1.5 text-[10px] font-semibold text-[--warning-text]">
                          “Outros” concentra uma parcela relevante dos gastos; abra para revisar a
                          composição.
                        </p>
                      )}
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[--text-brand] opacity-80 group-hover:opacity-100">
                        Ver lançamentos
                        <ArrowRight size={11} />
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <DashboardSectionHeading
        eyebrow="Rotina financeira"
        title="Movimentações e objetivos"
        description="Acompanhe o que aconteceu recentemente e mantenha suas metas visíveis."
      />

      {/* Linha inferior */}
      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.25 }}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">
                  Transações de {format(viewDate, 'MMMM', { locale: ptBR })}
                </h3>
                <InfoTooltip text="Últimas 6 transações do mês visualizado." />
              </div>
              <Link
                to="/transactions"
                className="text-xs text-[--text-brand] hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {monthTx.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Nenhuma transação no mês"
                description="Adicione transações para visualizar aqui."
                action={
                  <Link to="/transactions">
                    <Button variant="primary" icon={<Plus />} size="sm">
                      Adicionar
                    </Button>
                  </Link>
                }
              />
            ) : (
              monthTx.map((tx) => <TxItem key={tx.id} tx={tx} categories={categories} />)
            )}
          </Card>
        </motion.div>

        <div className="space-y-4">
          {budgetAlerts.length > 0 && (
            <motion.div {...fade} transition={{ delay: 0.3 }}>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-[--warning-icon]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Alertas de orçamento</h3>
                  <InfoTooltip text="Categorias acima de 70% do limite mensal." />
                </div>
                <div className="space-y-3">
                  {budgetAlerts.map(({ budget, cat, spent }) => (
                    <div key={budget.id} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: (cat?.color || '#ef4444') + '20' }}
                      >
                        {cat?.icon || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[--text-primary] truncate">
                            {cat?.name}
                          </span>
                          <span
                            className={
                              spent > budget.amount
                                ? 'text-[--danger-text] font-bold'
                                : 'text-[--text-secondary]'
                            }
                          >
                            {formatCurrency(spent, { compact: true })} /{' '}
                            {formatCurrency(budget.amount, { compact: true })}
                          </span>
                        </div>
                        <ProgressBar value={spent} max={budget.amount} animated />
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/budgets"
                  className="block mt-3 text-xs text-[--text-brand] hover:underline text-center"
                >
                  Gerenciar orçamentos
                </Link>
              </Card>
            </motion.div>
          )}
          <motion.div {...fade} transition={{ delay: 0.35 }}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[--brand-500]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Metas</h3>
                </div>
                <Link to="/goals" className="text-xs text-[--text-brand] hover:underline">
                  Ver todas
                </Link>
              </div>
              {goals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-[--text-tertiary] mb-2">Nenhuma meta</p>
                  <Link to="/goals">
                    <Button variant="ghost" size="xs" icon={<Plus />}>
                      Criar meta
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 3).map((goal) => {
                    const pct = Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100)
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-[--text-primary] truncate">
                            {goal.emoji} {goal.name}
                          </span>
                          <span className="text-[--text-tertiary] ml-2 flex-shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={goal.currentAmount || 0}
                          max={goal.targetAmount}
                          animated
                        />
                        <div className="flex justify-between text-xs mt-1 text-[--text-tertiary]">
                          <span>{formatCurrency(goal.currentAmount || 0)}</span>
                          <span>{formatCurrency(goal.targetAmount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
