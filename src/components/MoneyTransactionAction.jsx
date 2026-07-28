import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FilePenLine,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Input, Select } from './ui'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../utils'

const SUPPORTED_PAYMENT_METHODS = PAYMENT_METHODS.filter((method) => method.id !== 'credit_card')

function transactionLabel(type) {
  return type === 'income' ? 'Receita' : 'Despesa'
}

function CreatedTransaction({ response, onUndo, busy }) {
  const transaction = response.transaction

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl border border-[--success-border] bg-[--success-bg] p-3.5">
        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-[--success-icon]" />
        <div>
          <p className="text-sm font-black text-[--success-text]">Lançamento registrado</p>
          <p className="mt-1 text-xs leading-relaxed text-[--success-text]">
            {transactionLabel(transaction.type)} de{' '}
            <strong>{formatCurrency(transaction.amount)}</strong> em {transaction.categoryName}, com
            data de {formatDate(transaction.date)}.
          </p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        icon={<RotateCcw size={14} />}
        loading={busy}
        onClick={() => onUndo(response.transactionId)}
      >
        Desfazer lançamento
      </Button>
    </div>
  )
}

export default function MoneyTransactionAction({
  response,
  categories,
  onConfirm,
  onCancel,
  onUndo,
  busy = false,
}) {
  const [draft, setDraft] = useState(response.draft || null)

  useEffect(() => {
    setDraft(response.draft || null)
  }, [response])

  const eligibleCategories = useMemo(
    () =>
      categories.filter(
        (category) => draft && (category.type === draft.type || category.type === 'both'),
      ),
    [categories, draft],
  )

  if (response.type === 'transaction_created') {
    return <CreatedTransaction response={response} onUndo={onUndo} busy={busy} />
  }

  if (response.type === 'transaction_cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-3.5">
        <XCircle size={17} className="mt-0.5 flex-shrink-0 text-[--text-tertiary]" />
        <div>
          <p className="text-sm font-bold text-[--text-primary]">Rascunho cancelado</p>
          <p className="mt-1 text-xs text-[--text-tertiary]">
            Nenhuma informação foi adicionada ou alterada.
          </p>
        </div>
      </div>
    )
  }

  if (response.type === 'transaction_undone') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-3.5">
        <RotateCcw size={17} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
        <div>
          <p className="text-sm font-bold text-[--text-primary]">Lançamento desfeito</p>
          <p className="mt-1 text-xs text-[--text-tertiary]">
            A transação criada pelo Money foi removida.
          </p>
        </div>
      </div>
    )
  }

  if (response.type === 'transaction_advanced_required') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-[--warning-border] bg-[--warning-bg] p-3.5">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-[--warning-icon]" />
          <div>
            <p className="text-sm font-black text-[--text-primary]">{response.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">{response.text}</p>
          </div>
        </div>
        <Link
          to={response.transactionRoute || '/transactions'}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[--brand-600] px-3 text-xs font-semibold text-white hover:bg-[--brand-700]"
        >
          <FilePenLine size={14} />
          Abrir cadastro de transações
        </Link>
      </div>
    )
  }

  if (!draft) return null

  const selectedCategory = categories.find((category) => category.id === draft.categoryId)

  const update = (field, value) => {
    if (field === 'type') {
      setDraft((current) => ({
        ...current,
        type: value,
        categoryId: '',
        categoryName: '',
        categoryColor: '',
        categoryIcon: '',
      }))
      return
    }

    if (field === 'categoryId') {
      const category = categories.find((item) => item.id === value)
      setDraft((current) => ({
        ...current,
        categoryId: value,
        categoryName: category?.name || '',
        categoryColor: category?.color || '',
        categoryIcon: category?.icon || '',
      }))
      return
    }

    setDraft((current) => ({ ...current, [field]: value }))
  }

  const isValid = Number(draft.amount) > 0 && draft.categoryId && draft.paymentMethod && draft.date

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-black text-[--text-primary]">{response.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">{response.text}</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[--brand-200] bg-[--brand-50] p-3">
        <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
        <p className="text-[11px] leading-relaxed text-[--brand-700]">
          Confira valor, categoria, data e pagamento. Nada foi salvo até este momento.
        </p>
      </div>

      {response.warnings?.map((warning) => (
        <div
          key={warning}
          className="flex items-start gap-2 rounded-xl border border-[--warning-border] bg-[--warning-bg] p-3"
        >
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-[--warning-icon]" />
          <p className="text-[11px] leading-relaxed text-[--text-secondary]">{warning}</p>
        </div>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Tipo"
          value={draft.type}
          onChange={(event) => update('type', event.target.value)}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </Select>

        <Input
          label="Valor"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={draft.amount}
          onChange={(event) => update('amount', event.target.value)}
          placeholder="0,00"
        />

        <Input
          label="Descrição"
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Ex.: Dentista"
        />

        <Select
          label="Categoria"
          value={draft.categoryId}
          onChange={(event) => update('categoryId', event.target.value)}
        >
          <option value="">Selecione</option>
          {eligibleCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon ? `${category.icon} ` : ''}
              {category.name}
            </option>
          ))}
        </Select>

        <Input
          label="Data da transação"
          type="date"
          value={draft.date}
          onChange={(event) => update('date', event.target.value)}
        />

        <Select
          label="Forma de pagamento"
          value={draft.paymentMethod}
          onChange={(event) => update('paymentMethod', event.target.value)}
        >
          <option value="">Selecione</option>
          {SUPPORTED_PAYMENT_METHODS.map((method) => (
            <option key={method.id} value={method.id}>
              {method.icon} {method.label}
            </option>
          ))}
        </Select>
      </div>

      {selectedCategory && (
        <p className="text-[10px] text-[--text-tertiary]">
          Categoria selecionada: {selectedCategory.name}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-[--border-subtle] pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="sm" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={busy}
          disabled={!isValid}
          icon={<CheckCircle2 size={14} />}
          onClick={() =>
            onConfirm({
              ...draft,
              amount: Number(draft.amount),
              description:
                draft.description.trim() || (draft.type === 'income' ? 'Receita' : 'Despesa'),
            })
          }
        >
          Confirmar lançamento
        </Button>
      </div>
    </div>
  )
}
