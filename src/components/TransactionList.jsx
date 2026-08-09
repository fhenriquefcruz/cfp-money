// src/components/TransactionList.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
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
import { useApp } from '../contexts/AppContext'
import { Button, EmptyState, Modal } from './ui'
import TransactionForm from './TransactionForm'
import TransactionSeriesModal from './TransactionSeriesModal'
import {
  formatCurrency,
  getPaymentLabel,
  exportToCSV,
  exportToPDF,
  parseCSVImport,
  PAYMENT_METHODS,
} from '../utils'
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { defaultDateRangeEnd } from '../domain/finance'
import { getTransactionDateContext } from '../domain/transactionDates'
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

const DATE_PRESETS = [
  {
    label: 'Este mês',
    getRange: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Mês passado',
    getRange: () => ({
      from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    }),
  },
  {
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
    label: 'Últimos 3 meses',
    getRange: () => ({
      from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Este ano',
    getRange: () => ({
      from: `${new Date().getFullYear()}-01-01`,
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  { label: 'Todos', getRange: () => ({ from: '', to: '' }) },
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
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
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
}) {
  const isIncome = tx.type === 'income' && !tx.isSavings
  const isSavings = tx.isSavings
  const dateContext = getTransactionDateContext(tx)
  const protectedGroup = isTransactionSeries(tx)
  const payableExpense = isPayableExpense(tx)
  const structuredCredit = isStructuredCreditTransaction(tx)
  const toggleablePayment = canToggleTransactionPayment(tx)
  const paid = paymentState.status === PAYMENT_STATUS.PAID
  const cancelled = paymentState.status === PAYMENT_STATUS.CANCELLED
  const manualPresentation = manualPaymentPresentation(paymentState.status)
  const invoicePresentation = invoicePaymentPresentation(paymentState)
  const createdAt = tx.createdAt?.toDate?.() || (tx.createdAt ? new Date(tx.createdAt) : null)
  const createdAtLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? format(createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="transaction-row group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-3 py-3.5 transition-colors hover:bg-[--bg-hover] sm:flex sm:items-center sm:px-4"
    >
      {/* Ícone */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
        style={{
          background: isSavings ? '#6366f115' : (cat?.color || '#6366f1') + '18',
        }}
      >
        {isSavings ? '🐷' : cat?.icon || (isIncome ? '💰' : '💸')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="max-w-full truncate text-sm font-semibold text-[--text-primary] sm:max-w-[200px]">
            {tx.description || (isSavings ? 'Poupança' : cat?.name) || 'Sem descrição'}
          </p>
          {tx.isInstallment && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[--brand-100] text-[--brand-700] flex-shrink-0">
              {tx.installmentNum}/{tx.installmentOf}x
            </span>
          )}
          {tx.isRecurring && !tx.isInstallment && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[--bg-hover] text-[--text-tertiary] flex-shrink-0">
              Fixo
            </span>
          )}
          {isSavings && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[--brand-100] text-[--brand-800] flex-shrink-0">
              Poupança
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {cat && !isSavings && tx.description !== cat.name && (
            <span
              className="flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: (cat.color || '#6366f1') + '15',
                borderColor: (cat.color || '#6366f1') + '45',
                color: 'var(--text-secondary)',
              }}
            >
              {cat.icon} {cat.name}
            </span>
          )}
          {tx.paymentMethod && !isSavings && (
            <span className="text-[10px] text-[--text-tertiary] hidden sm:inline">
              {PAYMENT_METHODS.find((m) => m.id === tx.paymentMethod)?.icon}{' '}
              {getPaymentLabel(tx.paymentMethod)}
            </span>
          )}
          {dateContext.hasSeparateAccountingDate && (
            <span
              className="text-[10px] font-medium text-[--brand-600]"
              title="A lista é agrupada pela competência da fatura"
            >
              Compra: {dateContext.purchaseLabel} · fatura: {dateContext.accountingLabel}
            </span>
          )}
          {protectedGroup && (
            <span className="text-[10px] text-[--warning-text]">Série gerenciável</span>
          )}
          {tx.notes && (
            <span
              className="text-[10px] text-[--text-tertiary] truncate max-w-[120px]"
              title={tx.notes}
            >
              💬 {tx.notes}
            </span>
          )}
          {payableExpense && !structuredCredit && tx.dueDate && (
            <span className="text-[10px] font-medium text-[--text-secondary]">
              Vence: {tx.dueDate.split('-').reverse().join('/')}
            </span>
          )}

          {payableExpense && toggleablePayment && (
            <label
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-[--border-default] bg-[--bg-surface] px-2.5 text-[10px] font-semibold text-[--text-secondary]"
              title="Selecionar para ação em massa"
            >
              <input
                type="checkbox"
                checked={Boolean(paymentSelected)}
                onChange={() => onPaymentSelect(tx)}
                className="h-4 w-4 rounded accent-[--brand-600]"
              />
              <span>Selecionar</span>
            </label>
          )}

          {payableExpense && toggleablePayment && (
            <button
              type="button"
              onClick={() => onTogglePayment(tx)}
              disabled={paymentUpdating}
              aria-pressed={paid}
              aria-label={`${paid ? 'Marcar como pendente' : 'Marcar como paga'}: ${tx.description || cat?.name || 'despesa'}`}
              className={`inline-flex min-h-10 items-center gap-1 rounded-full border px-2.5 text-[10px] font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${manualPresentation.className}`}
            >
              {paid ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
              {paymentUpdating ? 'Salvando…' : manualPresentation.label}
            </button>
          )}

          {payableExpense && structuredCredit && !toggleablePayment && (
            <Link
              to="/cards"
              aria-label={`Abrir fatura de ${tx.cardName || 'cartão'}`}
              className={`inline-flex min-h-10 items-center gap-1 rounded-full border px-2.5 text-[10px] font-bold transition-colors ${invoicePresentation.className}`}
            >
              {paid ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
              {invoicePresentation.label}
            </Link>
          )}

          {payableExpense && cancelled && !structuredCredit && (
            <span className="inline-flex min-h-10 items-center rounded-full border border-[--border-default] bg-[--bg-hover] px-2.5 text-[10px] font-bold text-[--text-tertiary]">
              Cancelada
            </span>
          )}
          <span
            className="text-[10px] text-[--text-secondary]"
            title={
              createdAtLabel ? 'Cadastrada em ' + createdAtLabel : 'Data de cadastro indisponível'
            }
          >
            Cadastro: {createdAtLabel || 'indisponível'}
          </span>
        </div>
      </div>

      {/* Valor + ações */}
      <div className="transaction-row__aside col-start-2 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:ml-auto sm:flex-shrink-0 sm:flex-nowrap">
        <span
          className={`min-w-0 break-words text-sm font-bold tabular-nums [overflow-wrap:anywhere] ${
            isSavings
              ? 'text-[--brand-800]'
              : isIncome
                ? 'text-[--success-icon]'
                : 'text-[--danger-icon]'
          }`}
        >
          {isSavings ? '' : isIncome ? '+' : '−'}
          {formatCurrency(tx.amount)}
        </span>
        <div className="flex flex-shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            onClick={() => onEdit(tx)}
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl hover:bg-[--bg-elevated] text-[--text-tertiary] hover:text-[--text-brand] transition-colors"
            aria-label={`Editar transação ${tx.description || cat?.name || ''}`.trim()}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(tx)}
            className="w-11 h-11 inline-flex items-center justify-center rounded-xl hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors"
            aria-label={`Excluir transação ${tx.description || cat?.name || ''}`.trim()}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function TransactionList() {
  const {
    transactions,
    categories,
    creditCards,
    invoiceEvents,
    removeTransaction,
    createTransaction,
    showNotification,
    applyTransactionSeriesOperation,
    setTransactionPaymentStatus,
    commitPaymentStatusOperation,
  } = useApp()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [payFilter, setPayFilter] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState(getCurrentMonthRange)
  const [showFilters, setShowFilters] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [seriesAction, setSeriesAction] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importText, setImportText] = useState('')
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

  const filtered = useMemo(() => {
    let txs = transactions.filter((tx) => {
      if (typeFilter === 'savings' && !tx.isSavings) return false
      if (typeFilter === 'income' && (tx.type !== 'income' || tx.isSavings)) return false
      if (typeFilter === 'expense' && tx.type !== 'expense') return false
      if (catFilter !== 'all' && tx.categoryId !== catFilter) return false
      if (payFilter !== 'all' && tx.paymentMethod !== payFilter) return false

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

      if (dateRange.from && tx.date < dateRange.from) return false
      if (dateRange.to && tx.date > dateRange.to) return false
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
    txs.sort((a, b) => (sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)))
    return txs
  }, [
    transactions,
    typeFilter,
    catFilter,
    payFilter,
    paymentStatusFilter,
    paymentStatusIndex,
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
  }, [typeFilter, catFilter, payFilter, paymentStatusFilter, dateRange.from, dateRange.to, search])

  const summary = useMemo(() => {
    const income = filtered
      .filter((t) => t.type === 'income' && !t.isSavings)
      .reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savings = filtered.filter((t) => t.isSavings).reduce((s, t) => s + t.amount, 0)
    return { income, expenses, savings, balance: income - expenses }
  }, [filtered])

  const grouped = useMemo(() => groupByDate(filtered.slice(0, page * PER_PAGE)), [filtered, page])
  const hasMore = filtered.length > page * PER_PAGE
  const currentMonthRange = getCurrentMonthRange()
  const hasCustomDateRange =
    dateRange.from !== currentMonthRange.from || dateRange.to !== currentMonthRange.to
  const activeFilters = [
    typeFilter !== 'all',
    catFilter !== 'all',
    payFilter !== 'all',
    paymentStatusFilter !== 'all',
    hasCustomDateRange,
    !!search,
  ].filter(Boolean).length

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
    setDateRange({ from: '', to: '' })
    setSearch('')
    setPage(1)
  }

  const handleImport = async () => {
    const txs = parseCSVImport(importText)
    if (!txs.length) {
      showNotification('Nenhuma transação no CSV.', 'warning')
      return
    }
    for (const tx of txs) {
      const cat = categories.find((c) => c.name.toLowerCase() === tx.categoryName?.toLowerCase())
      await createTransaction({
        ...tx,
        categoryId: cat?.id || '',
        categoryName: cat?.name || tx.categoryName || '',
        categoryColor: cat?.color || '',
        categoryIcon: cat?.icon || '',
      })
    }
    setImportModal(false)
    setImportText('')
    showNotification(`${txs.length} transações importadas!`)
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
    <div className="operational-page transactions-premium mx-auto min-w-0 max-w-[1600px] space-y-4 pb-28 lg:pb-6">
      {/* Header */}
      <div className="operational-page__header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Transações</h1>
          <p className="text-xs text-[--text-tertiary] mt-0.5">{filtered.length} encontradas</p>
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
            label: 'Poupança',
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
                    <option value="savings">Poupança</option>
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
                Selecione despesas manuais. Cartões continuam sendo controlados pela fatura.
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
              {grouped.map(([date, txs]) => (
                <div key={date}>
                  {/* Cabeçalho do grupo */}
                  <div className="transaction-date-header flex flex-wrap items-center justify-between gap-2 border-b border-[--border-subtle] bg-[--bg-subtle] px-4 py-2">
                    <p className="text-xs font-bold text-[--text-secondary]">{dateLabel(date)}</p>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      {txs.some((t) => t.type === 'income' && !t.isSavings) && (
                        <span className="text-[--success-icon] font-semibold">
                          +
                          {formatCurrency(
                            txs
                              .filter((t) => t.type === 'income' && !t.isSavings)
                              .reduce((s, t) => s + t.amount, 0),
                          )}
                        </span>
                      )}
                      {txs.some((t) => t.type === 'expense') && (
                        <span className="text-[--danger-icon] font-semibold">
                          −
                          {formatCurrency(
                            txs
                              .filter((t) => t.type === 'expense')
                              .reduce((s, t) => s + t.amount, 0),
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Transações do dia */}
                  <div className="divide-y divide-[--border-subtle]">
                    {txs.map((tx) => (
                      <TxRow
                        key={tx.id}
                        tx={tx}
                        cat={categories.find((c) => c.id === tx.categoryId)}
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                        onTogglePayment={handleTogglePayment}
                        paymentUpdating={paymentUpdatingIds.has(tx.id)}
                        paymentState={getTransactionPaymentState(tx, paymentStatusIndex)}
                        paymentSelected={selectedPaymentIds.has(tx.id)}
                        onPaymentSelect={togglePaymentSelection}
                      />
                    ))}
                  </div>
                </div>
              ))}
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

      {/* Modal importar */}
      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Importar CSV"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setImportModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleImport}>
              Importar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[--text-secondary]">
            Formato:{' '}
            <code className="text-xs bg-[--bg-hover] px-2 py-0.5 rounded font-mono">
              Data;Tipo;Descrição;Categoria;Valor;Pagamento
            </code>
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const csv =
                'Data;Tipo;Descrição;Categoria;Valor;Pagamento\n01/01/2025;Despesa;Almoço;Alimentação;25,90;pix\n05/01/2025;Receita;Salário;Salário;5000,00;transfer'
              const a = document.createElement('a')
              a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
              a.download = 'template.csv'
              a.click()
            }}
          >
            Baixar template
          </Button>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder="Cole o conteúdo do CSV aqui..."
            className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl p-3 text-sm
              font-mono text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none
              focus:ring-2 focus:ring-[--brand-500] resize-none"
          />
        </div>
      </Modal>
    </div>
  )
}
