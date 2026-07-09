// src/components/TransactionList.jsx
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Download, Upload, Edit2, Trash2,
  X, FileText, ArrowLeftRight, PiggyBank, ChevronDown,
  TrendingUp, TrendingDown, ArrowUpDown
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, EmptyState, Modal, Badge } from './ui'
import TransactionForm from './TransactionForm'
import {
  formatCurrency, formatDate, getPaymentLabel,
  exportToCSV, exportToPDF, parseCSVImport, PAYMENT_METHODS
} from '../utils'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DATE_PRESETS = [
  { label: 'Este mês',      getRange: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Mês passado',   getRange: () => ({ from: format(startOfMonth(subMonths(new Date(),1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(),1)), 'yyyy-MM-dd') }) },
  { label: 'Últimos 3 meses', getRange: () => ({ from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Este ano',      getRange: () => ({ from: `${new Date().getFullYear()}-01-01`, to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Todos',         getRange: () => ({ from: '', to: '' }) },
]

// Agrupa transações por data
function groupByDate(txs) {
  const groups = {}
  txs.forEach(tx => {
    if (!groups[tx.date]) groups[tx.date] = []
    groups[tx.date].push(tx)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function TxRow({ tx, cat, onEdit, onDelete }) {
  const isIncome  = tx.type === 'income' && !tx.isSavings
  const isSavings = tx.isSavings
  const isExpense = tx.type === 'expense'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[--bg-hover] transition-colors group cursor-default"
    >
      {/* Ícone */}
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: isSavings ? '#6366f115' : (cat?.color || '#6366f1') + '18' }}>
        {isSavings ? '🐷' : cat?.icon || (isIncome ? '💰' : '💸')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-[--text-primary] truncate max-w-[200px]">
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
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[--brand-100] text-[--brand-700] flex-shrink-0">
              Poupança
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {cat && !isSavings && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: (cat.color || '#6366f1') + '15', color: cat.color || '#6366f1' }}>
              {cat.icon} {cat.name}
            </span>
          )}
          {tx.paymentMethod && !isSavings && (
            <span className="text-[10px] text-[--text-tertiary] hidden sm:inline">
              {PAYMENT_METHODS.find(m => m.id === tx.paymentMethod)?.icon} {getPaymentLabel(tx.paymentMethod)}
            </span>
          )}
          {tx.notes && (
            <span className="text-[10px] text-[--text-tertiary] truncate max-w-[120px]" title={tx.notes}>
              💬 {tx.notes}
            </span>
          )}
        </div>
      </div>

      {/* Valor + ações */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-bold tabular-nums ${
          isSavings ? 'text-[--brand-500]'
          : isIncome ? 'text-[--success-icon]'
          : 'text-[--danger-icon]'
        }`}>
          {isSavings ? '' : isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
          <button onClick={() => onEdit(tx)}
            className="p-1.5 rounded-lg hover:bg-[--bg-elevated] text-[--text-tertiary] hover:text-[--text-brand] transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(tx.id)}
            className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function TransactionList() {
  const { transactions, categories, removeTransaction, createTransaction, showNotification } = useApp()

  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('all')
  const [catFilter, setCatFilter]     = useState('all')
  const [payFilter, setPayFilter]     = useState('all')
  const [dateRange, setDateRange]     = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to:   format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [showFilters, setShowFilters] = useState(false)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingTx, setEditingTx]     = useState(null)
  const [deleteId, setDeleteId]       = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importText, setImportText]   = useState('')
  const [page, setPage]               = useState(1)
  const [sortAsc, setSortAsc]         = useState(false)
  const PER_PAGE = 30

  const filtered = useMemo(() => {
    let txs = transactions.filter(tx => {
      if (typeFilter === 'savings' && !tx.isSavings) return false
      if (typeFilter === 'income'  && (tx.type !== 'income'  || tx.isSavings)) return false
      if (typeFilter === 'expense' && tx.type !== 'expense') return false
      if (catFilter !== 'all' && tx.categoryId !== catFilter) return false
      if (payFilter !== 'all' && tx.paymentMethod !== payFilter) return false
      if (dateRange.from && tx.date < dateRange.from) return false
      if (dateRange.to   && tx.date > dateRange.to)   return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !tx.description?.toLowerCase().includes(q) &&
          !tx.categoryName?.toLowerCase().includes(q) &&
          !tx.notes?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    txs.sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
    return txs
  }, [transactions, typeFilter, catFilter, payFilter, dateRange, search, sortAsc])

  const summary = useMemo(() => {
    const income   = filtered.filter(t => t.type === 'income'  && !t.isSavings).reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savings  = filtered.filter(t => t.isSavings).reduce((s, t) => s + t.amount, 0)
    return { income, expenses, savings, balance: income - expenses }
  }, [filtered])

  const grouped   = useMemo(() => groupByDate(filtered.slice(0, page * PER_PAGE)), [filtered, page])
  const hasMore   = filtered.length > page * PER_PAGE
  const activeFilters = [typeFilter !== 'all', catFilter !== 'all', payFilter !== 'all', !!dateRange.from, !!search].filter(Boolean).length

  const handleEdit  = (tx)  => { setEditingTx(tx); setModalOpen(true) }
  const handleNew   = ()     => { setEditingTx(null); setModalOpen(true) }
  const handleClose = ()     => { setModalOpen(false); setEditingTx(null) }
  const handleDelete = async () => {
    if (!deleteId) return
    await removeTransaction(deleteId)
    setDeleteId(null)
  }
  const clearFilters = () => {
    setTypeFilter('all'); setCatFilter('all'); setPayFilter('all')
    setDateRange({ from: '', to: '' }); setSearch(''); setPage(1)
  }

  const handleImport = async () => {
    const txs = parseCSVImport(importText)
    if (!txs.length) { showNotification('Nenhuma transação no CSV.', 'warning'); return }
    for (const tx of txs) {
      const cat = categories.find(c => c.name.toLowerCase() === tx.categoryName?.toLowerCase())
      await createTransaction({ ...tx, categoryId: cat?.id || '', categoryName: cat?.name || tx.categoryName || '', categoryColor: cat?.color || '', categoryIcon: cat?.icon || '' })
    }
    setImportModal(false); setImportText('')
    showNotification(`${txs.length} transações importadas!`)
  }

  const dateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hoje'
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
    return format(d, "d 'de' MMMM", { locale: ptBR })
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Transações</h1>
          <p className="text-xs text-[--text-tertiary] mt-0.5">{filtered.length} encontradas</p>
        </div>
        {/* Ações — mobile: só botão Nova */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-2">
            <Button variant="ghost" size="sm" icon={<Upload size={14} />} onClick={() => setImportModal(true)}>Importar</Button>
            <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportToCSV(filtered, categories)}>CSV</Button>
            <Button variant="ghost" size="sm" icon={<FileText size={14} />} onClick={() => exportToPDF(filtered, categories, summary)}>PDF</Button>
          </div>
          <Button variant="primary" size="sm" icon={<Plus />} onClick={handleNew}>Nova</Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Receitas',  value: summary.income,   color: '#10b981', icon: <TrendingUp size={13} /> },
          { label: 'Despesas',  value: summary.expenses, color: '#ef4444', icon: <TrendingDown size={13} /> },
          { label: 'Saldo',     value: summary.balance,  color: summary.balance >= 0 ? '#6366f1' : '#ef4444', icon: <ArrowLeftRight size={13} /> },
          { label: 'Poupança',  value: summary.savings,  color: '#6366f1', icon: <PiggyBank size={13} /> },
        ].map(s => (
          <div key={s.label} className="bg-[--bg-surface] border border-[--border-default] rounded-2xl p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: s.color + '18', color: s.color }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[--text-tertiary] leading-none mb-0.5">{s.label}</p>
              <p className="text-sm font-black tabular-nums truncate" style={{ color: s.color }}>
                {formatCurrency(s.value, { compact: true })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Busca + filtros */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]" size={15} />
            <input type="text" placeholder="Buscar transação..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full bg-[--bg-surface] border border-[--border-default] rounded-2xl pl-9 pr-9 py-2.5 text-sm
                text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2
                focus:ring-[--brand-500] transition-all" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] hover:text-[--text-secondary]">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortAsc(v => !v)}
            className="p-2.5 rounded-2xl border border-[--border-default] bg-[--bg-surface] text-[--text-tertiary] hover:text-[--text-primary] hover:border-[--brand-500] transition-all"
            title={sortAsc ? 'Mais antigos primeiro' : 'Mais recentes primeiro'}>
            <ArrowUpDown size={15} />
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-sm font-medium transition-all
              ${showFilters || activeFilters > 0
                ? 'bg-[--brand-600] text-white border-[--brand-600]'
                : 'bg-[--bg-surface] border-[--border-default] text-[--text-secondary] hover:border-[--brand-500]'}`}>
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
          {DATE_PRESETS.map(p => (
            <button key={p.label} onClick={() => { const r = p.getRange(); setDateRange(r); setPage(1) }}
              className="text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap transition-all
                bg-[--bg-surface] border-[--border-default] text-[--text-secondary] hover:border-[--brand-500] hover:text-[--text-brand]">
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtros expandíveis */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[--bg-subtle] rounded-2xl border border-[--border-subtle]">
                {/* Tipo */}
                <div>
                  <label className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1">Tipo</label>
                  <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]">
                    <option value="all">Todos</option>
                    <option value="income">Receitas</option>
                    <option value="expense">Despesas</option>
                    <option value="savings">Poupança</option>
                  </select>
                </div>
                {/* Categoria */}
                <div>
                  <label className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1">Categoria</label>
                  <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]">
                    <option value="all">Todas</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                {/* Pagamento */}
                <div>
                  <label className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1">Pagamento</label>
                  <select value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]">
                    <option value="all">Todos</option>
                    {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                  </select>
                </div>
                {/* Datas */}
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1">De</label>
                    <input type="date" value={dateRange.from}
                      onChange={e => { setDateRange(r => ({ ...r, from: e.target.value })); setPage(1) }}
                      className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[--text-tertiary] uppercase tracking-wider block mb-1">Até</label>
                    <input type="date" value={dateRange.to}
                      onChange={e => { setDateRange(r => ({ ...r, to: e.target.value })); setPage(1) }}
                      className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-2.5 py-2 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]" />
                  </div>
                </div>
                <div className="flex items-end justify-end sm:col-span-1">
                  <button onClick={clearFilters}
                    className="text-xs text-[--text-tertiary] hover:text-[--danger-text] transition-colors">
                    Limpar tudo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista agrupada por data */}
      <div className="bg-[--bg-surface] border border-[--border-default] rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState icon={<ArrowLeftRight />} title="Nenhuma transação"
              description={activeFilters > 0 ? 'Tente ajustar os filtros.' : 'Adicione sua primeira transação.'}
              action={<Button variant="primary" icon={<Plus />} size="sm" onClick={handleNew}>Adicionar</Button>} />
          </div>
        ) : (
          <>
            <AnimatePresence>
              {grouped.map(([date, txs]) => (
                <div key={date}>
                  {/* Cabeçalho do grupo */}
                  <div className="flex items-center justify-between px-4 py-2 bg-[--bg-subtle] border-b border-[--border-subtle]">
                    <p className="text-xs font-bold text-[--text-secondary]">{dateLabel(date)}</p>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      {txs.some(t => t.type === 'income' && !t.isSavings) && (
                        <span className="text-[--success-icon] font-semibold">
                          +{formatCurrency(txs.filter(t => t.type === 'income' && !t.isSavings).reduce((s,t) => s + t.amount, 0), { compact: true })}
                        </span>
                      )}
                      {txs.some(t => t.type === 'expense') && (
                        <span className="text-[--danger-icon] font-semibold">
                          −{formatCurrency(txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0), { compact: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Transações do dia */}
                  <div className="divide-y divide-[--border-subtle]">
                    {txs.map(tx => (
                      <TxRow key={tx.id}
                        tx={tx}
                        cat={categories.find(c => c.id === tx.categoryId)}
                        onEdit={handleEdit}
                        onDelete={setDeleteId} />
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>

            {hasMore && (
              <div className="p-4 text-center border-t border-[--border-subtle]">
                <button onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1.5 mx-auto text-sm text-[--text-brand] hover:underline font-medium">
                  <ChevronDown size={14} />
                  Carregar mais ({filtered.length - page * PER_PAGE} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB mobile */}
      <button onClick={handleNew}
        className="lg:hidden fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[--brand-600]
          text-white shadow-lg flex items-center justify-center hover:bg-[--brand-700]
          active:scale-95 transition-all">
        <Plus size={24} />
      </button>

      <TransactionForm isOpen={modalOpen} onClose={handleClose} transaction={editingTx} />

      {/* Modal confirmar exclusão */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir transação" size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" fullWidth onClick={handleDelete}>Excluir</Button>
          </div>
        }>
        <p className="text-[--text-secondary] text-sm">Tem certeza? Esta ação não pode ser desfeita.</p>
      </Modal>

      {/* Modal importar */}
      <Modal isOpen={importModal} onClose={() => setImportModal(false)} title="Importar CSV" size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setImportModal(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={handleImport}>Importar</Button>
          </div>
        }>
        <div className="space-y-3">
          <p className="text-sm text-[--text-secondary]">
            Formato: <code className="text-xs bg-[--bg-hover] px-2 py-0.5 rounded font-mono">Data;Tipo;Descrição;Categoria;Valor;Pagamento</code>
          </p>
          <Button variant="secondary" size="sm" onClick={() => {
            const csv = 'Data;Tipo;Descrição;Categoria;Valor;Pagamento\n01/01/2025;Despesa;Almoço;Alimentação;25,90;pix\n05/01/2025;Receita;Salário;Salário;5000,00;transfer'
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
            a.download = 'template.csv'; a.click()
          }}>Baixar template</Button>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8}
            placeholder="Cole o conteúdo do CSV aqui..."
            className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl p-3 text-sm
              font-mono text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none
              focus:ring-2 focus:ring-[--brand-500] resize-none" />
        </div>
      </Modal>
    </div>
  )
}
