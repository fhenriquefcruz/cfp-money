import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Input, Select } from './ui'
import { formatCurrency, formatDate } from '../utils'
import { calculateInvoiceSchedule, splitInstallmentAmounts } from '../domain/creditCards'

function CancelledMessage() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-3.5">
      <XCircle size={17} className="mt-0.5 flex-shrink-0 text-[--text-tertiary]" />
      <div>
        <p className="text-sm font-bold text-[--text-primary]">Compra cancelada</p>
        <p className="mt-1 text-xs text-[--text-tertiary]">
          Nenhuma parcela ou transação foi criada.
        </p>
      </div>
    </div>
  )
}

function UndoneMessage() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-3.5">
      <RotateCcw size={17} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
      <div>
        <p className="text-sm font-bold text-[--text-primary]">Compra desfeita</p>
        <p className="mt-1 text-xs text-[--text-tertiary]">
          Todas as transações criadas para essa compra foram removidas.
        </p>
      </div>
    </div>
  )
}

function CreatedCreditPurchase({ response, onUndo, busy }) {
  const first = response.transactions?.[0]
  const count = response.transactions?.length || 0
  const total =
    response.originalAmount ||
    response.transactions?.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0) ||
    0

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl border border-[--success-border] bg-[--success-bg] p-3.5">
        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-[--success-icon]" />
        <div>
          <p className="text-sm font-black text-[--success-text]">Compra registrada</p>
          <p className="mt-1 text-xs leading-relaxed text-[--success-text]">
            <strong>{formatCurrency(total)}</strong> no cartão {first?.cardName || 'selecionado'}
            {count > 1 ? ` em ${count} parcelas` : ''}. Primeira fatura com vencimento em{' '}
            {formatDate(first?.dueDate || first?.date)}.
          </p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        icon={<RotateCcw size={14} />}
        loading={busy}
        onClick={() => onUndo(response.transactionIds)}
      >
        Desfazer compra inteira
      </Button>
    </div>
  )
}

export default function MoneyCreditTransactionAction({
  response,
  categories,
  creditCards,
  onConfirm,
  onCancel,
  onUndo,
  busy = false,
}) {
  const [draft, setDraft] = useState(response.draft || null)

  useEffect(() => {
    setDraft(response.draft || null)
  }, [response])

  if (response.type === 'credit_card_setup_required') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-[--warning-border] bg-[--warning-bg] p-3.5">
          <CreditCard size={18} className="mt-0.5 flex-shrink-0 text-[--warning-icon]" />
          <div>
            <p className="text-sm font-black text-[--text-primary]">{response.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">{response.text}</p>
          </div>
        </div>
        <Link
          to={response.profileRoute || '/profile'}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[--brand-600] px-3 text-xs font-semibold text-white hover:bg-[--brand-700]"
        >
          <CreditCard size={14} />
          Cadastrar cartão no Perfil
        </Link>
      </div>
    )
  }

  if (response.type === 'credit_transaction_created') {
    return <CreatedCreditPurchase response={response} onUndo={onUndo} busy={busy} />
  }

  if (response.type === 'credit_transaction_cancelled') {
    return <CancelledMessage />
  }

  if (response.type === 'credit_transaction_undone') {
    return <UndoneMessage />
  }

  if (response.type === 'credit_transaction_error') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-3.5">
        <AlertTriangle size={17} className="mt-0.5 flex-shrink-0 text-[--danger-icon]" />
        <div>
          <p className="text-sm font-bold text-[--danger-text]">
            Não foi possível registrar a compra
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[--danger-text]">
            Nenhuma parcela foi criada. Revise o rascunho e tente novamente.
          </p>
        </div>
      </div>
    )
  }

  if (!draft) return null

  const activeCards = creditCards.filter((card) => card.active !== false)
  const eligibleCategories = categories.filter(
    (category) => category.type === 'expense' || category.type === 'both',
  )
  const selectedCard = activeCards.find((card) => card.id === draft.cardId)
  const selectedCategory = eligibleCategories.find((category) => category.id === draft.categoryId)

  const installmentCount = Number(draft.installments)
  const schedule =
    selectedCard && draft.purchaseDate
      ? calculateInvoiceSchedule(draft.purchaseDate, selectedCard)
      : null
  const installmentAmounts =
    selectedCard && Number(draft.amount) > 0 && installmentCount >= 1
      ? splitInstallmentAmounts(Number(draft.amount), installmentCount)
      : []

  const previewDates = (() => {
    if (!schedule || !selectedCard || installmentCount < 1) return []

    const [year, month] = schedule.dueDate.split('-').map(Number)

    return Array.from({ length: Math.min(installmentCount, 4) }, (_, index) => {
      const date = new Date(year, month - 1 + index, 1)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(Number(selectedCard.dueDay), lastDay))

      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')
    })
  })()

  const update = (field, value) => {
    if (field === 'categoryId') {
      const category = eligibleCategories.find((item) => item.id === value)
      setDraft((current) => ({
        ...current,
        categoryId: value,
        categoryName: category?.name || '',
        categoryColor: category?.color || '',
        categoryIcon: category?.icon || '',
      }))
      return
    }

    if (field === 'cardId') {
      const card = activeCards.find((item) => item.id === value)
      setDraft((current) => ({
        ...current,
        cardId: value,
        cardName: card?.name || '',
        cardLast4: card?.last4 || '',
      }))
      return
    }

    setDraft((current) => ({ ...current, [field]: value }))
  }

  const isValid =
    Number(draft.amount) > 0 &&
    draft.categoryId &&
    draft.purchaseDate &&
    draft.cardId &&
    installmentCount >= 1 &&
    installmentCount <= 48

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-black text-[--text-primary]">{response.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">{response.text}</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[--brand-200] bg-[--brand-50] p-3">
        <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
        <p className="text-[11px] leading-relaxed text-[--brand-700]">
          A data da compra será preservada. Dashboard e relatórios usarão os vencimentos das
          faturas. Nada foi salvo até este momento.
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
        <Input
          label="Valor total da compra"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={draft.amount}
          onChange={(event) => update('amount', event.target.value)}
        />

        <Input
          label="Descrição"
          value={draft.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Ex.: Mercado"
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
          label="Data da compra"
          type="date"
          value={draft.purchaseDate}
          onChange={(event) => update('purchaseDate', event.target.value)}
        />

        <Select
          label="Cartão"
          value={draft.cardId}
          onChange={(event) => update('cardId', event.target.value)}
        >
          <option value="">Selecione</option>
          {activeCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
              {card.last4 ? ` •••• ${card.last4}` : ''}
            </option>
          ))}
        </Select>

        <Input
          label="Número de parcelas"
          type="number"
          min="1"
          max="48"
          value={draft.installments}
          onChange={(event) => update('installments', event.target.value)}
        />
      </div>

      {schedule && installmentAmounts.length > 0 && (
        <div className="rounded-2xl border border-[--brand-200] bg-[--brand-50] p-3.5">
          <div className="flex items-center gap-2">
            <ReceiptText size={15} className="text-[--brand-600]" />
            <p className="text-xs font-black text-[--brand-700]">Prévia das faturas</p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {previewDates.map((date, index) => (
              <div key={`${date}-${index}`} className="rounded-xl bg-white/60 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[--brand-600]">
                  {index + 1}/{installmentCount}
                </p>
                <p className="mt-0.5 text-xs font-black text-[--brand-700]">
                  {formatCurrency(installmentAmounts[index])}
                </p>
                <p className="mt-0.5 text-[10px] text-[--brand-600]">
                  Vencimento em {formatDate(date)}
                </p>
              </div>
            ))}
          </div>

          {installmentCount > 4 && (
            <p className="mt-2 text-[10px] text-[--brand-600]">
              Mais {installmentCount - 4} parcela
              {installmentCount - 4 === 1 ? '' : 's'} seguirá
              {installmentCount - 4 === 1 ? '' : 'ão'} mensalmente.
            </p>
          )}
        </div>
      )}

      {selectedCard && selectedCategory && (
        <p className="text-[10px] text-[--text-tertiary]">
          {selectedCard.name} · {selectedCategory.name} · compra em {formatDate(draft.purchaseDate)}
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
              installments: installmentCount,
              description: draft.description.trim() || 'Compra no cartão',
            })
          }
        >
          {installmentCount > 1 ? `Confirmar ${installmentCount} parcelas` : 'Confirmar compra'}
        </Button>
      </div>
    </div>
  )
}
