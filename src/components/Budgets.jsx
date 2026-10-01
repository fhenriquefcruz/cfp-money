// src/components/Budgets.jsx
import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBudgets, useCategories, useTransactions } from '../contexts/AppContext'
import { Button, Card, EmptyState, Input, Modal } from './ui'
import { formatCurrency } from '../utils'
import {
  budgetMonthKey,
  buildMonthlyBudgetOverview,
  getBudgetForMonth,
  getBudgetSpent,
  getBudgetTransactions,
  shiftBudgetMonth,
} from '../domain/budgetPeriods'
import { buildCategoryReviewQueue } from '../domain/categoryReview'

const monthLabel = (monthKey) => `${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}`
function BudgetCard({ category, budget, spent, monthKey, onEdit, onRemove }) {
  const amount = +budget?.amount || 0
  const percent = amount > 0 ? (spent / amount) * 100 : 0
  const balance = amount - spent
  const isOver = balance < 0
  const tone = isOver ? 'danger' : percent >= 70 ? 'warning' : 'success'

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
              {budget
                ? `${formatCurrency(amount)} neste mês`
                : `Sem limite · ${formatCurrency(spent)}`}
            </p>
          </div>
        </div>

        {budget && (
          <button
            type="button"
            onClick={() => onRemove(category.id, monthKey, budget.id)}
            className="budget-remove-button"
            aria-label={`Remover ${category.name}`}
          >
            ×
          </button>
        )}
      </div>

      {budget ? (
        <>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                Gasto no mês
              </p>
              <p className="budget-spent-value" data-tone={tone}>
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
                {formatCurrency(Math.abs(balance))}
              </p>
            </div>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[--bg-hover]">
            <div
              className="budget-progress-fill"
              data-tone={tone}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="budget-status" data-tone={tone}>
            {`${percent.toFixed(0)}% usado`}
          </div>
        </>
      ) : null}

      <div className="budget-card-actions">
        <Link
          to={`/transactions?category=${category.id}&month=${monthKey}`}
          className="budget-drilldown-link"
        >
          Ver lançamentos
        </Link>
        <button
          type="button"
          onClick={() => onEdit({ categoryId: category.id, amount: budget ? amount : '' })}
          className="budget-edit-limit"
        >
          {budget ? 'Alterar limite' : '+ Definir limite'}
        </button>
      </div>
    </Card>
  )
}

export default function Budgets() {
  const { transactions } = useTransactions()
  const { budgets, saveBudget, removeBudget } = useBudgets()
  const { categories } = useCategories()
  const [searchParams] = useSearchParams()
  const currentMonthKey = budgetMonthKey()
  const requestedMonth = budgetMonthKey(searchParams.get('month') || '')
  const [selectedMonth, setSelectedMonth] = useState(requestedMonth || currentMonthKey)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const sourceMonth = shiftBudgetMonth(selectedMonth, -1)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories],
  )

  const carryoverPlan = expenseCategories.flatMap((category) => {
    const source = getBudgetForMonth(budgets, category.id, sourceMonth, currentMonthKey)
    const target = getBudgetForMonth(budgets, category.id, selectedMonth, currentMonthKey)
    return source && !target ? [{ categoryId: category.id, amount: source.amount }] : []
  })

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

  const categoryReviewCount = buildCategoryReviewQueue(
    getBudgetTransactions(transactions, null, selectedMonth),
    categories,
  ).length

  const sortedCategories = useMemo(
    () =>
      [...expenseCategories].sort((first, second) => {
        const firstBudget = getBudgetForMonth(budgets, first.id, selectedMonth, currentMonthKey)
        const secondBudget = getBudgetForMonth(budgets, second.id, selectedMonth, currentMonthKey)

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
  const monthSpent = overview.totalSpent + overview.totalUnbudgetedSpent

  return (
    <div
      data-tour="budgets"
      className="operational-page budgets-premium mx-auto min-w-0 max-w-[1600px] space-y-5 pb-24 lg:pb-6"
    >
      <div className="operational-page__header flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Orçamento mensal</h1>
        </div>

        <Button variant="primary" size="sm" onClick={() => openEditor()}>
          Definir orçamento
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mt-1 text-lg font-black text-[--text-primary]">{selectedLabel}</p>
            {carryoverPlan.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveBudget(carryoverPlan, null, selectedMonth)}
              >
                Copiar {monthLabel(sourceMonth)}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedMonth((month) => shiftBudgetMonth(month, -1))}
              className="budget-month-nav-button"
              aria-label="Mês anterior"
            >
              ‹
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
              className="budget-month-nav-button"
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>
        </div>
      </Card>

      {(overview.totalBudgeted > 0 || monthSpent > 0) && (
        <>
          <div className="operational-summary-grid grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Orçado', formatCurrency(overview.totalBudgeted), 'text-[--brand-500]'],
              ['Gasto orçado', formatCurrency(overview.totalSpent), 'text-[--text-primary]'],
              [
                'Gasto sem limite',
                formatCurrency(overview.totalUnbudgetedSpent),
                'text-[--warning-text]',
              ],
              ['Excedente total', formatCurrency(overview.totalExceeded), 'text-[--danger-text]'],
            ].map(([label, value, color]) => (
              <Card key={label} className="py-3 text-center">
                <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
                <p className="mt-0.5 text-xs text-[--text-tertiary]">{label}</p>
              </Card>
            ))}
          </div>

          <p className="budget-summary-note">
            Total no mês: <strong>{formatCurrency(monthSpent)}</strong>.
          </p>
        </>
      )}

      {categoryReviewCount > 0 && (
        <div className="budget-review-banner">
          <p className="text-sm font-bold text-[--warning-text]">
            Revisão de categoria: {categoryReviewCount}
          </p>
          <Link
            to={`/transactions?month=${selectedMonth}&review=categories`}
            className="budget-review-banner__action"
          >
            Revisar lançamentos
          </Link>
        </div>
      )}

      {expenseCategories.length === 0 ? (
        <EmptyState
          icon="◎"
          title="Nenhuma categoria de despesa"
          description="Crie categorias de despesa e defina limites."
        />
      ) : (
        <div className="operational-card-grid budgets-card-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedCategories.map((category) => {
            const budget = getBudgetForMonth(budgets, category.id, selectedMonth, currentMonthKey)
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
            label="Limite mensal (R$)"
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
            Salvar orçamento
          </Button>
        </div>
      </Modal>
    </div>
  )
}
