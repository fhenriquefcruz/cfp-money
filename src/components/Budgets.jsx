// src/components/Budgets.jsx
import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Flame,
  PieChart,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Button, Card, EmptyState, Input, Modal } from './ui'
import InfoTooltip from './InfoTooltip'
import { formatCurrency } from '../utils'
import {
  budgetMonthKey,
  buildMonthlyBudgetOverview,
  getBudgetForMonth,
  getBudgetSpent,
  shiftBudgetMonth,
} from '../domain/budgetPeriods'

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

function getBudgetStatus(percent) {
  if (percent > 100) {
    return {
      color: 'var(--danger-text)',
      bgClass: 'bg-[--danger-bg]',
      borderClass: 'border-[--danger-border]',
      barColor: 'var(--danger-icon)',
      icon: <Flame size={14} className="text-[--danger-text]" />,
      label: `Limite ultrapassado em ${(percent - 100).toFixed(0)}%`,
    }
  }

  if (percent >= 90) {
    return {
      color: 'var(--warning-text)',
      bgClass: 'bg-[--warning-bg]',
      borderClass: 'border-[--warning-border]',
      barColor: 'var(--warning-icon)',
      icon: <AlertTriangle size={14} className="text-[--warning-icon]" />,
      label: `${percent.toFixed(0)}% do limite utilizado`,
    }
  }

  if (percent >= 70) {
    return {
      color: 'var(--warning-text)',
      bgClass: 'bg-[--warning-bg]',
      borderClass: 'border-[--warning-border]',
      barColor: 'var(--warning-icon)',
      icon: <TrendingUp size={14} className="text-[--warning-icon]" />,
      label: `${percent.toFixed(0)}% do orçamento utilizado`,
    }
  }

  return {
    color: 'var(--success-text)',
    bgClass: 'bg-[--success-bg]',
    borderClass: 'border-[--success-border]',
    barColor: 'var(--success-icon)',
    icon: <CheckCircle size={14} className="text-[--success-icon]" />,
    label: `${percent.toFixed(0)}% utilizado`,
  }
}

function BudgetCard({
  category,
  budget,
  spent,
  monthKey,
  onEdit,
  onRemove,
}) {
  const amount = Number(budget?.amount) || 0
  const percent = amount > 0 ? Math.max(0, (spent / amount) * 100) : 0
  const remaining = Math.max(0, amount - spent)
  const excess = Math.max(0, spent - amount)
  const status = getBudgetStatus(percent)
  const isOver = percent > 100

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <Card className={isOver ? 'ring-2 ring-[--danger-border]' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: `${category.color}22` }}
            >
              {category.icon}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[--text-primary]">{category.name}</p>
              <p className="text-xs text-[--text-tertiary]">
                {budget ? `${formatCurrency(amount)} neste mês` : 'Sem limite neste mês'}
              </p>
            </div>
          </div>

          {budget && (
            <button
              type="button"
              onClick={() =>
                onRemove({
                  categoryId: category.id,
                  monthKey,
                  budgetId: budget.id,
                })
              }
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[--text-tertiary] transition-colors hover:bg-[--danger-bg] hover:text-[--danger-text]"
              aria-label={`Remover orçamento de ${category.name}`}
              title="Remover orçamento deste mês"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {budget ? (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                  Gasto na competência
                </p>
                <p
                  className="mt-1 text-2xl font-black tabular-nums"
                  style={{ color: status.barColor }}
                >
                  {formatCurrency(spent)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                  {isOver ? 'Excedido' : 'Disponível'}
                </p>
                <p
                  className={`mt-1 text-sm font-black ${
                    isOver ? 'text-[--danger-text]' : 'text-[--text-primary]'
                  }`}
                >
                  {formatCurrency(isOver ? excess : remaining)}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[--bg-hover]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: status.barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percent, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            <div
              className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${status.bgClass} ${status.borderClass}`}
            >
              {status.icon}
              <span style={{ color: status.color }}>{status.label}</span>
            </div>

            {budget.legacyFallback && (
              <p className="mt-2 text-[10px] leading-relaxed text-[--warning-text]">
                Limite antigo usado somente como transição no mês atual. Ao alterar, ele passa a
                ficar vinculado exclusivamente a esta competência.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                onEdit({
                  categoryId: category.id,
                  amount,
                })
              }
              className="mt-3 min-h-10 w-full text-center text-xs font-semibold text-[--text-tertiary] transition-colors hover:text-[--text-brand]"
            >
              Alterar limite deste mês
            </button>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-[--border-default] bg-[--bg-subtle] p-3">
            <p className="text-xs leading-relaxed text-[--text-tertiary]">
              Nenhum orçamento foi definido para esta categoria nesta competência.
            </p>
            <button
              type="button"
              onClick={() => onEdit({ categoryId: category.id, amount: '' })}
              className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-[--text-brand]"
            >
              <Plus size={12} />
              Definir limite mensal
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export default function Budgets() {
  const { budgets, categories, saveBudget, removeBudget, transactions } = useApp()
  const currentMonthKey = budgetMonthKey()
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [saving, setSaving] = useState(false)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories],
  )

  const overview = useMemo(
    () =>
      buildMonthlyBudgetOverview({
        budgets,
        transactions,
        monthKey: selectedMonth,
        currentMonthKey,
      }),
    [budgets, transactions, selectedMonth, currentMonthKey],
  )

  const sortedCategories = useMemo(
    () =>
      [...expenseCategories].sort((first, second) => {
        const firstBudget = getBudgetForMonth(
          budgets,
          first.id,
          selectedMonth,
          currentMonthKey,
        )
        const secondBudget = getBudgetForMonth(
          budgets,
          second.id,
          selectedMonth,
          currentMonthKey,
        )

        if (!firstBudget && !secondBudget) return first.name.localeCompare(second.name, 'pt-BR')
        if (!firstBudget) return 1
        if (!secondBudget) return -1

        const firstSpent = getBudgetSpent(transactions, first.id, selectedMonth)
        const secondSpent = getBudgetSpent(transactions, second.id, selectedMonth)
        const firstPercent = firstBudget.amount > 0 ? firstSpent / firstBudget.amount : 0
        const secondPercent = secondBudget.amount > 0 ? secondSpent / secondBudget.amount : 0

        return secondPercent - firstPercent
      }),
    [expenseCategories, budgets, transactions, selectedMonth, currentMonthKey],
  )

  const openEditor = ({ categoryId = '', amount = '' } = {}) => {
    setForm({
      categoryId,
      amount: amount === '' ? '' : String(amount),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const amount = Number(form.amount)
    if (!form.categoryId || !Number.isFinite(amount) || amount <= 0) return

    setSaving(true)
    try {
      await saveBudget(form.categoryId, amount, selectedMonth)
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async ({ categoryId, monthKey, budgetId }) => {
    await removeBudget(categoryId, monthKey, budgetId)
  }

  const isCurrentMonth = selectedMonth === currentMonthKey
  const selectedLabel = monthLabel(selectedMonth)

  return (
    <div
      data-tour="budgets"
      className="operational-page budgets-premium mx-auto min-w-0 max-w-[1600px] space-y-5 pb-24 lg:pb-6"
    >
      <div className="operational-page__header flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[--text-primary]">Orçamento mensal</h1>
            <InfoTooltip text="Cada competência possui seus próprios limites. Compras no cartão entram no orçamento pela data da compra, não pelo vencimento da fatura." />
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[--text-tertiary]">
            Defina quanto pretende gastar em cada categoria no mês escolhido. Meses anteriores não
            são somados ao consumo atual.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => openEditor()}>
          Definir orçamento
        </Button>
      </div>

      <Card className="budget-period-selector shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
              Competência
            </p>
            <p className="mt-1 text-lg font-black capitalize text-[--text-primary]">
              {selectedLabel}
            </p>
            <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
              O limite e o consumo abaixo pertencem somente a este mês.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedMonth((month) => shiftBudgetMonth(month, -1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[--border-default] text-[--text-secondary] hover:bg-[--bg-hover]"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="min-h-11 rounded-xl px-3 text-xs font-bold text-[--text-brand] hover:bg-[--brand-50]"
              >
                Mês atual
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedMonth((month) => shiftBudgetMonth(month, 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[--border-default] text-[--text-secondary] hover:bg-[--bg-hover]"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

      {overview.items.length > 0 && (
        <div className="operational-summary-grid grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Orçado no mês',
              value: formatCurrency(overview.totalBudgeted),
              color: 'text-[--brand-500]',
            },
            {
              label: 'Gasto no mês',
              value: formatCurrency(overview.totalSpent),
              color:
                overview.totalSpent > overview.totalBudgeted
                  ? 'text-[--danger-icon]'
                  : 'text-[--text-primary]',
            },
            {
              label: 'Disponível',
              value: formatCurrency(
                Math.max(0, overview.totalBudgeted - overview.totalSpent),
              ),
              color: 'text-[--success-icon]',
            },
            {
              label: 'Excedidos',
              value: `${overview.overCount} categoria${overview.overCount === 1 ? '' : 's'}`,
              color:
                overview.overCount > 0
                  ? 'text-[--danger-icon]'
                  : 'text-[--success-icon]',
            },
          ].map((item) => (
            <Card key={item.label} className="py-3 text-center">
              <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
              <p className="mt-0.5 text-xs text-[--text-tertiary]">{item.label}</p>
            </Card>
          ))}
        </div>
      )}

      {expenseCategories.length === 0 ? (
        <EmptyState
          icon={<PieChart />}
          title="Nenhuma categoria de despesa"
          description="Crie categorias de despesa para definir orçamentos."
        />
      ) : (
        <motion.div
          layout
          className="operational-card-grid budgets-card-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence>
            {sortedCategories.map((category) => {
              const budget = getBudgetForMonth(
                budgets,
                category.id,
                selectedMonth,
                currentMonthKey,
              )
              const spent = getBudgetSpent(transactions, category.id, selectedMonth)

              return (
                <BudgetCard
                  key={category.id}
                  category={category}
                  budget={budget}
                  spent={spent}
                  monthKey={selectedMonth}
                  onEdit={openEditor}
                  onRemove={handleRemove}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Orçamento de ${selectedLabel}`}
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="budget-category"
              className="mb-1 block text-sm font-medium text-[--text-secondary]"
            >
              Categoria
            </label>
            <select
              id="budget-category"
              value={form.categoryId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-4 py-2.5 text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
            >
              <option value="">Selecione uma categoria</option>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Limite deste mês (R$)"
            type="number"
            step="0.01"
            min="1"
            placeholder="Ex: 500,00"
            value={form.amount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amount: event.target.value,
              }))
            }
          />

          <div className="rounded-xl border border-[--brand-200] bg-[--brand-50] p-3 text-xs leading-relaxed text-[--brand-700]">
            Este limite vale somente para <strong>{selectedLabel}</strong>. Alterar este valor não
            muda orçamentos de outros meses.
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} loading={saving}>
            Salvar orçamento mensal
          </Button>
        </div>
      </Modal>
    </div>
  )
}
