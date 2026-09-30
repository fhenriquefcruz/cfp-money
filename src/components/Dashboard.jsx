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
  Gauge,
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
  const displayLabel = payload[0]?.payload?.fullMonth || label
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-elevated] p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-[--text-secondary]">{displayLabel}</p>
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
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: tx.isSavings ? '#c49d6b15' : (cat?.color || '#c49d6b') + '18' }}
      >
        {tx.isSavings ? (
          <PiggyBank size={17} className="text-[--brand-600]" aria-hidden="true" />
        ) : cat?.icon ? (
          <span aria-hidden="true">{cat.icon}</span>
        ) : (
          <Wallet
            size={17}
            className={isIncome ? 'text-[--success-icon]' : 'text-[--text-secondary]'}
            aria-hidden="true"
          />
        )}
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
        {tx.isSavings ? '' : isIncome ? '+' : '−'}
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
          <h2 className="text-sm font-black text-[--text-primary]">Prioridades do período</h2>
          <p className="mt-1 text-xs text-[--text-tertiary]">
            Causa, impacto e próxima ação concentrados em um só lugar.
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
  const forecast = useMemo(() => {
    const values = [1, 2, 3]
      .map((offset) => {
        const reference = subMonths(viewDate, offset)
        return getSummary(reference.getFullYear(), reference.getMonth()).expenses
      })
      .filter((value) => value > 0)

    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  }, [viewDate, transactions])

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

      <DashboardSectionHeading
        title="Evolução e composição"
        description="Como receitas e despesas evoluíram e quais categorias explicam o período."
      />

      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.12 }}>
          <Card className="h-full">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[--text-primary]">
                  Receitas e despesas · últimos {activeTrendMonths} meses
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
                  {isCurrentMonth
                    ? 'O mês atual considera os lançamentos registrados; meses anteriores aparecem completos.'
                    : 'Cada ponto representa as movimentações registradas no respectivo mês.'}
                </p>
              </div>
              <div
                className="inline-flex rounded-xl border border-[--border-default] bg-[--bg-subtle] p-1"
                aria-label="Período do gráfico"
              >
                {[6, 12].map((period) => {
                  const disabled = period === 12 && !canShow12Months
                  const selected = activeTrendMonths === period
                  return (
                    <button
                      key={period}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTrendMonths(period)}
                      aria-pressed={selected}
                      title={disabled ? 'Disponível quando houver 12 meses de histórico' : undefined}
                      className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
                        selected
                          ? 'bg-[--bg-elevated] text-[--text-primary] shadow-sm'
                          : 'text-[--text-tertiary] hover:text-[--text-primary]'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {period} meses
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-[--text-secondary]">
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 rounded bg-[--success-icon]" aria-hidden="true" />
                Receitas
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-5 rounded bg-[--danger-icon]" aria-hidden="true" />
                Despesas
              </span>
            </div>

            {trendInsight && (
              <div className="mt-3 rounded-xl border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2.5">
                <p className="text-xs font-bold text-[--text-primary]">
                  {trendInsight.difference === 0
                    ? 'Despesas estáveis em relação ao mês anterior.'
                    : `Despesas ${trendInsight.difference > 0 ? 'aumentaram' : 'reduziram'} ${formatCurrency(
                        Math.abs(trendInsight.difference),
                      )}${
                        trendInsight.percent === null
                          ? ''
                          : ` (${formatSignedPercent(trendInsight.percent)})`
                      }.`}
                </p>
                <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                  Comparação com {trendInsight.previous.fullMonth}.
                </p>
              </div>
            )}

            <div
              className="mt-3"
              role="img"
              aria-label={`Gráfico de receitas e despesas dos últimos ${activeTrendMonths} meses`}
            >
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 8, left: 0, bottom: 5 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthKey"
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      format(new Date(`${value}-01T00:00:00`), 'MMM/yy', { locale: ptBR })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
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
                    fill="transparent"
                    fillOpacity={0}
                    dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-surface)' }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="linear"
                    dataKey="expenses"
                    name="Despesas"
                    stroke="var(--danger-icon)"
                    strokeWidth={2}
                    fill="transparent"
                    fillOpacity={0}
                    dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-surface)' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <details className="mt-2 rounded-xl border border-[--border-subtle] bg-[--bg-subtle]">
              <summary className="cursor-pointer px-3 py-2.5 text-xs font-bold text-[--text-secondary]">
                Ver dados do gráfico
              </summary>
              <div className="overflow-x-auto border-t border-[--border-subtle]">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead className="text-[--text-tertiary]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Mês</th>
                      <th className="px-3 py-2 text-right font-semibold">Receitas</th>
                      <th className="px-3 py-2 text-right font-semibold">Despesas</th>
                      <th className="px-3 py-2 text-right font-semibold">Resultado</th>
                      <th className="px-3 py-2 text-right font-semibold">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((point) => (
                      <tr key={point.monthKey} className="border-t border-[--border-subtle]">
                        <td className="px-3 py-2 font-semibold text-[--text-primary]">
                          {point.fullMonth}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-[--text-secondary]">
                          {formatCurrency(point.income)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-[--text-secondary]">
                          {formatCurrency(point.expenses)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-[--text-primary]">
                          {formatCurrency(point.balance)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            to={`/transactions?from=${point.start}&to=${point.end}`}
                            className="font-bold text-[--text-brand] hover:underline"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
        </motion.div>

        <motion.div {...fade} transition={{ delay: 0.16 }}>
          <Card className="h-full">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-[--text-primary]">Gastos por categoria</h3>
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  Participação nas despesas de {format(viewDate, 'MMMM', { locale: ptBR })}.
                </p>
              </div>
              <Link
                to={`/transactions?from=${monthBounds.start}&to=${monthBounds.end}`}
                className="text-xs font-bold text-[--text-brand] hover:underline"
              >
                Ver lançamentos
              </Link>
            </div>

            {categoryReviewCount > 0 && (
              <Link
                to="/transactions?review=categories&scope=all"
                className="mt-3 block rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 py-2.5 text-xs text-[--warning-text]"
              >
                <strong>{categoryReviewCount}</strong>{' '}
                {categoryReviewCount === 1
                  ? 'classificação precisa de revisão'
                  : 'classificações precisam de revisão'}
                . Os percentuais abaixo podem mudar.
              </Link>
            )}

            {categoryRows.length === 0 ? (
              <p className="py-10 text-center text-xs text-[--text-tertiary]">
                Nenhuma despesa no período
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {categoryRows.slice(0, 6).map((item) => (
                  <Link
                    key={item.categoryId || item.categoryName}
                    to={`/transactions?category=${encodeURIComponent(
                      item.categoryId || '',
                    )}&from=${monthBounds.start}&to=${monthBounds.end}`}
                    className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[--focus-ring]"
                    aria-label={`${item.categoryName}: ${formatCurrency(item.total)}, ${item.share.toFixed(
                      0,
                    )}% das despesas`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[--text-primary]">
                          {item.categoryName || 'Sem categoria'}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                          {item.change === null
                            ? 'Sem base no mês anterior'
                            : `${formatSignedPercent(item.change)} vs mês anterior`}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-black tabular-nums text-[--text-primary]">
                          {formatCurrency(item.total)}
                        </p>
                        <p className="text-[10px] font-semibold tabular-nums text-[--text-tertiary]">
                          {item.share.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-[--bg-hover]"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.max(2, Math.min(100, item.share))}%`,
                          background: item.categoryColor || 'var(--brand-500)',
                        }}
                      />
                    </div>
                  </Link>
                ))}
                {categoryRows.length > 6 && (
                  <Link
                    to="/reports"
                    className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[--text-brand] hover:underline"
                  >
                    Ver todas as categorias
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <DashboardSectionHeading
        title="Movimentações e metas"
        description="O que aconteceu recentemente e quais objetivos ainda exigem aporte."
      />

      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.2 }}>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[--text-primary]">
                  Transações de {format(viewDate, 'MMMM', { locale: ptBR })}
                </h3>
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  Agrupadas pela data da movimentação.
                </p>
              </div>
              <Link
                to={`/transactions?from=${monthBounds.start}&to=${monthBounds.end}`}
                className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[--text-brand] hover:underline"
              >
                Ver todas
                <ArrowRight size={12} />
              </Link>
            </div>
            {monthTx.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Nenhuma transação no período"
                description="Adicione transações para visualizar a composição deste mês."
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

        <motion.div {...fade} transition={{ delay: 0.24 }}>
          <Card className="h-full">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[--brand-500]" />
                  <h3 className="text-sm font-black text-[--text-primary]">Metas</h3>
                </div>
                <p className="mt-1 text-xs text-[--text-tertiary]">
                  Progresso real dos valores reservados.
                </p>
              </div>
              <Link to="/goals" className="text-xs font-bold text-[--text-brand] hover:underline">
                Ver todas
              </Link>
            </div>
            {goals.length === 0 ? (
              <div className="py-6 text-center">
                <p className="mb-2 text-xs text-[--text-tertiary]">Nenhuma meta cadastrada</p>
                <Link to="/goals">
                  <Button variant="ghost" size="xs" icon={<Plus />}>
                    Criar meta
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 3).map((goal) => {
                  const currentAmount = goal.currentAmount || 0
                  const remaining = Math.max(0, goal.targetAmount - currentAmount)
                  const pct = Math.min(100, (currentAmount / goal.targetAmount) * 100)
                  return (
                    <div key={goal.id} className="rounded-xl border border-[--border-subtle] p-3">
                      <div className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-xs font-bold text-[--text-primary]">
                          {goal.name}
                        </span>
                        <span className="flex-shrink-0 text-xs font-black tabular-nums text-[--text-secondary]">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <ProgressBar value={currentAmount} max={goal.targetAmount} animated />
                      <div className="mt-2 flex flex-wrap justify-between gap-1 text-[10px] text-[--text-tertiary]">
                        <span>Reservado {formatCurrency(currentAmount)}</span>
                        <span>Falta {formatCurrency(remaining)}</span>
                      </div>
                      {goal.deadline && (
                        <p className="mt-1 text-[10px] text-[--text-tertiary]">
                          Prazo: {format(new Date(`${goal.deadline}T00:00:00`), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <DashboardSectionHeading
        title="Análises e planejamento"
        description="Referências e diagnósticos para aprofundar a leitura; não substituem os números do período."
      />

      <motion.div
        className="dashboard-bento-grid grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <div className="dashboard-compact-kpis grid min-w-0 gap-4 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
          <Card variant="elevated" className="dashboard-forecast-card h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <Clock3 size={14} className="text-[--brand-600]" />
                  <p className="text-xs font-semibold text-[--text-tertiary]">
                    Referência de gastos · 3 meses anteriores
                  </p>
                  <InfoTooltip text="Média das despesas dos três meses anteriores ao período visualizado. É uma referência de planejamento, não uma previsão garantida." />
                </div>
                {isLoading ? (
                  <div className="h-7 w-28 animate-pulse rounded bg-[--bg-hover]" />
                ) : (
                  <p className="text-2xl font-black tabular-nums text-[--text-primary]">
                    {formatCurrency(forecast)}
                  </p>
                )}
                <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                  Média anterior a {monthLabel}; não altera o resultado do período.
                </p>
              </div>

            </div>
          </Card>

          <Card variant="elevated" className="dashboard-health-card h-full">
            <div className="mb-2 flex items-center gap-1.5">
              <Gauge size={14} className="text-[--brand-600]" />
              <p className="text-xs font-semibold text-[--text-tertiary]">Indicador financeiro</p>
              <InfoTooltip text="Indicador de 0 a 100 baseado em equilíbrio do período, reserva, aderência a orçamentos, atrasos e relação despesas/receitas. Não representa diagnóstico financeiro completo." />
            </div>
            <FinancialHealthScore report={healthReport} />
          </Card>
        </div>

        <div className="dashboard-money-insight min-w-0 xl:col-span-7">
          <MoneyInsightCard referenceDate={viewDate} />
        </div>
      </motion.div>
    </div>
  )
}
