import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  Layers3,
  PencilLine,
  ReceiptText,
  Trash2,
} from 'lucide-react'
import { formatCurrency } from '../utils'
import {
  SERIES_SCOPE,
  buildSeriesDeletePlan,
  buildSeriesEditPlan,
  getSeriesScopeLabels,
  getSeriesSelection,
  getTransactionSeries,
} from '../domain/transactionSeries'
import { Button, Input, Modal } from './ui'

function maskCurrency(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(digits) / 100)
}

function parseCurrency(masked) {
  if (!masked) return 0

  return Number(String(masked).replace(/\./g, '').replace(',', '.')) || 0
}

function ScopeOption({ option, checked, onChange }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
        checked
          ? 'border-[--brand-500] bg-[--brand-50]'
          : 'border-[--border-default] bg-[--bg-surface] hover:border-[--brand-300]'
      }`}
    >
      <input
        type="radio"
        name="series-scope"
        value={option.value}
        checked={checked}
        onChange={() => onChange(option.value)}
        className="mt-1 h-4 w-4 accent-[--brand-600]"
      />
      <span>
        <span className="block text-xs font-black text-[--text-primary]">{option.label}</span>
        <span className="mt-1 block text-[10px] leading-relaxed text-[--text-tertiary]">
          {option.helper}
        </span>
      </span>
    </label>
  )
}

export default function TransactionSeriesModal({
  isOpen,
  mode = 'edit',
  transaction,
  transactions,
  categories,
  onApply,
  onClose,
}) {
  const descriptor = useMemo(() => getTransactionSeries(transaction), [transaction])
  const [scope, setScope] = useState(SERIES_SCOPE.SINGLE)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selection = useMemo(() => {
    if (!transaction || !descriptor) return null

    try {
      return getSeriesSelection({
        transactions,
        anchor: transaction,
        scope,
      })
    } catch {
      return null
    }
  }, [descriptor, scope, transaction, transactions])

  useEffect(() => {
    if (!isOpen || !transaction) return

    setScope(SERIES_SCOPE.SINGLE)
    setDescription(transaction.description || '')
    setCategoryId(transaction.categoryId || '')
    setAmount(maskCurrency(String(Math.round(Number(transaction.amount || 0) * 100))))
    setNotes(transaction.notes || '')
    setError('')
  }, [isOpen, transaction])

  useEffect(() => {
    if (!isOpen || !selection || mode !== 'edit') return

    const defaultValue =
      descriptor?.kind === 'installment'
        ? selection.selectedTotal
        : Number(transaction?.amount || 0)

    setAmount(maskCurrency(String(Math.round(defaultValue * 100))))
  }, [descriptor?.kind, isOpen, mode, scope, selection?.selectedTotal, transaction?.amount])

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.type === transaction?.type || category.type === 'both',
      ),
    [categories, transaction?.type],
  )

  const selectedCategory = categories.find((category) => category.id === categoryId)
  const scopeOptions = getSeriesScopeLabels(descriptor || {})
  const editing = mode === 'edit'
  const installment = descriptor?.kind === 'installment'

  const preview = useMemo(() => {
    if (!selection || !transaction) return null

    try {
      if (!editing) {
        return buildSeriesDeletePlan({
          transactions,
          anchor: transaction,
          scope,
        })
      }

      return buildSeriesEditPlan({
        transactions,
        anchor: transaction,
        scope,
        changes: {
          amount: parseCurrency(amount),
          description,
          notes,
          categoryId: selectedCategory?.id || transaction.categoryId || '',
          categoryName: selectedCategory?.name || transaction.categoryName || '',
          categoryColor: selectedCategory?.color || transaction.categoryColor || '',
          categoryIcon: selectedCategory?.icon || transaction.categoryIcon || '',
        },
      })
    } catch (previewError) {
      return {
        error: previewError.message,
      }
    }
  }, [
    amount,
    description,
    editing,
    notes,
    scope,
    selectedCategory,
    selection,
    transaction,
    transactions,
  ])

  const handleApply = async () => {
    if (!preview || preview.error) {
      setError(preview?.error || 'Não foi possível preparar a operação.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onApply(preview)
      onClose()
    } catch {
      setError(
        'Não foi possível concluir a operação. Nenhum item da série foi alterado parcialmente.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (!transaction || !descriptor) return null

  const title = editing
    ? installment
      ? 'Editar compra parcelada'
      : 'Editar recorrência'
    : installment
      ? 'Excluir parcelas'
      : 'Excluir recorrência'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      closeOnBackdrop={false}
      closeOnEscape={!loading}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={editing ? 'primary' : 'danger'}
            fullWidth
            loading={loading}
            onClick={handleApply}
          >
            {editing ? 'Aplicar alterações' : 'Confirmar exclusão'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-[--brand-200] bg-[--brand-50] p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-100] text-[--brand-700]">
            {installment ? <Layers3 size={18} /> : <CalendarRange size={18} />}
          </div>
          <div>
            <p className="text-sm font-black text-[--brand-700]">
              {transaction.description || descriptor.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[--brand-600]">
              {selection?.members.length || 0} registro
              {selection?.members.length === 1 ? '' : 's'} na série ·{' '}
              {formatCurrency(selection?.seriesTotal || 0)} no total atual
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-black uppercase tracking-wider text-[--text-tertiary]">
            Alcance da operação
          </legend>
          <div className="grid gap-2">
            {scopeOptions.map((option) => (
              <ScopeOption
                key={option.value}
                option={option}
                checked={scope === option.value}
                onChange={setScope}
              />
            ))}
          </div>
        </fieldset>

        {editing ? (
          <div className="space-y-4">
            <Input
              label="Descrição"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              icon={<PencilLine size={15} />}
            />

            <div>
              <label
                htmlFor="series-category"
                className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
              >
                Categoria
              </label>
              <select
                id="series-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
              >
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="series-amount"
                className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
              >
                {installment ? 'Total das parcelas selecionadas' : 'Valor de cada lançamento'}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-secondary]">
                  R$
                </span>
                <input
                  id="series-amount"
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(maskCurrency(event.target.value))}
                  className="min-h-12 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] pl-10 pr-3 text-lg font-black text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                {installment
                  ? 'O total informado será distribuído entre as parcelas selecionadas sem perder centavos.'
                  : 'O mesmo valor será aplicado a cada ocorrência selecionada.'}
              </p>
            </div>

            <div>
              <label
                htmlFor="series-notes"
                className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
              >
                Observações
              </label>
              <textarea
                id="series-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full resize-none rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-2.5 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-4">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-[--danger-icon]" />
            <div>
              <p className="text-sm font-black text-[--danger-text]">Exclusão definitiva</p>
              <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">
                Os itens selecionados serão removidos em uma única operação. Os registros restantes
                serão renumerados automaticamente.
              </p>
            </div>
          </div>
        )}

        {preview && !preview.error && (
          <div className="rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-4">
            <div className="flex items-center gap-2">
              {editing ? (
                <ReceiptText size={15} className="text-[--brand-600]" />
              ) : (
                <Trash2 size={15} className="text-[--danger-icon]" />
              )}
              <p className="text-xs font-black uppercase tracking-wider text-[--text-tertiary]">
                Impacto antes de confirmar
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[--bg-surface] p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                  Registros afetados
                </p>
                <p className="mt-1 text-base font-black text-[--text-primary]">
                  {preview.summary.affectedCount}
                </p>
              </div>

              <div className="rounded-xl bg-[--bg-surface] p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                  {editing ? 'Total do escopo' : 'Valor removido'}
                </p>
                <p className="mt-1 text-base font-black text-[--text-primary]">
                  {formatCurrency(
                    editing ? preview.summary.selectedTotalAfter : preview.summary.removedTotal,
                  )}
                </p>
              </div>

              <div className="col-span-2 rounded-xl bg-[--bg-surface] p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                  Total da série após a operação
                </p>
                <p className="mt-1 text-base font-black text-[--text-primary]">
                  {formatCurrency(
                    editing ? preview.summary.seriesTotalAfter : preview.summary.remainingTotal,
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {(error || preview?.error) && (
          <p
            role="alert"
            className="rounded-xl border border-[--danger-border] bg-[--danger-bg] p-3 text-xs text-[--danger-text]"
          >
            {error || preview.error}
          </p>
        )}
      </div>
    </Modal>
  )
}
