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
  ChevronLeft,
  ChevronRight,
  Clock3,
  CheckCircle2,
  PiggyBank,
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
  buildPeriodResultInsight,
  getCalendarMonthBounds,
  getRecentDashboardTransactions,
} from '../domain/dashboard'
import { getTransactionActivityDate, getTransactionDateContext } from '../domain/transactionDates'
import { buildCategoryReviewQueue } from '../domain/categoryReview'
import { buildPaymentControlOverview } from '../domain/paymentControl'
import { buildFinancialHealth } from '../domain/financialHealth'
import { budgetMonthKey, buildMonthlyBudgetOverview } from '../domain/budgetPeriods'
import {
  buildSavingsOverview,
  getGoalEffectiveCurrent,
  getSavingsDestinationLabel,
} from '../domain/savings'
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
          {tx.isSavings ? ` · ${getSavingsDestinationLabel(tx)}` : ''}
        </p>
      </div>
      <span
        className={`max-w-[46%] flex-shrink-0 break-words text-right text-xs font-bold tabular-nums [overflow-wrap:anywhere] sm:text-sm ${
          tx.isSavings
            ? tx.savingsMovement === 'withdrawal'
              ? 'text-[--danger-text]'
              : 'text-[--brand-500]'
            : isIncome
              ? 'text-[--success-icon]'
              : 'text-[--danger-icon]'
        }`}
      >
        {tx.isSavings ? (tx.savingsMovement === 'withdrawal' ? '−' : '+') : isIncome ? '+' : '−'}
        {formatCurrency(tx.amount)}
      </span>
    </div>
  )
}

function MonthAttentionCard({ items }) {
  return (
    <Card variant="elevated" className="dashboard-attention-card">
      <div>
        <div>
          <div className="dashboard-attention-card__title">
            <Zap size={15} />
            <h2>Prioridades do mês</h2>
          </div>
          <p>O que merece sua atenção agora.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="dashboard-attention-card__empty">
          <div className="dashboard-attention-card__empty-icon">
            <CheckCircle2 size={17} />
          </div>
          <div>
            <p>Tudo sob controle</p>
            <span>Sem alertas relevantes em pagamentos ou orçamentos neste mês.</span>
          </div>
        </div>
      ) : (
        <div className="dashboard-attention-card__list">
          {items.map(({ id, title, detail, actionLabel, to, icon: Icon }) => (
            <Link key={id} to={to} className="dashboard-attention-card__item">
              <div className="dashboard-attention-card__item-icon">
                <Icon size={16} />
              </div>
              <div className="dashboard-attention-card__item-copy">
                <p>{title}</p>
                <span>{detail}</span>
                <strong>
                  {actionLabel || 'Ver detalhes'}
                  <ChevronRight size={11} />
                </strong>
              </div>
            </Link>
          ))}
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
  const [trendView, setTrendView] = useState('flow')
  const [selectedMonthKey, setSelectedMonthKey] = useState('')
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const rawMonthLabel = format(viewDate, "MMMM 'de' yyyy", { locale: ptBR })
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)
  const rawCompactMonthLabel = format(viewDate, 'MMMM yyyy', { locale: ptBR })
  const compactMonthLabel =
    rawCompactMonthLabel.charAt(0).toUpperCase() + rawCompactMonthLabel.slice(1)
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  const currentSummary = useMemo(() => getSummary(year, month), [year, month, transactions])
  const categoryTotals = useMemo(() => getCategoryTotals(year, month), [year, month, transactions])
  const previousViewDate = useMemo(() => subMonths(viewDate, 1), [year, month])
  const previousSummary = useMemo(
    () => getSummary(previousViewDate.getFullYear(), previousViewDate.getMonth()),
    [previousViewDate, transactions],
  )
  const previousMonthLabel = format(previousViewDate, 'MMMM', { locale: ptBR })
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

  const savingsOverview = useMemo(
    () => buildSavingsOverview(transactions, monthBounds),
    [transactions, monthBounds],
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
  const periodInsight = useMemo(
    () => buildPeriodResultInsight(currentSummary, previousSummary),
    [currentSummary, previousSummary],
  )
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
              <span className="sm:hidden">{compactMonthLabel}</span>
              <span className="hidden sm:inline">{monthLabel}</span>
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
          <Card variant="hero" className="dashboard-period-summary dashboard-period-hero h-full">
            <div className="dashboard-period-hero__main">
              <div className="dashboard-period-hero__amount">
                <div className="dashboard-period-hero__eyebrow">
                  <span>Resultado do período</span>
                  <InfoTooltip text="Receitas menos despesas registradas pela data da movimentação no mês visualizado. Não representa saldo bancário nem dinheiro livre em conta." />
                </div>
                <p className="dashboard-period-hero__value">
                  {isLoading ? '—' : formatCurrency(currentSummary.balance)}
                </p>
                <div className="dashboard-period-hero__context">
                  <span className="dashboard-period-hero__status" data-tone={periodInsight.tone}>
                    {periodInsight.statusLabel}
                  </span>
                  {periodInsight.comparisonDelta !== null && (
                    <span
                      className="dashboard-period-hero__comparison"
                      data-tone={periodInsight.comparisonTone}
                    >
                      {periodInsight.comparisonDelta > 0
                        ? `${formatCurrency(periodInsight.comparisonDelta)} melhor que ${previousMonthLabel}`
                        : periodInsight.comparisonDelta < 0
                          ? `${formatCurrency(Math.abs(periodInsight.comparisonDelta))} pior que ${previousMonthLabel}`
                          : `Mesmo resultado de ${previousMonthLabel}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="dashboard-period-hero__signal">
                <div className="dashboard-period-hero__signal-head">
                  <span>Uso das receitas</span>
                  <strong>
                    {periodInsight.expenseIncomeRatio === null
                      ? 'Sem base'
                      : `${periodInsight.expenseIncomeRatio}%`}
                  </strong>
                </div>
                <div className="dashboard-period-hero__track" aria-hidden="true">
                  <span
                    data-tone={
                      periodInsight.expenseIncomeRatio !== null &&
                      periodInsight.expenseIncomeRatio > 100
                        ? 'negative'
                        : 'positive'
                    }
                    style={{ width: `${Math.min(100, periodInsight.expenseIncomeRatio || 0)}%` }}
                  />
                </div>
                <p className="dashboard-period-hero__story">{periodInsight.story}</p>
              </div>
            </div>

            <div className="dashboard-period-hero__metrics">
              {[
                ['Receitas', currentSummary.income, 'income'],
                ['Despesas', currentSummary.expenses, 'expense'],
                ['Comprometido', paymentSummary.committedAmount || 0, 'commitment'],
                ['Reservado total', savingsOverview.totalBalance, 'reserve'],
              ].map(([label, value, kind]) => (
                <div key={label} className="dashboard-period-metric" data-kind={kind}>
                  <p className="dashboard-period-metric__label">
                    <span aria-hidden="true" />
                    {label}
                  </p>
                  <p className="dashboard-period-metric__value">{formatCurrency(value)}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.075 }}>
          <MonthAttentionCard items={monthAttention} />
        </motion.div>
      </div>

      {/* Faixa operacional: compromissos do mês + patrimônio reservado */}
      <div className="dashboard-executive-grid">
        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.08 }}>
          <PaymentControlCard summary={paymentSummary} loading={isLoading} />
        </motion.div>

        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.09 }}>
          <Card variant="elevated" className="dashboard-savings-card h-full">
            <div className="flex h-full flex-col gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[--brand-100] p-2 text-[--brand-700]">
                    <PiggyBank size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-black text-[--text-primary]">
                        Poupança e Reservas
                      </h2>
                      <InfoTooltip text="Total reservado considera depósitos menos retiradas. O valor poupado no mês usa apenas o período visualizado." />
                    </div>
                    <p className="text-[10px] text-[--text-tertiary]">
                      Quanto você tem guardado e onde esse dinheiro está.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-3xl font-black tabular-nums text-[--text-primary]">
                  {formatCurrency(savingsOverview.totalBalance)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[--text-tertiary]">
                  <span>
                    Poupado no mês{' '}
                    <strong
                      className={
                        savingsOverview.periodNet >= 0
                          ? 'text-[--success-text]'
                          : 'text-[--danger-text]'
                      }
                    >
                      {formatCurrency(savingsOverview.periodNet)}
                    </strong>
                  </span>
                  <span>Aportes {formatCurrency(savingsOverview.periodDeposits)}</span>
                  <span>Retiradas {formatCurrency(savingsOverview.periodWithdrawals)}</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                    Onde está
                  </p>
                  <Link
                    to="/savings"
                    className="text-xs font-bold text-[--text-brand] hover:underline"
                  >
                    Abrir reservas
                  </Link>
                </div>
                {savingsOverview.destinations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[--border-default] p-3 text-xs text-[--text-tertiary]">
                    Registre uma Poupança e informe o destino para começar a acompanhar suas
                    reservas.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savingsOverview.destinations.slice(0, 3).map((destination) => (
                      <div
                        key={destination.label}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[--border-subtle] bg-[--bg-subtle] px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[--text-primary]">
                            {destination.destination}
                          </p>
                          <p className="truncate text-[10px] text-[--text-tertiary]">
                            {destination.institution || 'Instituição não informada'}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs font-black tabular-nums text-[--text-primary]">
                          {formatCurrency(destination.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Inteligência executiva: ritmo, saúde e Money em uma faixa coerente */}
      <motion.div
        className="dashboard-bento-grid grid min-w-0 grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          variant="elevated"
          className="dashboard-forecast-card col-span-1 h-full shadow-sm xl:col-span-3"
        >
          <div className="flex h-full items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5">
                <Zap size={14} className="text-[--brand-600]" />
                <p className="text-xs font-semibold text-[--text-tertiary]">Ritmo de gastos</p>
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
                Média dos últimos 3 meses para orientar o planejamento.
              </p>
            </div>
            <div className="rounded-xl bg-[--brand-100] p-2 text-[--brand-700]">
              <Zap size={16} />
            </div>
          </div>
        </Card>

        <Card
          variant="elevated"
          className="dashboard-health-card col-span-1 h-full shadow-sm xl:col-span-3"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[--brand-600]" />
              <p className="text-xs font-semibold text-[--text-tertiary]">Saúde financeira</p>
              <InfoTooltip text="Indicador de 0 a 100 baseado em equilíbrio do período, reserva, aderência a orçamentos, atrasos e relação despesas/receitas. Não representa diagnóstico financeiro completo." />
            </div>
          </div>
          <FinancialHealthScore report={healthReport} />
        </Card>

        <div className="dashboard-money-insight col-span-2 min-w-0 xl:col-span-6">
          <MoneyInsightCard referenceDate={viewDate} />
        </div>
      </motion.div>

      {/* Análise principal: evolução e composição */}
      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.15 }}>
          <Card className="dashboard-finance-chart h-full overflow-hidden">
            <div className="dashboard-finance-chart__header mb-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[--text-primary]">Evolução financeira</h3>
                    <InfoTooltip text="Valores agrupados pela data da movimentação. Use o seletor de meses para detalhar um período." />
                  </div>
                  <p className="mt-1 text-xs text-[--text-tertiary]">
                    Compare entradas e saídas ou isole o resultado líquido do período.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex rounded-xl border border-[--border-default] bg-[--bg-subtle] p-1"
                    aria-label="Visualização da evolução financeira"
                  >
                    {[
                      ['flow', 'Fluxo'],
                      ['result', 'Resultado'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTrendView(value)}
                        aria-pressed={trendView === value}
                        className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
                          trendView === value
                            ? 'bg-[--bg-elevated] text-[--text-primary] shadow-sm'
                            : 'text-[--text-tertiary] hover:text-[--text-primary]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
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
                          {months}m
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="-mx-1 rounded-2xl">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData} margin={{ top: 12, right: 10, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="dashboardIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--success-icon)"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--success-icon)"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                    <linearGradient id="dashboardExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--danger-icon)"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--danger-icon)"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                    <linearGradient id="dashboardResultGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--brand-500)"
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--brand-500)"
                        stopOpacity={0.015}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 7"
                    stroke="var(--border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
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
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: 'var(--border-default)' }}
                  />
                  {trendView === 'flow' ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="Receitas"
                        stroke="var(--success-icon)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        fill="url(#dashboardIncomeGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Despesas"
                        stroke="var(--danger-icon)"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        fill="url(#dashboardExpenseGradient)"
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="balance"
                      name="Resultado"
                      stroke="var(--brand-500)"
                      strokeWidth={2.75}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                      fill="url(#dashboardResultGradient)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              className="dashboard-finance-chart__month-selector scrollbar-none mt-3 flex gap-1.5 overflow-x-auto pb-1"
              role="group"
              aria-label="Selecionar mês da evolução financeira"
            >
              {monthlyData.map((item) => (
                <button
                  key={item.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(item.monthKey)}
                  aria-pressed={selectedTrend?.monthKey === item.monthKey}
                  className={`min-h-9 flex-shrink-0 rounded-full border px-3 text-[10px] font-bold transition-colors ${
                    selectedTrend?.monthKey === item.monthKey
                      ? 'border-[--brand-300] bg-[--brand-50] text-[--text-primary]'
                      : 'border-[--border-subtle] bg-[--bg-subtle] text-[--text-tertiary] hover:bg-[--bg-hover]'
                  }`}
                >
                  {item.month}
                </button>
              ))}
            </div>

            {selectedTrend && (
              <div className="dashboard-finance-chart__selected mt-3 grid gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-black text-[--text-primary]">
                    {selectedTrend.fullMonth}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[--text-tertiary]">
                    <span>Receitas {formatCurrency(selectedTrend.income)}</span>
                    <span>Despesas {formatCurrency(selectedTrend.expenses)}</span>
                    <strong
                      className={
                        selectedTrend.balance >= 0
                          ? 'text-[--success-text]'
                          : 'text-[--danger-text]'
                      }
                    >
                      Resultado {formatCurrency(selectedTrend.balance)}
                    </strong>
                  </div>
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

          </Card>
        </motion.div>

        <motion.div {...fade} transition={{ delay: 0.2 }}>
          <Card className="dashboard-spending-composition h-full overflow-hidden">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">Composição dos gastos</h3>
                <InfoTooltip text="Despesas do mês pela data da movimentação, ordenadas do maior para o menor gasto." />
              </div>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Ranking · Top 3 concentram{' '}
                {categoryBreakdown
                  .slice(0, 3)
                  .reduce((total, category) => total + category.sharePercent, 0)
                  .toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                % das despesas.
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
              <>
                <div className="space-y-2.5">
                  {categoryBreakdown.slice(0, 6).map((cat, index) => {
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
                        <div className="flex items-start gap-2.5">
                          <span className="flex-shrink-0 text-[10px] font-black tabular-nums text-[--text-tertiary]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[--text-primary]">
                                  {cat.categoryName}
                                </p>
                                <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                                  {cat.sharePercent.toLocaleString('pt-BR', {
                                    maximumFractionDigits: 1,
                                  })}
                                  % · {formatVariation(cat.changePercent)}
                                </p>
                              </div>
                              <span className="flex-shrink-0 text-xs font-black tabular-nums text-[--text-primary]">
                                {formatCurrency(cat.total)}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[--bg-hover]">
                              <div
                                className="h-full rounded-full bg-[--brand-500] transition-[width]"
                                style={{ width: `${Math.min(100, width)}%` }}
                                aria-hidden="true"
                              />
                            </div>
                            {isOtherLarge && (
                              <p className="mt-1.5 text-[10px] font-semibold text-[--warning-text]">
                                “Outros” concentra uma parcela relevante; revise a classificação.
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
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
                    const effectiveCurrent = getGoalEffectiveCurrent(goal, transactions)
                    const pct = Math.min(100, (effectiveCurrent / goal.targetAmount) * 100)
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
                        <ProgressBar value={effectiveCurrent} max={goal.targetAmount} animated />
                        <div className="flex justify-between text-xs mt-1 text-[--text-tertiary]">
                          <span>{formatCurrency(effectiveCurrent)}</span>
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
