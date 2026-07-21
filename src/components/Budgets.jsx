// src/components/Budgets.jsx
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Plus, Trash2, AlertTriangle, TrendingUp, CheckCircle, Flame } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal, EmptyState, ProgressBar } from './ui'
import InfoTooltip from './InfoTooltip'
import { formatCurrency } from '../utils'

// ── Status do orçamento com cores e mensagens ──
function getBudgetStatus(pct) {
  if (pct > 100)
    return {
      level: 'over',
      color: '#ef4444',
      bgClass: 'bg-[--danger-bg]',
      borderClass: 'border-[--danger-border]',
      barColor: '#ef4444',
      icon: <Flame size={14} className="text-[--danger-text]" />,
      label: (pct) => `🚨 Limite ultrapassado! (${pct.toFixed(0)}% do orçamento)`,
    }
  if (pct === 100)
    return {
      level: 'exact',
      color: '#f97316',
      bgClass: 'bg-orange-50 dark:bg-orange-950/30',
      borderClass: 'border-orange-300 dark:border-orange-800',
      barColor: '#f97316',
      icon: <AlertTriangle size={14} className="text-orange-600" />,
      label: () => `⛔ Limite atingido! Orçamento esgotado.`,
    }
  if (pct >= 90)
    return {
      level: 'critical',
      color: '#f59e0b',
      bgClass: 'bg-[--warning-bg]',
      borderClass: 'border-[--warning-border]',
      barColor: '#f59e0b',
      icon: <AlertTriangle size={14} className="text-[--warning-icon]" />,
      label: (pct) => `⚠️ Atenção: ${pct.toFixed(0)}% do limite utilizado.`,
    }
  if (pct >= 70)
    return {
      level: 'warning',
      color: '#eab308',
      bgClass: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderClass: 'border-yellow-300 dark:border-yellow-800',
      barColor: '#eab308',
      icon: <TrendingUp size={14} className="text-yellow-600" />,
      label: (pct) => `${pct.toFixed(0)}% do orçamento utilizado — fique atento.`,
    }
  return {
    level: 'ok',
    color: '#10b981',
    bgClass: '',
    borderClass: '',
    barColor: '#10b981',
    icon: <CheckCircle size={14} className="text-[--success-icon]" />,
    label: (pct) => `${pct.toFixed(0)}% utilizado — dentro do limite.`,
  }
}

function BudgetCard({ cat, budget, spent, onEdit, onRemove }) {
  const pct = budget ? Math.max(0, (spent / budget.amount) * 100) : 0
  const remaining = budget ? Math.max(0, budget.amount - spent) : 0
  const status = getBudgetStatus(pct)
  const isOver = pct > 100
  const excess = budget ? Math.max(0, spent - budget.amount) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card
        className={`transition-all ${isOver ? 'ring-2 ring-[--danger-border] ring-offset-2 ring-offset-[--bg-app]' : ''}`}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: cat.color + '22' }}
            >
              {cat.icon}
            </div>
            <div>
              <p className="font-semibold text-[--text-primary]">{cat.name}</p>
              {budget && (
                <p className="text-xs text-[--text-tertiary]">
                  Orçado: {formatCurrency(budget.amount)}/mês
                </p>
              )}
            </div>
          </div>
          {budget && (
            <button
              onClick={() => onRemove(cat.id)}
              className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors"
              title="Remover orçamento"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {budget ? (
          <>
            {/* Valores */}
            <div className="flex justify-between items-baseline mb-2">
              <div>
                <span
                  className="text-2xl font-black tabular-nums"
                  style={{ color: status.barColor }}
                >
                  {formatCurrency(spent)}
                </span>
                <span className="text-xs text-[--text-tertiary] ml-1">gasto</span>
              </div>
              <div className="text-right">
                {isOver ? (
                  <p className="text-sm font-bold text-[--danger-text]">
                    +{formatCurrency(excess)} excedido
                  </p>
                ) : (
                  <p className="text-sm text-[--text-secondary]">
                    {formatCurrency(remaining)} restante
                  </p>
                )}
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="h-2.5 bg-[--bg-hover] rounded-full overflow-hidden mb-2.5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: status.barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              {/* Indicador de excesso */}
              {isOver && (
                <motion.div
                  className="h-full rounded-full bg-[--danger-text] opacity-40"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct - 100, 50)}%` }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                />
              )}
            </div>

            {/* Mensagem de status */}
            <AnimatePresence>
              {pct >= 70 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${status.bgClass} ${status.borderClass}`}
                >
                  {status.icon}
                  <span style={{ color: status.color }}>{status.label(pct)}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão editar */}
            <button
              onClick={() =>
                onEdit({ categoryId: cat.id, amount: budget.amount, budgetId: budget.id })
              }
              className="mt-2.5 w-full text-xs text-[--text-tertiary] hover:text-[--text-brand] transition-colors text-center"
            >
              Alterar limite
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-black text-[--text-tertiary] tabular-nums">
                R$ 0,00
              </span>
              <span className="text-xs text-[--text-tertiary]">sem limite</span>
            </div>
            <div className="h-2 bg-[--bg-hover] rounded-full" />
            <button
              onClick={() => onEdit({ categoryId: cat.id, amount: '' })}
              className="flex items-center gap-1.5 text-xs text-[--text-tertiary] hover:text-[--brand-500] transition-colors mt-1"
            >
              <Plus size={12} /> Definir limite
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export default function Budgets() {
  const { budgets, categories, saveBudget, removeBudget, transactions } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [saving, setSaving] = useState(false)

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7)

  const getSpent = (categoryId) =>
    transactions
      .filter(
        (t) =>
          t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(currentMonth),
      )
      .reduce((s, t) => s + t.amount, 0)

  // Resumo geral do mês
  const summary = useMemo(() => {
    const withBudget = budgets.map((b) => {
      const spent = getSpent(b.categoryId)
      return { spent, budget: b.amount, over: Math.max(0, spent - b.amount) }
    })
    return {
      totalBudgeted: withBudget.reduce((s, b) => s + b.budget, 0),
      totalSpent: withBudget.reduce((s, b) => s + b.spent, 0),
      totalOver: withBudget.reduce((s, b) => s + b.over, 0),
      overCount: withBudget.filter((b) => b.spent > b.budget).length,
    }
  }, [budgets, transactions])

  // Ordena: excedidos → críticos → normais → sem orçamento
  const sortedCategories = useMemo(() => {
    return [...expenseCategories].sort((a, b) => {
      const budA = budgets.find((bud) => bud.categoryId === a.id)
      const budB = budgets.find((bud) => bud.categoryId === b.id)
      if (!budA && !budB) return 0
      if (!budA) return 1
      if (!budB) return -1
      const pctA = getSpent(a.id) / budA.amount
      const pctB = getSpent(b.id) / budB.amount
      return pctB - pctA // mais crítico primeiro
    })
  }, [expenseCategories, budgets, transactions])

  const handleEdit = ({ categoryId, amount }) => {
    setForm({ categoryId, amount: amount || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.categoryId || !form.amount || parseFloat(form.amount) <= 0) return
    setSaving(true)
    try {
      await saveBudget(form.categoryId, parseFloat(form.amount))
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[--text-primary]">Orçamentos mensais</h1>
            <InfoTooltip text="Defina um limite de gasto por categoria. Você será alertado ao atingir 70%, 90% e 100% do limite." />
          </div>
          <p className="text-sm text-[--text-tertiary]">
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus />}
          onClick={() => handleEdit({ categoryId: '', amount: '' })}
        >
          Definir orçamento
        </Button>
      </div>

      {/* Resumo geral */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total orçado',
              value: formatCurrency(summary.totalBudgeted),
              color: 'text-[--brand-500]',
            },
            {
              label: 'Total gasto',
              value: formatCurrency(summary.totalSpent),
              color:
                summary.totalSpent > summary.totalBudgeted
                  ? 'text-[--danger-icon]'
                  : 'text-[--text-primary]',
            },
            {
              label: 'Disponível',
              value: formatCurrency(Math.max(0, summary.totalBudgeted - summary.totalSpent)),
              color: 'text-[--success-icon]',
            },
            {
              label: 'Excedidos',
              value: `${summary.overCount} categoria${summary.overCount !== 1 ? 's' : ''}`,
              color: summary.overCount > 0 ? 'text-[--danger-icon]' : 'text-[--success-icon]',
            },
          ].map((s) => (
            <Card key={s.label} className="text-center py-3">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[--text-tertiary] mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Grade de categorias */}
      {expenseCategories.length === 0 ? (
        <EmptyState
          icon={<PieChart />}
          title="Nenhuma categoria de despesa"
          description="Crie categorias de despesa para definir orçamentos."
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {sortedCategories.map((cat) => (
              <BudgetCard
                key={cat.id}
                cat={cat}
                budget={budgets.find((b) => b.categoryId === cat.id)}
                spent={getSpent(cat.id)}
                onEdit={handleEdit}
                onRemove={removeBudget}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Definir orçamento">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1">
              Categoria
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5 text-[--text-primary] focus:outline-none focus:border-[--brand-500]"
            >
              <option value="">Selecione uma categoria</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Limite mensal (R$)"
            type="number"
            step="0.01"
            min="1"
            placeholder="Ex: 500,00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          {form.categoryId && form.amount && (
            <div className="p-3 rounded-xl bg-[--brand-50] border border-[--brand-200] text-xs text-[--brand-700]">
              💡 Você será alertado quando atingir 70%, 90% e 100% deste limite.
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleSave} loading={saving}>
            Salvar orçamento
          </Button>
        </div>
      </Modal>
    </div>
  )
}
