// src/components/Dashboard.jsx
import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
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
  PiggyBank,
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
  buildMonthAttentionSignals,
  getCalendarMonthBounds,
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
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const formatSignedPercent = (value) => {
  if (!Number.isFinite(value)) return 'sem base anterior'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
}

function DashboardSectionHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 px-1">
      <div>
        <h2 className="text-sm font-black text-[--text-primary] sm:text-base">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[--text-tertiary]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
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
            <h2 className="text-sm font-black text-[--text-primary]">Central do mês</h2>
          </div>
          <p className="mt-1 text-xs text-[--text-tertiary]">
            O que merece atenção agora, sem precisar procurar em várias telas.
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
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          {items.map(({ id, title, detail, to, tone, icon: Icon, actionLabel }) => {
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
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const rawMonthLabel = format(viewDate, "MMMM 'de' yyyy", { locale: ptBR })
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  const currentSummary = useMemo(() => getSummary(year, month), [year, month, transactions])
  const categoryTotals = useMemo(() => getCategoryTotals(year, month), [year, month, transactions])
  const previousCategoryTotals = useMemo(() => {
    const previous = subMonths(viewDate, 1)
    return getCategoryTotals(previous.getFullYear(), previous.getMonth())
  }, [viewDate, transactions])

  const historySpanMonths = useMemo(() => {
    const dates = transactions
      .map((transaction) => getTransactionActivityDate(transaction))
      .filter(Boolean)
      .sort()

    if (dates.length === 0) return 0
    const [firstYear, firstMonth] = dates[0].slice(0, 7).split('-').map(Number)
    const span = (year - firstYear) * 12 + (month - (firstMonth - 1)) + 1
    return Math.max(0, span)
  }, [transactions, year, month])

  const canShow12Months = historySpanMonths >= 12
  const activeTrendMonths = trendMonths === 12 && canShow12Months ? 12 : 6
  const monthlyData = useMemo(
    () => getMonthlyFinancialData(transactions, activeTrendMonths, viewDate),
    [transactions, activeTrendMonths, viewDate],
  )
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

  const categoryRows = useMemo(() => {
    const total = categoryTotals.reduce((sum, item) => sum + item.total, 0)
    const previous = new Map(
      previousCategoryTotals.map((item) => [item.categoryId || item.categoryName, item.total]),
    )

    return [...categoryTotals]
      .sort((first, second) => second.total - first.total)
      .map((item) => {
        const key = item.categoryId || item.categoryName
        const previousTotal = previous.get(key) || 0
        return {
          ...item,
          share: total > 0 ? (item.total / total) * 100 : 0,
          change:
            previousTotal > 0 ? ((item.total - previousTotal) / previousTotal) * 100 : null,
        }
      })
  }, [categoryTotals, previousCategoryTotals])

  const trendInsight = useMemo(() => {
    if (monthlyData.length < 2) return null
    const current = monthlyData.at(-1)
    const previous = monthlyData.at(-2)
    const difference = current.expenses - previous.expenses
    const percent = previous.expenses > 0 ? (difference / previous.expenses) * 100 : null

    return {
      difference,
      percent,
      current,
      previous,
    }
  }, [monthlyData])

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

  const monthAttention = useMemo(() => {
    const mapped = buildMonthAttentionSignals({
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
          actionLabel: 'Regularizar pagamentos',
          to: '/transactions',
          tone: 'danger',
          icon: AlertTriangle,
        }
      }

      if (signal.type === 'due-soon') {
        return {
          id: 'due-soon',
          title: `${signal.count} ${
            signal.count === 1 ? 'vencimento próximo' : 'vencimentos próximos'
          }`,
          detail: `${formatCurrency(signal.amount)} vencem nos próximos 7 dias.`,
          actionLabel: 'Revisar vencimentos',
          to: '/transactions',
          tone: 'warning',
          icon: Clock3,
        }
      }

      if (signal.type === 'budget') {
        return {
          id: `budget-${signal.budgetId}`,
          title: `${signal.categoryName} em atenção`,
          detail: signal.isOver
            ? `${formatCurrency(signal.excess)} acima do limite mensal.`
            : `${signal.pct.toFixed(0)}% do limite mensal já foi utilizado.`,
          actionLabel: 'Revisar orçamento',
          to: `/budgets?month=${budgetOverview.monthKey}`,
          tone: signal.pct >= 100 ? 'danger' : 'warning',
          icon: Target,
        }
      }

      return {
        id: 'negative-balance',
        title: 'Resultado do período negativo',
        detail: `${formatCurrency(signal.amount)} acima das receitas registradas no período.`,
        actionLabel: 'Revisar movimentações',
        to: '/transactions',
        tone: 'danger',
        icon: Wallet,
      }
    })

    const review =
      categoryReviewCount > 0
        ? {
            id: 'category-review',
            title: `${categoryReviewCount} ${
              categoryReviewCount === 1 ? 'classificação para revisar' : 'classificações para revisar'
            }`,
            detail:
              'Categorias suspeitas podem distorcer orçamento, composição dos gastos e indicador financeiro.',
            actionLabel: 'Revisar classificações',
            to: '/transactions?review=categories&scope=all',
            tone: 'warning',
            icon: AlertTriangle,
          }
        : null

    const critical = mapped.filter((item) => item.tone === 'danger')
    const remaining = mapped.filter((item) => item.tone !== 'danger')
    return [...critical, ...(review ? [review] : []), ...remaining].slice(0, 3)
  }, [
    paymentSummary,
    budgetAlerts,
    currentSummary.balance,
    budgetOverview.monthKey,
    categoryReviewCount,
  ])

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

      <motion.section
        className="dashboard-decision-hero overflow-hidden rounded-[26px] border border-[--border-default] bg-[--bg-elevated] p-4 sm:p-6"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        aria-labelledby="dashboard-period-result"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                id="dashboard-period-result"
                className="text-xs font-bold uppercase tracking-[0.12em] text-[--text-tertiary]"
              >
                Resultado do período
              </p>
              <InfoTooltip text="Receitas menos despesas registradas no período visualizado. Este valor não representa o saldo da sua conta bancária." />
            </div>
            {isLoading ? (
              <div className="mt-2 h-12 w-44 animate-pulse rounded-xl bg-[--bg-hover]" />
            ) : (
              <p
                className={`mt-2 break-words text-[clamp(2rem,8vw,3.8rem)] font-black leading-none tabular-nums [overflow-wrap:anywhere] ${
                  currentSummary.balance >= 0 ? 'text-[--text-primary]' : 'text-[--danger-text]'
                }`}
              >
                {formatCurrency(currentSummary.balance)}
              </p>
            )}
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[--text-tertiary]">
              {monthLabel}. Resultado calculado com as movimentações registradas neste período.
            </p>
          </div>
          <Link
            to={`/transactions?from=${monthBounds.start}&to=${monthBounds.end}`}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[--border-default] px-3 text-xs font-bold text-[--text-brand] transition-colors hover:bg-[--bg-hover]"
          >
            Ver lançamentos
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[--border-subtle] bg-[--border-subtle] lg:grid-cols-4">
          {[
            ['Receitas', currentSummary.income, 'Entradas do período'],
            ['Despesas', currentSummary.expenses, 'Saídas do período'],
            ['Comprometido', paymentSummary.committedAmount, 'Obrigações com vencimento no período'],
            ['Reserva no período', currentSummary.savings, 'Valores marcados como reserva'],
          ].map(([label, value, detail]) => (
            <div key={label} className="min-w-0 bg-[--bg-surface] p-3.5 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                {label}
              </p>
              <p className="mt-1 break-words text-base font-black tabular-nums text-[--text-primary] [overflow-wrap:anywhere] sm:text-lg">
                {formatCurrency(value)}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">{detail}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <DashboardSectionHeading
        title="O que exige sua atenção"
        description="Prioridades ordenadas por impacto e urgência no período."
      />

      <motion.div {...fade} transition={{ delay: 0.075 }}>
        <MonthAttentionCard items={monthAttention} />
      </motion.div>

      {/* Controle mensal sem alterar os cálculos financeiros existentes */}
      <motion.div {...fade} transition={{ delay: 0.08 }}>
        <PaymentControlCard summary={paymentSummary} loading={isLoading} />
      </motion.div>

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

      {/* Gráficos — altura maior */}
      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.15 }}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[--text-primary]">Evolução financeira</h3>
                <p className="text-xs text-[--text-tertiary]">Últimos 6 meses</p>
              </div>
              <InfoTooltip text="Receitas (verde) vs Despesas (vermelho) mês a mês." />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, { compact: true })}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Receitas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#incG)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Despesas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#expG)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div {...fade} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-[--text-primary]">Por categoria</h3>
              <InfoTooltip text="Distribuição das despesas do mês." />
            </div>
            {categoryTotals.length === 0 ? (
              <p className="text-xs text-[--text-tertiary] text-center py-8">
                Nenhuma despesa no mês
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      dataKey="total"
                      nameKey="categoryName"
                      paddingAngle={2}
                    >
                      {categoryTotals.map((category, i) => (
                        <Cell
                          key={category.categoryId || category.categoryName || i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          aria-label={`${category.categoryName}: ${formatCurrency(category.total)}`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {categoryTotals.slice(0, 4).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-xs text-[--text-secondary] flex-1 truncate">
                        {cat.categoryName}
                      </span>
                      <span className="text-xs font-semibold text-[--text-primary]">
                        {formatCurrency(cat.total, { compact: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

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
