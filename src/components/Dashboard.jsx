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
import {
  filterDashboardFeed,
  groupDashboardFeedByDate,
  isDashboardThirdParty,
  getDashboardTransactionTags,
} from '../domain/dashboardBento'
import { categoryCompositionFromTransactions } from '../domain/categoryComposition'
import { summarizeTransactions, transactionsForMonth } from '../domain/finance'
import './dashboard-bento.css'
import InfoTooltip from './InfoTooltip'
import MoneyInsightCard from './MoneyInsightCard'
import CategoryCompositionVisual from './CategoryCompositionVisual'
import { decorateCategoryBreakdown } from '../domain/categoryComposition'
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

function BentoMoney({ amount, loading = false }) {
  if (loading) return '—'
  const formatted = formatCurrency(amount)
  const match = /^(-?R\$)[\s\u00a0]*/.exec(formatted)
  if (!match) return formatted
  return (
    <span className="dashboard-money-value inline-flex flex-wrap items-baseline tabular-nums">
      <span className="mr-1 text-xs font-normal tracking-normal text-slate-400">{match[1]}</span>
      <span className="font-inherit tracking-tight text-[#F8FAFC]">
        {formatted.slice(match[0].length)}
      </span>
    </span>
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
  const tags = getDashboardTransactionTags(tx)
  const dateContext = getTransactionDateContext(tx)
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0">
      <BentoCategoryIcon
        category={cat}
        name={tx.isSavings ? 'Reservas' : cat?.name || (isIncome ? 'Receita' : 'Despesa')}
      />
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-semibold text-[--text-primary]">
            {tx.description || (tx.isSavings ? 'Poupança' : cat?.name) || 'Sem descrição'}
          </p>
          {tags.map((tag) => (
            <span
              key={tag}
              className="dashboard-feed-tag shrink-0 rounded-full px-2 py-0.5 text-[10px]"
            >
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

function UnifiedDashboardIntelligence({
  healthReport,
  referenceDate,
  reviewItem,
  onReview,
  saving,
}) {
  return (
    <Card variant="elevated" className="dashboard-decision-card h-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-amber-300" />
          <h2 className="text-sm font-bold text-[--text-primary]">Saúde & Money</h2>
        </div>
        <span className="dashboard-bento-pro">Money PRO</span>
      </div>
      {reviewItem ? (
        <div className="dashboard-review-inline rounded-2xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
            Ação necessária · classificação para revisar
          </p>
          <p className="mt-1 truncate text-xs font-semibold" title={reviewItem.description}>
            {reviewItem.description}
          </p>
          <p className="mt-1 text-[11px] text-[--text-secondary]">
            {reviewItem.currentCategoryName} · sugestão: {reviewItem.suggestedCategoryName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => onReview('approve')}
              className="dashboard-review-action rounded-lg px-2.5 py-2 text-[11px] font-semibold disabled:opacity-50"
            >
              Aprovar atual
            </button>
            {reviewItem.suggestedCategoryId ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onReview('correct')}
                className="dashboard-review-action dashboard-review-action--accent rounded-lg px-2.5 py-2 text-[11px] font-semibold disabled:opacity-50"
              >
                Corrigir categoria
              </button>
            ) : (
              <Link
                to="/transactions?review=categories&scope=all"
                className="dashboard-review-action dashboard-review-action--accent rounded-lg px-2.5 py-2 text-[11px] font-semibold"
              >
                Escolher categoria
              </Link>
            )}
          </div>
        </div>
      ) : (
        <p className="mb-3 flex items-center gap-2 text-xs text-[--text-secondary]">
          <CheckCircle2 size={14} className="text-emerald-400" />
          Nenhuma classificação suspeita neste mês
        </p>
      )}
      <div className="dashboard-decision-health">
        <FinancialHealthScore report={healthReport} />
      </div>
      <div className="dashboard-decision-money mt-3">
        <MoneyInsightCard referenceDate={referenceDate} compact />
      </div>
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
    () => (onlyOwn ? transactions.filter((tx) => !isDashboardThirdParty(tx)) : transactions),
    [transactions, onlyOwn],
  )
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const rawCompactMonthLabel = format(viewDate, 'MMMM yyyy', { locale: ptBR })
  const compactMonthLabel =
    rawCompactMonthLabel.charAt(0).toUpperCase() + rawCompactMonthLabel.slice(1)
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

  const currentSummary = useMemo(
    () =>
      onlyOwn
        ? summarizeTransactions(transactionsForMonth(visibleTransactions, year, month))
        : getSummary(year, month),
    [year, month, visibleTransactions, onlyOwn, getSummary],
  )
  const categoryTotals = useMemo(
    () =>
      onlyOwn
        ? categoryCompositionFromTransactions(
            transactionsForMonth(visibleTransactions, year, month),
            categories,
          )
        : getCategoryTotals(year, month),
    [year, month, visibleTransactions, categories, onlyOwn, getCategoryTotals],
  )
  const previousViewDate = useMemo(() => subMonths(viewDate, 1), [year, month])
  const previousSummary = useMemo(
    () =>
      onlyOwn
        ? summarizeTransactions(
            transactionsForMonth(
              visibleTransactions,
              previousViewDate.getFullYear(),
              previousViewDate.getMonth(),
            ),
          )
        : getSummary(previousViewDate.getFullYear(), previousViewDate.getMonth()),
    [previousViewDate, visibleTransactions, onlyOwn, getSummary],
  )
  const previousMonthLabel = format(previousViewDate, 'MMMM', { locale: ptBR })
  const previousCategoryTotals = useMemo(
    () =>
      onlyOwn
        ? categoryCompositionFromTransactions(
            transactionsForMonth(
              visibleTransactions,
              previousViewDate.getFullYear(),
              previousViewDate.getMonth(),
            ),
            categories,
          )
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
      ),
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
          ? {
              categoryId: reviewItem.suggestedCategoryId,
              categoryReviewApprovedFamily: null,
              categoryReviewApprovedCategoryId: null,
            }
          : {
              categoryReviewApprovedFamily: reviewItem.suggestedFamily,
              categoryReviewApprovedCategoryId: original.categoryId,
            }),
      })
    } catch {
      // O contexto de transações já apresenta uma notificação de erro.
    } finally {
      setReviewSaving(false)
    }
  }
  const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <div
      data-tour="dashboard"
      className="dashboard-premium dashboard-v58 dashboard-fintech-bento mx-auto grid min-w-0 max-w-[1800px] grid-cols-12 gap-5 pb-24 lg:pb-6"
    >
      <motion.div className="dashboard-premium__toolbar dashboard-bento-topbar" {...fade}>
        <div className="dashboard-bento-greeting">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[--text-tertiary]">
            Meu Real · visão geral
          </p>
          <p className="mt-1 text-sm font-semibold text-[--text-primary]">
            {greeting()}, {user?.displayName?.split(' ')[0] || 'usuário'}
          </p>
        </div>
        <div
          className="dashboard-month-nav dashboard-bento-month-nav"
          role="group"
          aria-label="Navegar pelos meses"
        >
          <button
            type="button"
            onClick={() => setViewDate((date) => subMonths(date, 1))}
            aria-label="Visualizar mês anterior"
            className="dashboard-bento-icon-button"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-sm font-bold tabular-nums text-[--text-primary]">
              {compactMonthLabel}
            </h1>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setViewDate(new Date())}
                className="text-[10px] text-[--text-brand] hover:underline"
              >
                Voltar a hoje
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setViewDate((date) => addMonths(date, 1))}
            aria-label="Visualizar próximo mês"
            className="dashboard-bento-icon-button"
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="dashboard-bento-toolbar-actions">
          <button
            type="button"
            role="switch"
            aria-checked={onlyOwn}
            onClick={() => {
              setOnlyOwn((current) => !current)
              setFeedFilter('all')
            }}
            className="dashboard-bento-filter rounded-xl px-3 py-2 text-[11px] font-medium transition-all duration-200"
            title="Oculta lançamentos sinalizados como de terceiros ou reembolsáveis; não altera nenhum dado salvo"
          >
            <span className="dashboard-bento-filter-switch" aria-hidden="true" />
            Apenas meus gastos
          </button>
          <button
            type="button"
            className="dashboard-bento-search rounded-xl px-3 py-2 text-xs"
            aria-label="Abrir busca global"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
              )
            }
          >
            <Search size={15} /> <span className="hidden xl:inline">Buscar</span>
            <kbd className="hidden 2xl:inline">Ctrl K</kbd>
          </button>
          <Link
            to="/transactions"
            className="dashboard-bento-new rounded-xl px-3 py-2 text-xs font-bold"
          >
            <Plus size={15} /> Nova transação
          </Link>
        </div>
      </motion.div>

      <div className="dashboard-executive-grid dashboard-bento-pulse">
        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.05 }}>
          <Card variant="hero" className="dashboard-period-summary dashboard-period-hero h-full">
            <div className="dashboard-period-hero__main">
              <div className="dashboard-period-hero__amount">
                <div className="dashboard-period-hero__eyebrow">
                  <span>Resultado do período</span>
                  <InfoTooltip text="Receitas menos despesas registradas pela data da movimentação no mês visualizado. Não representa saldo bancário nem dinheiro livre em conta." />
                </div>
                <p className="dashboard-period-hero__value">
                  <BentoMoney amount={currentSummary.balance} loading={isLoading} />
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
                  <p className="dashboard-period-metric__value">
                    <BentoMoney amount={value} loading={isLoading} />
                  </p>
                </div>
              ))}
            </div>
            <div className="dashboard-bento-segments mt-4">
              <div
                className="dashboard-bento-segment-track"
                role="img"
                aria-label={`Despesas do período: ${formatCurrency(currentSummary.expenses)}; poupança líquida: ${formatCurrency(savingsOverview.periodNet)}; receitas: ${formatCurrency(currentSummary.income)}.`}
              >
                <span
                  className="dashboard-bento-segment dashboard-bento-segment--expense"
                  style={{
                    width: `${currentSummary.income > 0 ? Math.min(100, (currentSummary.expenses / currentSummary.income) * 100) : 0}%`,
                  }}
                />
                <span
                  className="dashboard-bento-segment dashboard-bento-segment--reserve"
                  style={{
                    width: `${currentSummary.income > 0 ? Math.min(100 - Math.min(100, (currentSummary.expenses / currentSummary.income) * 100), (Math.max(0, savingsOverview.periodNet) / currentSummary.income) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-[--text-tertiary]">
                Despesas e reservas como parcelas das receitas, sem dupla contagem na barra.
              </p>
            </div>
            <div className="dashboard-bento-month-chips mt-4">
              {actionInsights.length ? (
                actionInsights.map((item) => (
                  <Link
                    key={item.title}
                    to={item.to}
                    title={item.detail}
                    className="dashboard-bento-insight-chip"
                  >
                    <Zap size={13} aria-hidden="true" />
                    <span className="truncate">{item.title}</span>
                    <ChevronRight size={12} aria-hidden="true" />
                  </Link>
                ))
              ) : (
                <span className="dashboard-bento-insight-chip">
                  <CheckCircle2 size={14} /> Sem alertas imediatos
                </span>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div className="min-w-0" {...fade} transition={{ delay: 0.075 }}>
          <UnifiedDashboardIntelligence
            healthReport={healthReport}
            referenceDate={viewDate}
            reviewItem={reviewItem}
            onReview={saveReview}
            saving={reviewSaving}
          />
        </motion.div>
      </div>

      {/* Obrigações, patrimônio e ritmo lado a lado */}
      <div className="dashboard-executive-grid dashboard-bento-operations">
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
                  <BentoMoney amount={savingsOverview.totalBalance} />
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
            <div className="dashboard-asset-goals mt-4 border-t border-white/[0.07] pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-[--text-primary]">
                  <Target size={14} className="text-emerald-400" /> Metas em andamento
                </h3>
                <Link to="/goals" className="text-[11px] text-[--text-brand] hover:underline">
                  Ver metas
                </Link>
              </div>
              {goals.length === 0 ? (
                <p className="text-xs text-[--text-secondary]">Nenhuma meta cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {goals.slice(0, 2).map((goal) => {
                    const current = getGoalEffectiveCurrent(goal, transactions)
                    const target = Number(goal.targetAmount || 0)
                    return (
                      <div key={goal.id}>
                        <div className="flex min-w-0 items-center justify-between gap-2 text-[11px]">
                          <span className="min-w-0 truncate font-semibold">{goal.name}</span>
                          <span className="shrink-0 tabular-nums text-[--text-secondary]">
                            {formatCurrency(current)} / {formatCurrency(target)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-200"
                            style={{
                              width: `${target > 0 ? Math.min(100, (current / target) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Termômetro do ritmo para a linha de obrigações e patrimônio */}
      <motion.div
        className="dashboard-bento-grid dashboard-bento-rhythm-row"
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
              <p className="mt-3 text-xs tabular-nums text-[--text-secondary]">
                Gasto atual{' '}
                <strong className="text-[--text-primary]">
                  {formatCurrency(currentSummary.expenses)}
                </strong>
              </p>
              {forecast > 0 && (
                <p
                  className={`mt-1 text-[11px] font-semibold ${currentSummary.expenses <= forecast ? 'text-emerald-400' : 'text-amber-300'}`}
                >
                  {Math.abs((currentSummary.expenses / forecast - 1) * 100).toFixed(1)}%{' '}
                  {currentSummary.expenses <= forecast ? 'abaixo' : 'acima'} da referência
                </p>
              )}
            </div>
            <div className="rounded-xl bg-[--brand-100] p-2 text-[--brand-700]">
              <Zap size={16} />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Análise principal: evolução e composição */}
      <div className="dashboard-chart-grid dashboard-bento-analytics grid min-w-0 grid-cols-1 gap-5">
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
                  vectorIcons
                  onHoverCategory={setActiveCategory}
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
      <div className="dashboard-support-grid dashboard-bento-support grid min-w-0 grid-cols-1 gap-4">
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
                      <BentoCategoryIcon category={cat} />
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
      </div>

      {/* Histórico no rodapé: o painel rola sem esticar os demais cards. */}
      <div className="dashboard-history-area dashboard-bento-feed min-w-0">
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
              {filteredFeed.length} {filteredFeed.length === 1 ? 'lançamento' : 'lançamentos'} no
              filtro · role para percorrer
            </p>
            <div
              className="dashboard-feed-filters mb-4 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filtrar transações"
            >
              {[
                ['all', 'Todos'],
                ['own', 'Meus gastos'],
                ['third-party', 'Terceiros / Mãe'],
                ['card-5186', 'Cartão 5186'],
                ['recurring', 'Recorrentes'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFeedFilter(value)}
                  aria-pressed={feedFilter === value}
                  className="dashboard-feed-filter min-h-9 rounded-full px-3 text-[11px] font-medium transition-all duration-200"
                >
                  {label}
                </button>
              ))}
            </div>
            {filteredFeed.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Nenhuma transação neste filtro"
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
                {groupedFeed.map((group) => (
                  <section key={group.date} className="dashboard-feed-date-group">
                    <p className="dashboard-feed-date-label">
                      {group.date === 'unknown'
                        ? 'Data não informada'
                        : format(new Date(`${group.date}T12:00:00`), 'dd MMM', { locale: ptBR })}
                    </p>
                    {group.items.map((tx) => (
                      <div
                        key={tx.id}
                        className={
                          activeCategory && tx.categoryId !== activeCategory
                            ? 'opacity-35 transition-opacity duration-200'
                            : 'transition-opacity duration-200'
                        }
                      >
                        <TxItem tx={tx} categories={categories} />
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
