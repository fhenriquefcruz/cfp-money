// src/components/Budgets.jsx
import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, PieChart, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Button, Card, EmptyState, Input, Modal } from './ui'
import { formatCurrency } from '../utils'
import {
  budgetMonthKey,
  buildMonthlyBudgetOverview,
  getBudgetForMonth,
  getBudgetSpent,
  shiftBudgetMonth,
} from '../domain/budgetPeriods'

const monthLabel = (monthKey) => `${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}`
function getBudgetStatus(percent) {
  const tone = percent > 100 ? 'danger' : percent >= 70 ? 'warning' : 'success'
  const label =
    percent > 100
      ? `Limite ultrapassado em ${(percent - 100).toFixed(0)}%`
      : `${percent.toFixed(0)}% utilizado`

  return { tone, label }
}

function BudgetCard({ category, budget, spent, monthKey, onEdit, onRemove }) {
  const amount = Number(budget?.amount) || 0
  const percent = amount > 0 ? Math.max(0, (spent / amount) * 100) : 0
  const remaining = Math.max(0, amount - spent)
  const excess = Math.max(0, spent - amount)
  const status = getBudgetStatus(percent)
  const isOver = percent > 100
  const barColor = `var(--${status.tone}-icon)`

  return (
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
            onClick={() => onRemove(category.id, monthKey, budget.id)}
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[--text-tertiary] transition-colors hover:bg-[--danger-bg] hover:text-[--danger-text]"
            aria-label={`Remover orçamento de ${category.name}`}
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
                style={{ color: barColor }}
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
            <div
              className="h-full rounded-full"
              style={{
                background: barColor,
                width: `${Math.min(percent, 100)}%`,
              }}
            />
          </div>

          <div
            className="mt-3 rounded-xl border px-3 py-2 text-xs font-medium"
            style={{
              background: `var(--${status.tone}-bg)`,
              borderColor: `var(--${status.tone}-border)`,
              color: `var(--${status.tone}-text)`,
            }}
          >
            {status.label}
          </div>

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
  )
}

export default function Budgets() {
  const { budgets, categories, saveBudget, removeBudget, transactions } = useApp()
  const [searchParams] = useSearchParams()
  const currentMonthKey = budgetMonthKey()
  const requestedMonth = budgetMonthKey(searchParams.get('month') || '')
  const [selectedMonth, setSelectedMonth] = useState(requestedMonth || currentMonthKey)
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

  const isCurrentMonth = selectedMonth === currentMonthKey
  const selectedLabel = monthLabel(selectedMonth)

  return (
    <div
      data-tour="budgets"
      className="operational-page budgets-premium mx-auto min-w-0 max-w-[1600px] space-y-5 pb-24 lg:pb-6"
    >
      <div className="operational-page__header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Orçamento mensal</h1>
        </div>

        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => openEditor()}>
          Definir orçamento
        </Button>
      </div>

      <Card className="budget-period-selector shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mt-1 text-lg font-black text-[--text-primary]">
              {selectedLabel}
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
        <div className="operational-card-grid budgets-card-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                  onRemove={removeBudget}
                />
              )
          })}
        </div>
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

          <Button variant="primary" fullWidth onClick={handleSave} loading={saving}>
            Salvar orçamento mensal
          </Button>
        </div>
      </Modal>
    </div>
  )
}
