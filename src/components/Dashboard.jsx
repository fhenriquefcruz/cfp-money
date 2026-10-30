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
  CheckCircle2,
  PiggyBank,
  Paperclip,
  Search,
  Sparkles,
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
import BentoCategoryIcon from './dashboard/BentoCategoryIcon'
import { filterDashboardFeed, groupDashboardFeedByDate, isDashboardThirdParty, getDashboardTransactionTags } from '../domain/dashboardBento'
import { categoryCompositionFromTransactions } from '../domain/categoryComposition'
import { summarizeTransactions, transactionsForMonth } from '../domain/finance'
import './dashboard-bento.css'
import InfoTooltip from './InfoTooltip'
import MoneyInsightCard from './MoneyInsightCard'
import CategoryCompositionVisual from './CategoryCompositionVisual'
import { categoryAccentStyle, decorateCategoryBreakdown } from '../domain/categoryComposition'
import PaymentControlCard from './PaymentControlCard'
import FinancialHealthScore from './FinancialHealthScore'
import { formatCurrency, formatRelativeDate } from '../utils'
import { getMonthlyFinancialData } from '../domain/monthlyFinance'
import {
  buildCategoryBreakdown,
  buildDashboardActionInsights,
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
  const tags = getDashboardTransactionTags(tx)
  const dateContext = getTransactionDateContext(tx)
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0">
      <BentoCategoryIcon category={cat} name={tx.isSavings ? 'Reservas' : cat?.name || (isIncome ? 'Receita' : 'Despesa')} />
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-semibold text-[--text-primary]">
            {tx.description || (tx.isSavings ? 'Poupança' : cat?.name) || 'Sem descrição'}
          </p>
          {tags.map((tag) => (
            <span key={tag} className="dashboard-feed-tag shrink-0 rounded-full px-2 py-0.5 text-[10px]">
              {tag}
            </span>
          ))}
          {tx.attachments?.length > 0 && (
            <span
              title={`${tx.attachments.length} comprovante(s) anexado(s)`}
              aria-label={`${tx.attachments.length} comprovante(s) anexado(s)`}
              className="shrink-0 text-[--text-brand]"
            >
              <Paperclip size={13} aria-hidden="true" />
            </span>
          )}
        </div>
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
            <h2>Leituras do mês</h2>
          </div>
          <p>O que mudou e onde vale agir.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="dashboard-attention-card__empty">
          <div className="dashboard-attention-card__empty-icon">
            <CheckCircle2 size={17} />
          </div>
          <div>
            <p>Sem pressão relevante</p>
            <span>O período não apresenta desvios que exijam ação imediata.</span>
          </div>
        </div>
      ) : (
        <div className="dashboard-attention-card__list">
          {items.map(({ title, detail, to }) => (
            <Link key={title} to={to} className="dashboard-attention-card__item">
              <div className="dashboard-attention-card__item-icon">
                <Zap size={16} />
              </div>
              <div className="dashboard-attention-card__item-copy">
                <p>{title}</p>
                <span>{detail}</span>
                <strong>
                  Abrir
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
    editTransaction,
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
  const [onlyOwn, setOnlyOwn] = useState(false)
  const [feedFilter, setFeedFilter] = useState('all')
  const [activeCategory, setActiveCategory] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const visibleTransactions = useMemo(
    () => onlyOwn ? transactions.filter((tx) => !isDashboardThirdParty(tx)) : transactions,
    [transactions, onlyOwn],
  )
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const rawMonthLabel = format(viewDate, "MMMM 'de' yyyy", { locale: ptBR })
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)
  const rawCompactMonthLabel = format(viewDate, 'MMMM yyyy', { locale: ptBR })
  const compactMonthLabel =
    rawCompactMonthLabel.charAt(0).toUpperCase() + rawCompactMonthLabel.slice(1)
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  const currentSummary = useMemo(
    () => onlyOwn
      ? summarizeTransactions(transactionsForMonth(visibleTransactions, year, month))
      : getSummary(year, month),
    [year, month, visibleTransactions, onlyOwn, getSummary],
  )
  const categoryTotals = useMemo(
    () => onlyOwn
      ? categoryCompositionFromTransactions(transactionsForMonth(visibleTransactions, year, month), categories)
      : getCategoryTotals(year, month),
    [year, month, visibleTransactions, categories, onlyOwn, getCategoryTotals],
  )
  const previousViewDate = useMemo(() => subMonths(viewDate, 1), [year, month])
  const previousSummary = useMemo(
    () => onlyOwn
      ? summarizeTransactions(transactionsForMonth(visibleTransactions, previousViewDate.getFullYear(), previousViewDate.getMonth()))
      : getSummary(previousViewDate.getFullYear(), previousViewDate.getMonth()),
    [previousViewDate, visibleTransactions, onlyOwn, getSummary],
  )
  const previousMonthLabel = format(previousViewDate, 'MMMM', { locale: ptBR })
  const previousCategoryTotals = useMemo(
    () => onlyOwn
      ? categoryCompositionFromTransactions(transactionsForMonth(visibleTransactions, previousViewDate.getFullYear(), previousViewDate.getMonth()), categories)
      : getCategoryTotals(previousViewDate.getFullYear(), previousViewDate.getMonth()),
    [previousViewDate, visibleTransactions, onlyOwn, getCategoryTotals, categories],
  )
  const categoryBreakdown = useMemo(
    () =>
      decorateCategoryBreakdown(
        buildCategoryBreakdown(categoryTotals, previousCategoryTotals),
        categories,
      ),
    [categoryTotals, previousCategoryTotals, categories],
  )
  const availableMonthCount = useMemo(
    () =>
      new Set(
        visibleTransactions
          .map((transaction) => getTransactionActivityDate(transaction)?.slice(0, 7))
          .filter(Boolean),
      ).size,
    [visibleTransactions],
  )
  const monthlyData = useMemo(
    () => getMonthlyFinancialData(visibleTransactions, trendMonths, viewDate),
    [visibleTransactions, trendMonths, viewDate],
  )
  const selectedTrend =
    monthlyData.find((item) => item.monthKey === selectedMonthKey) || monthlyData.at(-1) || null
  const forecast = useMemo(() => {
    if (!onlyOwn) return getSpendingForecast()
    const history = getMonthlyFinancialData(visibleTransactions, 3, subMonths(viewDate, 1))
    return history.reduce((sum, item) => sum + item.expenses, 0) / history.length
  }, [getSpendingForecast, visibleTransactions, onlyOwn, viewDate])

  const monthBounds = useMemo(() => getCalendarMonthBounds(viewDate), [year, month])
  const paymentSummary = useMemo(
    () =>
      buildPaymentControlOverview({
        transactions: visibleTransactions,
        creditCards,
        invoiceEvents,
        bounds: monthBounds,
      }),
    [visibleTransactions, creditCards, invoiceEvents, monthBounds],
  )

  const categoryReviewQueue = useMemo(
    () =>
      buildCategoryReviewQueue(
        visibleTransactions.filter((transaction) => {
          const activityDate = getTransactionActivityDate(transaction)
          return activityDate >= monthBounds.start && activityDate <= monthBounds.end
        }),
        categories,
      ).length,
    [visibleTransactions, categories, monthBounds],
  )
  const categoryReviewCount = categoryReviewQueue.length
  const monthTx = useMemo(
    () => getRecentDashboardTransactions(visibleTransactions, monthBounds, 200),
    [visibleTransactions, monthBounds],
  )

  const savingsOverview = useMemo(
    () => buildSavingsOverview(visibleTransactions, monthBounds),
    [visibleTransactions, monthBounds],
  )

  const budgetOverview = useMemo(
    () =>
      buildMonthlyBudgetOverview({
        budgets,
        transactions: visibleTransactions,
        monthKey: budgetMonthKey(viewDate),
        currentMonthKey: budgetMonthKey(),
      }),
    [budgets, visibleTransactions, viewDate],
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

  const actionInsights = useMemo(
    () =>
      buildDashboardActionInsights({
        currentSummary,
        previousSummary,
        categoryBreakdown,
        paymentSummary,
        savingsOverview,
        budgetMonthKey: budgetOverview.monthKey,
      }).map((item) => ({
        ...item,
        detail: item.amount ? `${formatCurrency(item.amount)} · ${item.detail}` : item.detail,
      })),
    [
      currentSummary,
      previousSummary,
      categoryBreakdown,
      paymentSummary,
      savingsOverview,
      budgetOverview.monthKey,
    ],
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
  const filteredFeed = useMemo(
    () => filterDashboardFeed(monthTx, feedFilter, onlyOwn),
    [monthTx, feedFilter, onlyOwn],
  )
  const groupedFeed = useMemo(() => groupDashboardFeedByDate(filteredFeed), [filteredFeed])
  const reviewItem = categoryReviewQueue[0] || null
  const saveReview = async (mode) => {
    if (!reviewItem || reviewSaving) return
    const original = transactions.find((tx) => tx.id === reviewItem.transactionId)
    if (!original) return
    if (mode === 'correct' && !reviewItem.suggestedCategoryId) return
    setReviewSaving(true)
    try {
      await editTransaction(reviewItem.transactionId, {
        ...original,
        ...(mode === 'correct'
          ? { categoryId: reviewItem.suggestedCategoryId, categoryReviewApprovedFamily: null, categoryReviewApprovedCategoryId: null }
          : { categoryReviewApprovedFamily: reviewItem.suggestedFamily, categoryReviewApprovedCategoryId: original.categoryId }),
      })
    } finally {
      setReviewSaving(false)
    }
  }
  const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <div
      data-tour="dashboard"
      className="dashboard-premium dashboard-v58 mx-auto min-w-0 max-w-[1680px] space-y-5 pb-24 sm:space-y-6 lg:pb-6"
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
          <MonthAttentionCard items={actionInsights} />
        </motion.div>
      </div>

      {/* Faixa operacional: compromissos do mês + patrimônio reservado */}
      <div className="dashboard-executive-grid">
        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.08 }}>
          <PaymentControlCard summary={paymentSummary} loading={isLoading} />
        </motion.div>

        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.09 }}>
          <Card
            variant="elevated"
            className="dashboard-savings-card dashboard-module--savings h-full"
          >
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
        className="dashboard-bento-grid grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          variant="elevated"
          className="dashboard-forecast-card dashboard-module--rhythm col-span-1 h-full shadow-sm xl:col-span-3"
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
          className="dashboard-health-card dashboard-module--health col-span-1 h-full shadow-sm xl:col-span-3"
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

        <div className="dashboard-money-insight dashboard-module--money col-span-1 min-w-0 md:col-span-2 xl:col-span-6">
          <MoneyInsightCard referenceDate={viewDate} compact />
        </div>
      </motion.div>

      {/* Análise principal: evolução e composição */}
      <div className="dashboard-chart-grid grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
        <motion.div className="xl:col-span-2" {...fade} transition={{ delay: 0.15 }}>
          <Card className="dashboard-finance-chart dashboard-module--evolution h-full overflow-hidden">
            <div className="dashboard-finance-chart__header mb-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[--text-primary]">Evolução financeira</h3>
                    <InfoTooltip text="Valores agrupados pela data da movimentação. Use o seletor de meses para detalhar um período." />
                  </div>
                  <p className="mt-1 text-xs text-[--text-tertiary]">
                    Receitas e despesas em uma linha do tempo; toque nos meses para examinar o
                    movimento.
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

            <div className="dashboard-evolution-legend mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[--text-secondary]">
              {trendView === 'flow' ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="dashboard-series-dot dashboard-series-dot--income" /> Receitas
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="dashboard-series-dot dashboard-series-dot--expense" /> Despesas
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <i className="dashboard-series-dot dashboard-series-dot--result" /> Resultado
                  líquido
                </span>
              )}
            </div>
            <div className="dashboard-evolution-chart -mx-1 rounded-2xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 12, right: 10, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="dashboardIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success-icon)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--success-icon)" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="dashboardExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--danger-icon)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--danger-icon)" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="dashboardResultGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-500)" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0.015} />
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
          <Card className="dashboard-spending-composition dashboard-module--composition h-full overflow-hidden">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">Quem lidera os gastos</h3>
                <InfoTooltip text="Despesas do mês pela data da movimentação, ordenadas do maior para o menor gasto." />
              </div>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Mesmas categorias e cores em todos os lançamentos e gráficos.
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
                <CategoryCompositionVisual
                  items={categoryBreakdown}
                  maxVisible={5}
                  showLeader
                  getHref={(item) =>
                    `/transactions?category=${encodeURIComponent(item.categoryId)}&month=${budgetOverview.monthKey}`
                  }
                />
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Planejamento sem competir com o gráfico: orçamentos e metas lado a lado */}
      <div className="dashboard-support-grid grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
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

      {/* Histórico no rodapé: o painel rola sem esticar os demais cards. */}
      <div className="dashboard-history-area min-w-0">
        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.25 }}>
          <Card className="dashboard-transactions-card dashboard-module--transactions">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">
                  Transações de {format(viewDate, 'MMMM', { locale: ptBR })}
                </h3>
                <InfoTooltip text="Lançamentos do mês em lista com rolagem própria, operável com mouse, teclado ou toque." />
              </div>
              <Link
                to="/transactions"
                className="text-xs text-[--text-brand] hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            <p className="mb-3 text-[11px] text-[--text-tertiary]">
              {monthTx.length} {monthTx.length === 1 ? 'lançamento' : 'lançamentos'} neste período ·
              role para percorrer
            </p>
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
              <div
                className="dashboard-transactions-scroll"
                role="region"
                aria-label="Lista rolável de transações do mês"
                tabIndex={0}
              >
                {monthTx.map((tx) => (
                  <TxItem key={tx.id} tx={tx} categories={categories} />
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
