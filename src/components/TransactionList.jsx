// src/components/TransactionList.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  X,
  FileText,
  ArrowLeftRight,
  PiggyBank,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import {
  useCategories,
  useCreditCards,
  useInvoiceEvents,
  useNotifications,
  useTransactions,
} from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { Button, EmptyState, Modal } from './ui'
import TransactionForm from './TransactionForm'
import TransactionSeriesModal from './TransactionSeriesModal'
import TransactionCsvImportModal from './TransactionCsvImportModal'
import TransactionSavedViews from './TransactionSavedViews'
import {
  formatCurrency,
  getPaymentLabel,
  exportToCSV,
  exportToPDF,
  PAYMENT_METHODS,
} from '../utils'
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { defaultDateRangeEnd, summarizeTransactions } from '../domain/finance'
import {
  formatTransactionIsoDate,
  getTransactionActivityDate,
  getTransactionDateContext,
} from '../domain/transactionDates'
import { buildCategoryReviewQueue } from '../domain/categoryReview'
import { getSavingsDestinationLabel } from '../domain/savings'
import { isTransactionSeries } from '../domain/transactionSeries'
import {
  PAYMENT_STATUS,
  buildPaymentBulkOperation,
  buildPaymentStatusIndex,
  buildPaymentUndoOperation,
  canToggleTransactionPayment,
  getTransactionPaymentState,
  isPayableExpense,
  isStructuredCreditTransaction,
  isTransactionPaid,
} from '../domain/paymentControl'
import {
  createSavedTransactionView,
  readSavedTransactionViews,
  removeSavedTransactionView,
  writeSavedTransactionViews,
} from '../domain/transactionViews'

const DATE_PRESETS = [
  {
    id: 'current_month',
    label: 'Este mês',
    getRange: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'previous_month',
    label: 'Mês passado',
    getRange: () => ({
      from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'next_month',
    label: 'Próximo mês',
    getRange: () => {
      const nextMonth = addMonths(new Date(), 1)
      return {
        from: format(startOfMonth(nextMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(nextMonth), 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: 'last_3_months',
    label: 'Últimos 3 meses',
    getRange: () => ({
      from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    id: 'current_year',
    label: 'Este ano',
    getRange: () => ({
      from: `${new Date().getFullYear()}-01-01`,
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  { id: 'all', label: 'Todos', getRange: () => ({ from: '', to: '' }) },
]

function getCurrentMonthRange() {
  return {
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  }
}

// Agrupa transações por data
function groupByDate(txs) {
  const groups = {}
  txs.forEach((tx) => {
    const activityDate = getTransactionActivityDate(tx) || tx.date || ''
    if (!groups[activityDate]) groups[activityDate] = []
    groups[activityDate].push(tx)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function manualPaymentPresentation(status) {
  if (status === PAYMENT_STATUS.PAID) {
    return {
      label: 'Pago',
      className: 'border-[--success-border] bg-[--success-bg] text-[--success-text]',
    }
  }

  if (status === PAYMENT_STATUS.OVERDUE) {
    return {
      label: 'Atrasado',
      className: 'border-[--danger-border] bg-[--danger-bg] text-[--danger-text]',
    }
  }

  if (status === PAYMENT_STATUS.UNKNOWN) {
    return {
      label: 'A revisar',
      className: 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]',
    }
  }

  return {
    label: 'Pendente',
    className: 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]',
  }
}

function invoicePaymentPresentation(paymentState = {}) {
  if (paymentState.status === PAYMENT_STATUS.PAID) {
    return {
      label: 'Fatura paga',
      className: 'border-[--success-border] bg-[--success-bg] text-[--success-text]',
    }
  }

  if (paymentState.status === PAYMENT_STATUS.OVERDUE && paymentState.detail === 'overdue_partial') {
    return {
      label: 'Fatura parcial atrasada',
      className: 'border-[--danger-border] bg-[--danger-bg] text-[--danger-text]',
    }
  }

  if (paymentState.status === PAYMENT_STATUS.OVERDUE) {
    return {
      label: 'Fatura atrasada',
      className: 'border-[--danger-border] bg-[--danger-bg] text-[--danger-text]',
    }
  }

  if (paymentState.status === PAYMENT_STATUS.PARTIAL) {
    return {
      label: 'Fatura parcial',
      className: 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]',
    }
  }

  return {
    label: 'Fatura pendente',
    className: 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]',
  }
}

function toDateTimeLabel(value) {
  if (!value) return null
  const date = value?.toDate?.() || new Date(value)
  return Number.isNaN(date.getTime()) ? null : format(date, "dd/MM/yyyy 'às' HH:mm")
}

const TRANSACTION_KIND = {
  income: ['Receita', TrendingUp],
  expense: ['Despesa', TrendingDown],
  transfer: ['Transferência', ArrowLeftRight],
  savings: ['Aporte / reserva', PiggyBank],
}

const getKind = (transaction) =>
  transaction.isSavings
    ? 'savings'
    : transaction.flowType === 'transfer' || transaction.kind === 'transfer'
      ? 'transfer'
      : transaction.type === 'income'
        ? 'income'
        : 'expense'

function TxRow({
  tx,
  cat,
  onEdit,
  onDelete,
  onTogglePayment,
  paymentUpdating,
  paymentState,
  paymentSelected,
  onPaymentSelect,
  categoryReview,
}) {
  const kind = getKind(tx)
  const isIncome = kind === 'income'
  const isSavings = kind === 'savings'
  const isTransfer = kind === 'transfer'
  const dateContext = getTransactionDateContext(tx)
  const protectedGroup = isTransactionSeries(tx)
  const payableExpense = isPayableExpense(tx)
  const structuredCredit = isStructuredCreditTransaction(tx)
  const toggleablePayment = canToggleTransactionPayment(tx)
  const paid = paymentState.status === PAYMENT_STATUS.PAID
  const cancelled = paymentState.status === PAYMENT_STATUS.CANCELLED
  const manualPresentation = manualPaymentPresentation(paymentState.status)
  const invoicePresentation = invoicePaymentPresentation(paymentState)
  const createdAtLabel = toDateTimeLabel(tx.createdAt)
  const paidAtLabel = toDateTimeLabel(tx.paidAt)
  const [baseKindLabel, KindIcon] = TRANSACTION_KIND[kind]
  const kindLabel =
    isSavings && tx.savingsMovement === 'withdrawal' ? 'Retirada da reserva' : baseKindLabel

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="transaction-row transaction-row-refined group"
    >
      <div className="transaction-kind-icon" data-kind={kind} aria-hidden="true">
        <KindIcon size={17} />
      </div>

      <div className="transaction-row-main">
        <div className="transaction-row-heading">
          <p className="transaction-row-title">{tx.description || cat?.name || kindLabel}</p>
          {tx.isInstallment && (
            <span className="transaction-series-badge transaction-series-badge--installment">
              {tx.installmentNum}/{tx.installmentOf}x
            </span>
          )}
          {tx.isRecurring && !tx.isInstallment && (
            <span className="transaction-series-badge">Fixo</span>
          )}
        </div>

        <div className="transaction-row-meta">
          <span className="transaction-kind-badge" data-kind={kind}>
            {kindLabel}
          </span>

          {cat && !isSavings && !isTransfer && (
            <span
              className="transaction-category-badge"
              style={{
                background: (cat.color || '#6366f1') + '15',
                borderColor: (cat.color || '#6366f1') + '45',
              }}
            >
              {cat.icon ? `${cat.icon} ` : ''}
              {cat.name}
            </span>
          )}

          {tx.paymentMethod && !isSavings && !isTransfer && (
            <span className="transaction-payment-method">{getPaymentLabel(tx.paymentMethod)}</span>
          )}

          {isSavings && (
            <span className="transaction-payment-method">{getSavingsDestinationLabel(tx)}</span>
          )}

          {categoryReview && (
            <button type="button" onClick={() => onEdit(tx)} className="transaction-review-action">
              Revisar categoria
            </button>
          )}

          {payableExpense && toggleablePayment && (
            <button
              type="button"
              onClick={() => onTogglePayment(tx)}
              disabled={paymentUpdating}
              aria-pressed={paid}
              aria-label={`${paid ? 'Marcar como pendente' : 'Marcar como paga'}: ${tx.description || cat?.name || 'despesa'}`}
              className={`transaction-payment-status ${manualPresentation.className}`}
            >
              {paid ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
              {paymentUpdating ? 'Salvando…' : manualPresentation.label}
            </button>
          )}

          {payableExpense && structuredCredit && !toggleablePayment && (
            <Link
              to="/cards"
              aria-label={`Abrir fatura de ${tx.cardName || 'cartão'}`}
              className={`transaction-payment-status ${invoicePresentation.className}`}
            >
              {paid ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
              {invoicePresentation.label}
            </Link>
          )}

          {payableExpense && cancelled && !structuredCredit && (
            <span className="transaction-cancelled-status">Cancelada</span>
          )}
        </div>

        <details className="transaction-row-details">
          <summary className="transaction-row-details-summary">
            <ChevronDown size={12} />
            Detalhes
          </summary>
          <div className="transaction-row-details-panel">
            <span>Movimentação: {formatTransactionIsoDate(dateContext.activityDate)}</span>
            {!structuredCredit && tx.dueDate && tx.dueDate !== dateContext.activityDate && (
              <span>Vencimento: {dateContext.accountingLabel}</span>
            )}
            {dateContext.hasSeparateAccountingDate && (
              <span>Fatura: {dateContext.accountingLabel}</span>
            )}
            {paidAtLabel && <span>Pagamento: {paidAtLabel}</span>}
            {createdAtLabel && <span>Cadastro: {createdAtLabel}</span>}
            {protectedGroup && (
              <span>{tx.isInstallment ? 'Série parcelada' : 'Série recorrente'}</span>
            )}
            {isSavings && tx.savingsInstitution && <span>Instituição: {tx.savingsInstitution}</span>}
            {isSavings && tx.savingsDestination && <span>Destino: {tx.savingsDestination}</span>}
            {tx.notes && <span className="transaction-row-note">Observação: {tx.notes}</span>}
          </div>
        </details>
      </div>

      <div className="transaction-row__aside transaction-row-aside-refined">
        <span className="transaction-amount" data-kind={kind}>
          {isSavings
            ? tx.savingsMovement === 'withdrawal'
              ? '−'
              : '+'
            : isIncome
              ? '+'
              : kind === 'expense'
                ? '−'
                : ''}
          {formatCurrency(tx.amount)}
        </span>

        <div className="transaction-row-controls">
          {payableExpense && toggleablePayment && (
            <label className="transaction-select-control">
              <input
                type="checkbox"
                checked={Boolean(paymentSelected)}
                onChange={() => onPaymentSelect(tx)}
                className="h-4 w-4 rounded accent-[--brand-600]"
                aria-label={`Selecionar ${tx.description || cat?.name || 'transação'}`}
              />
              <span className="hidden xl:inline">Selecionar</span>
            </label>
          )}

          <div className="transaction-row-actions">
            <button
              onClick={() => onEdit(tx)}
              className="transaction-row-action transaction-row-action--edit"
              aria-label={`Editar transação ${tx.description || cat?.name || ''}`.trim()}
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(tx)}
              className="transaction-row-action transaction-row-action--delete"
              aria-label={`Excluir transação ${tx.description || cat?.name || ''}`.trim()}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function getMonthRouteRange(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey || '')) return null
  const [year, month] = monthKey.split('-').map(Number)
  if (month < 1 || month > 12) return null
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  }
}

export default function TransactionList() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const {
    transactions,
    removeTransaction,
    removeTransactionBatch,
    importTransactionBatch,
    applyTransactionSeriesOperation,
    setTransactionPaymentStatus,
    commitPaymentStatusOperation,
  } = useTransactions()
  const { showNotification } = useNotifications()
  const { categories } = useCategories()
  const { creditCards } = useCreditCards()
  const { invoiceEvents } = useInvoiceEvents()

  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter] = useState(() => searchParams.get('category') || 'all')
  const [payFilter, setPayFilter] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [categoryReviewOnly, setCategoryReviewOnly] = useState(
    () => searchParams.get('review') === 'categories',
  )
  const [dateRange, setDateRange] = useState(
    () =>
      getMonthRouteRange(searchParams.get('month')) ||
      (searchParams.get('scope') === 'all' ? { from: '', to: '' } : getCurrentMonthRange()),
  )
  const [showFilters, setShowFilters] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [seriesAction, setSeriesAction] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [lastImportIds, setLastImportIds] = useState([])
  const [savedViews, setSavedViews] = useState([])
  const [page, setPage] = useState(1)
  const [sortAsc, setSortAsc] = useState(false)
  const [paymentUpdatingIds, setPaymentUpdatingIds] = useState(() => new Set())
  const [selectedPaymentIds, setSelectedPaymentIds] = useState(() => new Set())
  const [lastPaymentOperation, setLastPaymentOperation] = useState(null)
  const [bulkPaymentUpdating, setBulkPaymentUpdating] = useState(false)
  const PER_PAGE = 30

  const paymentStatusIndex = useMemo(
    () => buildPaymentStatusIndex({ transactions, creditCards, invoiceEvents }),
    [transactions, creditCards, invoiceEvents],
  )
  const categoryReviewQueue = useMemo(
    () => buildCategoryReviewQueue(transactions, categories),
    [transactions, categories],
  )
  const categoryReviewIndex = useMemo(
    () => new Map(categoryReviewQueue.map((item) => [item.transactionId, item])),
    [categoryReviewQueue],
  )

  const filtered = useMemo(() => {
    let txs = transactions.filter((tx) => {
      if (typeFilter !== 'all' && getKind(tx) !== typeFilter) return false
      if (catFilter !== 'all' && tx.categoryId !== catFilter) return false
      if (payFilter !== 'all' && tx.paymentMethod !== payFilter) return false
      if (categoryReviewOnly && !categoryReviewIndex.has(tx.id)) return false

      if (paymentStatusFilter !== 'all') {
        if (!isPayableExpense(tx)) return false

        const paymentState = getTransactionPaymentState(tx, paymentStatusIndex)
        const status = paymentState.status

        if (
          paymentStatusFilter === 'to_pay' &&
          ![PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PARTIAL, PAYMENT_STATUS.OVERDUE].includes(status)
        ) {
          return false
        }

        if (paymentStatusFilter !== 'to_pay' && status !== paymentStatusFilter) {
          return false
        }
      }

      const activityDate = getTransactionActivityDate(tx)
      if (dateRange.from && activityDate < dateRange.from) return false
      if (dateRange.to && activityDate > dateRange.to) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !tx.description?.toLowerCase().includes(q) &&
          !tx.categoryName?.toLowerCase().includes(q) &&
          !tx.notes?.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
    txs.sort((a, b) => {
      const firstDate = getTransactionActivityDate(a)
      const secondDate = getTransactionActivityDate(b)
      return sortAsc ? firstDate.localeCompare(secondDate) : secondDate.localeCompare(firstDate)
    })
    return txs
  }, [
    transactions,
    typeFilter,
    catFilter,
    payFilter,
    paymentStatusFilter,
    paymentStatusIndex,
    categoryReviewOnly,
    categoryReviewIndex,
    dateRange,
    search,
    sortAsc,
  ])

  const bulkPaymentCandidates = useMemo(
    () =>
      filtered.filter(
        (transaction) => isPayableExpense(transaction) && canToggleTransactionPayment(transaction),
      ),
    [filtered],
  )

  const selectedPaymentTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          selectedPaymentIds.has(transaction.id) && canToggleTransactionPayment(transaction),
      ),
    [transactions, selectedPaymentIds],
  )

  useEffect(() => {
    setSelectedPaymentIds(new Set())
  }, [
    typeFilter,
    catFilter,
    payFilter,
    paymentStatusFilter,
    categoryReviewOnly,
    dateRange.from,
    dateRange.to,
    search,
  ])

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setCatFilter(searchParams.get('category') || 'all')

    const monthRange = getMonthRouteRange(searchParams.get('month'))
    setDateRange(
      monthRange ||
        (searchParams.get('scope') === 'all' ? { from: '', to: '' } : getCurrentMonthRange()),
    )

    setCategoryReviewOnly(searchParams.get('review') === 'categories')
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    if (!user?.uid || typeof window === 'undefined') {
      setSavedViews([])
      return
    }

    setSavedViews(readSavedTransactionViews(user.uid, window.localStorage))
  }, [user?.uid])

  const summary = useMemo(() => summarizeTransactions(filtered), [filtered])

  const grouped = useMemo(() => groupByDate(filtered.slice(0, page * PER_PAGE)), [filtered, page])
  const hasMore = filtered.length > page * PER_PAGE
  const currentMonthRange = getCurrentMonthRange()
  const hasCustomDateRange =
    dateRange.from !== currentMonthRange.from || dateRange.to !== currentMonthRange.to
  const savableFilterCount = [
    typeFilter !== 'all',
    catFilter !== 'all',
    payFilter !== 'all',
    paymentStatusFilter !== 'all',
    hasCustomDateRange,
  ].filter(Boolean).length
  const currentDatePreset =
    DATE_PRESETS.find((preset) => {
      const range = preset.getRange()
      return dateRange.from === range.from && dateRange.to === range.to
    })?.id || ''

  const activeFilterChips = [
    typeFilter !== 'all' && ['type', TRANSACTION_KIND[typeFilter][0]],
    catFilter !== 'all' && [
      'category',
      categories.find((category) => category.id === catFilter)?.name || 'Categoria',
    ],
    payFilter !== 'all' && ['payment', getPaymentLabel(payFilter)],
    paymentStatusFilter !== 'all' && [
      'status',
      {
        unknown: 'A revisar',
        to_pay: 'A pagar',
        pending: 'Pendente',
        partial: 'Parcial',
        overdue: 'Atrasada',
        paid: 'Paga',
        cancelled: 'Cancelada',
      }[paymentStatusFilter] || paymentStatusFilter,
    ],
    categoryReviewOnly && ['review', 'Categorias em revisão'],
    hasCustomDateRange && [
      'date',
      DATE_PRESETS.find((preset) => preset.id === currentDatePreset)?.label || 'Período',
    ],
  ].filter(Boolean)
  const activeFilters = activeFilterChips.length + Number(Boolean(search.trim()))

  const removeActiveFilter = (filterId) => {
    if (filterId === 'type') setTypeFilter('all')
    if (filterId === 'category') setCatFilter('all')
    if (filterId === 'payment') setPayFilter('all')
    if (filterId === 'status') setPaymentStatusFilter('all')
    if (filterId === 'review') setCategoryReviewOnly(false)
    if (filterId === 'date') setDateRange(getCurrentMonthRange())
    setPage(1)
  }

  const handleEdit = (tx) => {
    if (isTransactionSeries(tx)) {
      setSeriesAction({
        mode: 'edit',
        transaction: tx,
      })
      return
    }

    setEditingTx(tx)
    setModalOpen(true)
  }

  const handleDeleteRequest = (tx) => {
    if (isTransactionSeries(tx)) {
      setSeriesAction({
        mode: 'delete',
        transaction: tx,
      })
      return
    }

    setDeleteId(tx.id)
  }

  const handleNew = () => {
    setEditingTx(null)
    setModalOpen(true)
  }

  const handleCsvImport = async (items) => {
    const ids = await importTransactionBatch(items)
    setLastImportIds(ids || [])
    return ids
  }

  const handleUndoImport = async () => {
    if (!lastImportIds?.length) return

    const ids = lastImportIds
    setLastImportIds(null)
    try {
      await removeTransactionBatch(ids)
    } catch (error) {
      setLastImportIds(ids)
      throw error
    }
  }
  const handleClose = () => {
    setModalOpen(false)
    setEditingTx(null)
  }
  const handleDelete = async () => {
    if (!deleteId) return
    await removeTransaction(deleteId)
    setDeleteId(null)
  }
  const handleTogglePayment = async (transaction) => {
    const isPaid = isTransactionPaid(transaction)
    setPaymentUpdatingIds((current) => new Set(current).add(transaction.id))
    try {
      await setTransactionPaymentStatus(transaction.id, !isPaid)
    } finally {
      setPaymentUpdatingIds((current) => {
        const next = new Set(current)
        next.delete(transaction.id)
        return next
      })
    }
  }
  const togglePaymentSelection = (transaction) => {
    setSelectedPaymentIds((current) => {
      const next = new Set(current)

      if (next.has(transaction.id)) {
        next.delete(transaction.id)
      } else {
        next.add(transaction.id)
      }

      return next
    })
  }

  const selectVisiblePayments = () => {
    setSelectedPaymentIds(new Set(bulkPaymentCandidates.map((transaction) => transaction.id)))
  }

  const handleBulkPaymentStatus = async (targetStatus) => {
    const operation = buildPaymentBulkOperation(selectedPaymentTransactions, targetStatus)

    if (!operation.changes.length) {
      showNotification('Nenhuma alteração necessária.', 'info')
      return
    }

    setBulkPaymentUpdating(true)

    try {
      await commitPaymentStatusOperation(operation)
      setLastPaymentOperation(operation)
      setSelectedPaymentIds(new Set())
    } finally {
      setBulkPaymentUpdating(false)
    }
  }

  const handleUndoPaymentOperation = async () => {
    if (!lastPaymentOperation) return

    const undo = buildPaymentUndoOperation(lastPaymentOperation)

    setBulkPaymentUpdating(true)

    try {
      await commitPaymentStatusOperation(undo)
      setLastPaymentOperation(null)
      setSelectedPaymentIds(new Set())
    } finally {
      setBulkPaymentUpdating(false)
    }
  }

  const clearFilters = () => {
    setTypeFilter('all')
    setCatFilter('all')
    setPayFilter('all')
    setPaymentStatusFilter('all')
    setCategoryReviewOnly(false)
    setDateRange({ from: '', to: '' })
    setSearch('')
    setPage(1)
  }

  const persistSavedViews = (nextViews) => {
    if (!user?.uid || typeof window === 'undefined') return false
    const persisted = writeSavedTransactionViews(user.uid, nextViews, window.localStorage)
    setSavedViews(persisted)
    return true
  }

  const saveCurrentView = (name) => {
    try {
      const view = createSavedTransactionView(
        name,
        {
          typeFilter,
          catFilter,
          payFilter,
          paymentStatusFilter,
          datePreset: currentDatePreset,
          dateRange,
        },
        savedViews,
      )
      persistSavedViews([...savedViews, view])
      showNotification('Visão salva para reutilizar depois.')
      return true
    } catch (error) {
      showNotification(error.message || 'Não foi possível salvar a visão.', 'warning')
      return false
    }
  }

  const applySavedView = (view) => {
    const filters = view?.filters || {}
    const preset = DATE_PRESETS.find((item) => item.id === filters.datePreset)
    const categoryStillExists =
      filters.catFilter === 'all' ||
      categories.some((category) => category.id === filters.catFilter)

    setTypeFilter(filters.typeFilter || 'all')
    setCatFilter(categoryStillExists ? filters.catFilter || 'all' : 'all')
    setPayFilter(filters.payFilter || 'all')
    setPaymentStatusFilter(filters.paymentStatusFilter || 'all')
    setDateRange(preset ? preset.getRange() : filters.dateRange || { from: '', to: '' })
    setSearch('')
    setPage(1)
    setShowFilters(true)

    if (!categoryStillExists) {
      showNotification(
        'A categoria salva não existe mais; os outros filtros foram aplicados.',
        'info',
      )
    }
  }

  const deleteSavedView = (viewId) => {
    const nextViews = removeSavedTransactionView(savedViews, viewId)
    persistSavedViews(nextViews)
  }

  const dateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hoje'
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
    return format(d, "d 'de' MMMM", { locale: ptBR })
  }

  return (
    <div
      data-tour="transactions"
      className="operational-page transactions-premium mx-auto min-w-0 max-w-[1600px] space-y-4 pb-28 lg:pb-6"
    >
      {/* Header */}
      <div className="operational-page__header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Transações</h1>
          <p className="text-xs text-[--text-tertiary] mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'encontrada' : 'encontradas'}
          </p>
        </div>
        {/* Ações — mobile: só botão Nova */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload size={14} />}
              onClick={() => setImportModal(true)}
            >
              Importar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => exportToCSV(filtered)}
            >
              CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<FileText size={14} />}
              onClick={() => exportToPDF(filtered, summary)}
            >
              PDF
            </Button>
          </div>
          <Button variant="primary" size="sm" icon={<Plus />} onClick={handleNew}>
            Nova
          </Button>
        </div>
      </div>

      {lastImportIds.length > 0 && (
        <div className="transaction-import-undo">
          <p>
            Importadas: {lastImportIds.length}{' '}
            {lastImportIds.length === 1 ? 'transação' : 'transações'}.
          </p>
          <Button variant="ghost" size="xs" onClick={handleUndoImport}>
            Desfazer importação
          </Button>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="operational-summary-grid grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            label: 'Receitas',
            value: summary.income,
            color: '#10b981',
            icon: <TrendingUp size={13} />,
          },
          {
            label: 'Despesas',
            value: summary.expenses,
            color: '#ef4444',
            icon: <TrendingDown size={13} />,
          },
          {
            label: 'Saldo',
            value: summary.balance,
            color: summary.balance >= 0 ? '#6366f1' : '#ef4444',
            icon: <ArrowLeftRight size={13} />,
          },
          {
            label: 'Poupança no período',
            value: summary.savings,
            color: '#6366f1',
            icon: <PiggyBank size={13} />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="operational-summary-card flex min-w-0 items-center gap-2 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-3"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: s.color + '18', color: s.color }}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[--text-tertiary] leading-none mb-0.5">{s.label}</p>
              <p
                className="break-words text-xs font-black tabular-nums [overflow-wrap:anywhere] min-[390px]:text-sm"
                style={{ color: s.color }}
              >
                {formatCurrency(s.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {categoryReviewQueue.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[--warning-border] bg-[--warning-bg] px-3 py-2.5">
          <div>
            <p className="text-xs font-bold text-[--warning-text]">
              {categoryReviewQueue.length}{' '}
              {categoryReviewQueue.length === 1
                ? 'classificação pode precisar de revisão'
                : 'classificações podem precisar de revisão'}
            </p>
            <p className="mt-0.5 text-[10px] text-[--warning-text]">
              Nenhuma categoria será alterada automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCategoryReviewOnly((value) => !value)
              setPage(1)
            }}
            aria-pressed={categoryReviewOnly}
            className="min-h-10 rounded-xl border border-[--warning-border] px-3 text-xs font-bold text-[--warning-text] hover:bg-[--bg-hover]"
          >
            {categoryReviewOnly ? 'Mostrar todas' : 'Revisar agora'}
          </button>
        </div>
      )}

      {/* Busca + filtros */}
      <div className="transaction-tools space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
              size={15}
            />
            <input
              type="text"
              placeholder="Buscar transação..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full bg-[--bg-surface] border border-[--border-default] rounded-2xl pl-9 pr-9 py-2.5 text-sm
                text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2
                focus:ring-[--brand-500] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] hover:text-[--text-secondary]"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortAsc((v) => !v)}
            className="p-2.5 rounded-2xl border border-[--border-default] bg-[--bg-surface] text-[--text-tertiary] hover:text-[--text-primary] hover:border-[--brand-500] transition-all"
            title={sortAsc ? 'Mais antigos primeiro' : 'Mais recentes primeiro'}
            aria-label={sortAsc ? 'Ordenar por mais recentes' : 'Ordenar por mais antigos'}
          >
            <ArrowUpDown size={15} />
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-sm font-medium transition-all
              ${
                showFilters || activeFilters > 0
                  ? 'bg-[--brand-600] text-white border-[--brand-600]'
                  : 'bg-[--bg-surface] border-[--border-default] text-[--text-secondary] hover:border-[--brand-500]'
              }`}
            aria-expanded={showFilters}
            aria-controls="transaction-filters"
            aria-label={`Filtros${activeFilters ? `, ${activeFilters} ativos` : ''}`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Presets de data */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {DATE_PRESETS.map((p) =>
            (() => {
              const presetRange = p.getRange()
              const isSelected =
                dateRange.from === presetRange.from && dateRange.to === presetRange.to
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    const r = p.getRange()
                    setDateRange(r)
                    setPage(1)
                  }}
                  aria-pressed={isSelected}
                  className={`min-h-11 text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[--brand-600] border-[--brand-600] text-white'
                      : 'bg-[--bg-surface] border-[--border-default] text-[--text-secondary] hover:border-[--brand-500] hover:text-[--text-brand]'
                  }`}
                >
                  {p.label}
                </button>
              )
            })(),
          )}
        </div>

        <TransactionSavedViews
          views={savedViews}
          canSave={savableFilterCount > 0}
          onApply={applySavedView}
          onSave={saveCurrentView}
          onDelete={deleteSavedView}
        />

        {activeFilterChips.length > 0 && (
          <div className="transaction-active-filters">
            <span className="transaction-active-filters__label">Filtros ativos</span>
            {activeFilterChips.map((filter) => (
              <button
                key={filter[0]}
                type="button"
                onClick={() => removeActiveFilter(filter[0])}
                className="transaction-active-filter"
                aria-label={`Remover filtro ${filter[1]}`}
              >
                <span>{filter[1]}</span>
                <X size={11} />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="transaction-active-filters__clear"
            >
              Limpar todos
            </button>
          </div>
        )}

        {/* Filtros expandíveis */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                id="transaction-filters"
                className="grid grid-cols-1 gap-2 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3 min-[420px]:grid-cols-2 sm:grid-cols-3"
              >
                {/* Tipo */}
                <div>
                  <label
                    htmlFor="transaction-type-filter"
                    className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1"
                  >
                    Tipo
                  </label>
                  <select
                    id="transaction-type-filter"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value)
                      setPage(1)
                    }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todos</option>
                    <option value="income">Receitas</option>
                    <option value="expense">Despesas</option>
                    <option value="transfer">Transferências</option>
                    <option value="savings">Aportes / reserva</option>
                  </select>
                </div>
                {/* Categoria */}
                <div>
                  <label
                    htmlFor="transaction-category-filter"
                    className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1"
                  >
                    Categoria
                  </label>
                  <select
                    id="transaction-category-filter"
                    value={catFilter}
                    onChange={(e) => {
                      setCatFilter(e.target.value)
                      setPage(1)
                    }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todas</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Pagamento */}
                <div>
                  <label
                    htmlFor="transaction-payment-filter"
                    className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1"
                  >
                    Forma de pagamento
                  </label>
                  <select
                    id="transaction-payment-filter"
                    value={payFilter}
                    onChange={(e) => {
                      setPayFilter(e.target.value)
                      setPage(1)
                    }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todos</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.icon} {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Status de pagamento */}
                <div>
                  <label
                    htmlFor="transaction-payment-status-filter"
                    className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1"
                  >
                    Status
                  </label>
                  <select
                    id="transaction-payment-status-filter"
                    value={paymentStatusFilter}
                    onChange={(e) => {
                      setPaymentStatusFilter(e.target.value)
                      setPage(1)
                    }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todos</option>
                    <option value="unknown">A revisar</option>
                    <option value="to_pay">A pagar</option>
                    <option value="pending">Pendentes</option>
                    <option value="partial">Parciais</option>
                    <option value="overdue">Atrasadas</option>
                    <option value="paid">Pagas</option>
                    <option value="cancelled">Canceladas</option>
                  </select>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-1 gap-2 min-[420px]:col-span-2 min-[420px]:grid-cols-2">
                  <div>
                    <label
                      htmlFor="transaction-date-from"
                      className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1"
                    >
                      De
                    </label>
                    <input
                      id="transaction-date-from"
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => {
                        const from = e.target.value
                        setDateRange({ from, to: defaultDateRangeEnd(from) })
                        setPage(1)
                      }}
                      className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="transaction-date-to"
                      className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1"
                    >
                      Até
                    </label>
                    <input
                      id="transaction-date-to"
                      type="date"
                      value={dateRange.to}
                      min={dateRange.from || undefined}
                      onChange={(e) => {
                        setDateRange((r) => ({ ...r, to: e.target.value }))
                        setPage(1)
                      }}
                      className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                    />
                  </div>
                </div>
                <div className="flex items-end justify-end sm:col-span-1">
                  <button
                    onClick={clearFilters}
                    className="min-h-11 px-2 text-xs text-[--text-tertiary] hover:text-[--danger-text] transition-colors"
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(bulkPaymentCandidates.length > 0 || lastPaymentOperation) && (
        <div className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[--text-primary]">Ações de pagamento em massa</p>
              <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                Selecione despesas manuais. Compras vinculadas a cartões continuam sendo controladas
                pela fatura.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {bulkPaymentCandidates.length > 0 && (
                <button
                  type="button"
                  disabled={bulkPaymentUpdating}
                  onClick={selectVisiblePayments}
                  className="min-h-10 rounded-xl border border-[--border-default] px-3 text-xs font-semibold text-[--text-secondary] hover:border-[--brand-500] disabled:opacity-50"
                >
                  Selecionar visíveis ({bulkPaymentCandidates.length})
                </button>
              )}

              {lastPaymentOperation && (
                <button
                  type="button"
                  disabled={bulkPaymentUpdating}
                  onClick={handleUndoPaymentOperation}
                  className="min-h-10 rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 text-xs font-bold text-[--warning-text] disabled:opacity-50"
                >
                  Desfazer última ação
                </button>
              )}
            </div>
          </div>

          {paymentStatusFilter === PAYMENT_STATUS.UNKNOWN && bulkPaymentCandidates.length > 0 && (
            <p className="mt-2 rounded-xl bg-[--warning-bg] px-3 py-2 text-[10px] text-[--warning-text]">
              Revisão de legado: nada é convertido automaticamente. Selecione somente os itens que
              você confirmou.
            </p>
          )}

          {selectedPaymentTransactions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[--border-subtle] pt-3">
              <span className="text-xs font-bold text-[--text-primary]">
                {selectedPaymentTransactions.length}{' '}
                {selectedPaymentTransactions.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>

              <button
                type="button"
                disabled={bulkPaymentUpdating}
                onClick={() => handleBulkPaymentStatus(PAYMENT_STATUS.PAID)}
                className="min-h-10 rounded-xl border border-[--success-border] bg-[--success-bg] px-3 text-xs font-bold text-[--success-text] disabled:opacity-50"
              >
                Marcar como pagas
              </button>

              <button
                type="button"
                disabled={bulkPaymentUpdating}
                onClick={() => handleBulkPaymentStatus(PAYMENT_STATUS.PENDING)}
                className="min-h-10 rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 text-xs font-bold text-[--warning-text] disabled:opacity-50"
              >
                Marcar como pendentes
              </button>

              <button
                type="button"
                disabled={bulkPaymentUpdating}
                onClick={() => setSelectedPaymentIds(new Set())}
                className="min-h-10 px-2 text-xs text-[--text-tertiary] hover:text-[--text-primary]"
              >
                Limpar seleção
              </button>
            </div>
          )}

          <p className="mt-2 text-[10px] text-[--text-tertiary]">
            Ações em massa ficam registradas no histórico da transação. A última ação pode ser
            desfeita nesta tela.
          </p>
        </div>
      )}

      <p className="px-1 text-[10px] text-[--text-tertiary]">
        Lista agrupada pela data da movimentação. Vencimento e pagamento aparecem separadamente
        quando informados.
      </p>

      {/* Lista agrupada por data */}
      <div className="transaction-list-surface overflow-hidden rounded-2xl border border-[--border-default] bg-[--bg-surface]">
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ArrowLeftRight />}
              title="Nenhuma transação"
              description={
                activeFilters > 0 ? 'Tente ajustar os filtros.' : 'Adicione sua primeira transação.'
              }
              action={
                <Button variant="primary" icon={<Plus />} size="sm" onClick={handleNew}>
                  Adicionar
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <AnimatePresence>
              {grouped.map(([date, txs]) => {
                const daily = summarizeTransactions(txs)
                return (
                  <div key={date}>
                    <div className="transaction-date-header">
                      <p className="transaction-date-label">{dateLabel(date)}</p>
                      <div className="transaction-date-totals">
                        {daily.income > 0 && (
                          <span className="transaction-date-total" data-kind="income">
                            +{formatCurrency(daily.income)}
                          </span>
                        )}
                        {daily.expenses > 0 && (
                          <span className="transaction-date-total" data-kind="expense">
                            −{formatCurrency(daily.expenses)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-[--border-subtle]">
                      {txs.map((tx) => (
                        <TxRow
                          key={tx.id}
                          tx={tx}
                          cat={categories.find((category) => category.id === tx.categoryId)}
                          onEdit={handleEdit}
                          onDelete={handleDeleteRequest}
                          onTogglePayment={handleTogglePayment}
                          paymentUpdating={paymentUpdatingIds.has(tx.id)}
                          paymentState={getTransactionPaymentState(tx, paymentStatusIndex)}
                          paymentSelected={selectedPaymentIds.has(tx.id)}
                          onPaymentSelect={togglePaymentSelection}
                          categoryReview={categoryReviewIndex.get(tx.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </AnimatePresence>

            {hasMore && (
              <div className="p-4 text-center border-t border-[--border-subtle]">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="flex items-center gap-1.5 mx-auto text-sm text-[--text-brand] hover:underline font-medium"
                >
                  <ChevronDown size={14} />
                  Carregar mais ({filtered.length - page * PER_PAGE} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB mobile */}
      <button
        onClick={handleNew}
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[--brand-600] lg:hidden
          text-white shadow-lg flex items-center justify-center hover:bg-[--brand-700]
          active:scale-95 transition-all"
        aria-label="Adicionar nova transação"
      >
        <Plus size={24} />
      </button>

      <TransactionForm isOpen={modalOpen} onClose={handleClose} transaction={editingTx} />

      <TransactionSeriesModal
        isOpen={Boolean(seriesAction)}
        mode={seriesAction?.mode}
        transaction={seriesAction?.transaction}
        transactions={transactions}
        categories={categories}
        onApply={applyTransactionSeriesOperation}
        onClose={() => setSeriesAction(null)}
      />

      {/* Modal confirmar exclusão */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir transação"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        }
      >
        <p className="text-[--text-secondary] text-sm">
          Tem certeza? Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <TransactionCsvImportModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        categories={categories}
        existingTransactions={transactions}
        onImport={handleCsvImport}
      />
    </div>
  )
}
