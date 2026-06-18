// src/components/TransactionList.jsx
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Download, Upload, Edit2, Trash2,
  ArrowUpCircle, ArrowDownCircle, X, FileText, ArrowLeftRight
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, EmptyState, Modal } from './ui'
import TransactionForm from './TransactionForm'
import { formatCurrency, formatDate, getPaymentLabel, exportToCSV, exportToPDF, parseCSVImport } from '../utils'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'

const DATE_PRESETS = [
  { label: 'Este mês', getRange: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Mês passado', getRange: () => ({ from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }) },
  { label: 'Próximo mês', getRange: () => {
      const next = addMonths(new Date(), 1)
      return { from: format(startOfMonth(next), 'yyyy-MM-dd'), to: format(endOfMonth(next), 'yyyy-MM-dd') }
    }
  },
  { label: 'Últimos 3 meses', getRange: () => ({ from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Este ano', getRange: () => ({ from: `${new Date().getFullYear()}-01-01`, to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Todos', getRange: () => ({ from: '', to: '' }) },
]

export default function TransactionList() {
  const { transactions, categories, removeTransaction, createTransaction, showNotification } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })
  const [showFilters, setShowFilters] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) return false
      if (dateRange.from && tx.date < dateRange.from) return false
      if (dateRange.to && tx.date > dateRange.to) return false
      if (search) {
        const q = search.toLowerCase()
        const matches =
          tx.description?.toLowerCase().includes(q) ||
          tx.categoryName?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q) ||
          tx.amount.toString().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [transactions, typeFilter, categoryFilter, paymentFilter, dateRange, search])

  const summary = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses }
  }, [filtered])

  const paginated = filtered.slice(0, page * PER_PAGE)
  const hasMore = filtered.length > paginated.length

  const handleEdit = (tx) => { setEditingTx(tx); setModalOpen(true) }
  const handleNew = () => { setEditingTx(null); setModalOpen(true) }
  const handleClose = () => { setModalOpen(false); setEditingTx(null) }
  const handleDelete = async () => {
    if (!deleteConfirm) return
    await removeTransaction(deleteConfirm)
    setDeleteConfirm(null)
  }

  const applyPreset = (preset) => {
    setDateRange(preset.getRange())
    setPage(1)
  }

  const handleExportCSV = () => exportToCSV(filtered, categories)
  const handleExportPDF = async () => {
    await exportToPDF(filtered, categories, summary)
  }

  const handleImport = async () => {
    const txs = parseCSVImport(importText)
    if (!txs.length) {
      showNotification('Nenhuma transação encontrada no arquivo.', 'warning')
      return
    }
    for (const tx of txs) {
      const cat = categories.find(c => c.name.toLowerCase() === tx.categoryName?.toLowerCase())
      const data = {
        ...tx,
        categoryId: cat?.id || '',
        categoryName: cat?.name || tx.categoryName || '',
        categoryColor: cat?.color || '',
        categoryIcon: cat?.icon || '',
      }
      await createTransaction(data)
    }
    setImportModal(false)
    setImportText('')
    showNotification(`${txs.length} transações importadas!`)
  }

  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
    setPaymentFilter('all')
    setDateRange({ from: '', to: '' })
    setSearch('')
    setPage(1)
  }

  const activeFilters = [typeFilter !== 'all', categoryFilter !== 'all', paymentFilter !== 'all', !!dateRange.from, !!search].filter(Boolean).length

  return (
    <div className="space-y-4 pb-28 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Transações</h1>
          <p className="text-sm text-[--text-tertiary]">{filtered.length} transações encontradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Upload />} onClick={() => setImportModal(true)}>Importar</Button>
          <Button variant="secondary" size="sm" icon={<Download />} onClick={handleExportCSV}>CSV</Button>
          <Button variant="secondary" size="sm" icon={<FileText />} onClick={handleExportPDF}>PDF</Button>
          <Button variant="primary" size="sm" icon={<Plus />} onClick={handleNew}>Nova</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Receitas', value: summary.income, color: '#10b981' },
          { label: 'Despesas', value: summary.expenses, color: '#ef4444' },
          { label: 'Saldo', value: summary.balance, color: summary.balance >= 0 ? '#6366f1' : '#ef4444' },
        ].map(s => (
          <div key={s.label} className="bg-[--bg-surface] border border-[--border-default] rounded-xl p-3">
            <p className="text-xs text-[--text-tertiary] mb-1">{s.label}</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: s.color }}>
              {formatCurrency(s.value, { compact: true })}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]" size={16} />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all hover:border-[--border-strong]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] hover:text-[--text-secondary]">
                <X size={14} />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            size="sm"
            icon={<Filter />}
            onClick={() => setShowFilters(v => !v)}
          >
            Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {DATE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-all duration-150 bg-[--bg-surface] border-[--border-default] text-[--text-secondary] hover:border-[--brand-500] hover:text-[--text-brand]"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[--bg-subtle] rounded-xl border border-[--border-subtle]">
                <div>
                  <label className="text-xs font-medium text-[--text-tertiary] block mb-1.5">Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todos</option>
                    <option value="income">Receitas</option>
                    <option value="expense">Despesas</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--text-tertiary] block mb-1.5">Categoria</label>
                  <select
                    value={categoryFilter}
                    onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todas categorias</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--text-tertiary] block mb-1.5">Método de pagamento</label>
                  <select
                    value={paymentFilter}
                    onChange={e => { setPaymentFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                  >
                    <option value="all">Todos os métodos</option>
                    <option value="pix">💸 Pix</option>
                    <option value="credit_card">💳 Cartão de crédito</option>
                    <option value="debit_card">🏧 Cartão de débito</option>
                    <option value="cash">💵 Dinheiro</option>
                    <option value="transfer">🏦 Transferência</option>
                    <option value="boleto">📄 Boleto</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-[--text-tertiary] block mb-1.5">De</label>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={e => { setDateRange(r => ({ ...r, from: e.target.value })); setPage(1) }}
                      className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--text-tertiary] block mb-1.5">Até</label>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={e => { setDateRange(r => ({ ...r, to: e.target.value })); setPage(1) }}
                      className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-2 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                    />
                  </div>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<ArrowLeftRight />}
              title="Nenhuma transação"
              description={search || activeFilters > 0 ? 'Tente ajustar os filtros.' : 'Adicione sua primeira transação.'}
              action={
                <Button variant="primary" icon={<Plus />} size="sm" onClick={handleNew}>
                  Adicionar transação
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-[--border-subtle]">
              <AnimatePresence>
                {paginated.map((tx, i) => {
                  const cat = categories.find(c => c.id === tx.categoryId)
                  const isIncome = tx.type === 'income'
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[--bg-hover] transition-colors group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: (cat?.color || '#6366f1') + '20' }}
                      >
                        {cat?.icon || (isIncome ? '💰' : '💸')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[--text-primary] truncate">
                          {tx.description || cat?.name || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[--text-tertiary]">{formatDate(tx.date)}</span>
                          {cat && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                              background: (cat.color || '#6366f1') + '15',
                              color: cat.color || '#6366f1',
                            }}>
                              {cat.icon} {cat.name}
                            </span>
                          )}
                          {tx.paymentMethod && (
                            <span className="text-xs text-[--text-tertiary] hidden sm:inline">
                              · {getPaymentLabel(tx.paymentMethod)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold tabular-nums ${isIncome ? 'text-[--success-icon]' : 'text-[--danger-icon]'}`}>
                          {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(tx)}
                            className="p-1.5 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] hover:text-[--text-brand] transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            {hasMore && (
              <div className="p-4 text-center border-t border-[--border-subtle]">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)}>
                  Carregar mais ({filtered.length - paginated.length} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <TransactionForm isOpen={modalOpen} onClose={handleClose} transaction={editingTx} />

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir transação"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" fullWidth onClick={handleDelete}>Excluir</Button>
          </div>
        }
      >
        <p className="text-[--text-secondary]">Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        title="Importar transações"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setImportModal(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={handleImport}>Importar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[--text-secondary]">
            Cole o conteúdo do CSV abaixo. O formato deve ser: <br />
            <code className="text-xs bg-[--bg-hover] px-2 py-0.5 rounded font-mono">Data;Tipo;Descrição;Categoria;Valor;Pagamento</code>
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const csv = 'Data;Tipo;Descrição;Categoria;Valor;Pagamento\n01/01/2025;Despesa;Almoço;Alimentação;25,90;Pix\n05/01/2025;Receita;Salário;Salário;5000,00;Transferência'
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'template.csv'; a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Baixar template
          </Button>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={8}
            placeholder="Cole o conteúdo do CSV aqui..."
            className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl p-3 text-sm font-mono text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] resize-none"
          />
        </div>
      </Modal>
    </div>
  )
}
