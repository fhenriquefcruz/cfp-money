import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  History,
  LockKeyhole,
  Receipt,
  RotateCcw,
  Scale,
  Wallet,
} from 'lucide-react'
import {
  createAdjustmentEvent,
  createManualCloseEvent,
  createPaymentEvent,
  createReversalEvent,
  getPaymentReversibleAmount,
} from '../domain/invoiceLifecycle'
import { formatCurrency, formatDate } from '../utils'
import { Button, Modal } from './ui'

function todayIso() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

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

  return (
    Number(
      String(masked)
        .replace(/\./g, '')
        .replace(',', '.'),
    ) || 0
  )
}

const EVENT_LABELS = {
  payment: 'Pagamento',
  reversal: 'Estorno',
  adjustment: 'Ajuste',
  manual_close: 'Fechamento manual',
}

function EventRow({ event, allEvents, invoice, onReverse, loading }) {
  const reversible =
    event.type === 'payment'
      ? getPaymentReversibleAmount(event, allEvents)
      : 0

  const value =
    event.type === 'adjustment'
      ? Number(event.signedAmount || 0)
      : event.type === 'reversal'
        ? -Number(event.amount || 0)
        : Number(event.amount || 0)

  return (
    <div className="flex items-start gap-3 border-b border-[--border-subtle] py-3 last:border-b-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--bg-hover] text-[--text-secondary]">
        {event.type === 'payment' ? (
          <CheckCircle2 size={15} />
        ) : event.type === 'reversal' ? (
          <RotateCcw size={15} />
        ) : event.type === 'adjustment' ? (
          <Scale size={15} />
        ) : (
          <LockKeyhole size={15} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-[--text-primary]">
          {EVENT_LABELS[event.type] || 'Evento'}
        </p>
        <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
          {formatDate(event.eventDate || event.paymentDate)}
          {event.sourceAccount ? ` · ${event.sourceAccount}` : ''}
        </p>
        {event.notes && (
          <p className="mt-1 text-[10px] leading-relaxed text-[--text-secondary]">
            {event.notes}
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {event.type !== 'manual_close' && (
          <p
            className={`text-xs font-black ${
              value < 0
                ? 'text-[--success-icon]'
                : 'text-[--text-primary]'
            }`}
          >
            {value < 0 ? '−' : ''}
            {formatCurrency(Math.abs(value))}
          </p>
        )}

        {reversible > 0 && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onReverse(event, invoice)}
            className="min-h-8 rounded-lg px-2 text-[9px] font-black text-[--danger-text] hover:bg-[--danger-bg] disabled:opacity-50"
          >
            Estornar
          </button>
        )}
      </div>
    </div>
  )
}

export default function InvoiceLifecycleModal({
  isOpen,
  invoice,
  invoiceMonth,
  onCreateEvent,
  onClose,
}) {
  const [tab, setTab] = useState('payment')
  const [amount, setAmount] = useState('')
  const [eventDate, setEventDate] = useState(todayIso())
  const [sourceAccount, setSourceAccount] = useState('')
  const [notes, setNotes] = useState('')
  const [direction, setDirection] = useState('credit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lifecycle = invoice?.lifecycle
  const events = lifecycle?.events || []

  useEffect(() => {
    if (!isOpen || !invoice) return

    setTab('payment')
    setAmount(
      maskCurrency(
        String(
          Math.round(
            Number(lifecycle?.remainingAmount || 0) * 100,
          ),
        ),
      ),
    )
    setEventDate(todayIso())
    setSourceAccount('')
    setNotes('')
    setDirection('credit')
    setError('')
  }, [
    invoice?.card?.id,
    invoiceMonth,
    isOpen,
    lifecycle?.remainingAmount,
  ])

  const paymentSummary = useMemo(
    () => ({
      total: lifecycle?.invoiceTotal || 0,
      paid: lifecycle?.paidAmount || 0,
      remaining: lifecycle?.remainingAmount || 0,
      credit: lifecycle?.creditAmount || 0,
    }),
    [lifecycle],
  )

  const submitEvent = async (event) => {
    setLoading(true)
    setError('')

    try {
      await onCreateEvent(event)
      setNotes('')
      if (event.type === 'payment') {
        setAmount('')
        setSourceAccount('')
      }
    } catch (submitError) {
      setError(
        submitError?.message ||
          'Não foi possível registrar o evento.',
      )
      throw submitError
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!invoice) return

    try {
      if (tab === 'payment') {
        await submitEvent(
          createPaymentEvent({
            card: invoice.card,
            invoiceMonth,
            amount: parseCurrency(amount),
            paymentDate: eventDate,
            sourceAccount,
            notes,
          }),
        )
        return
      }

      await submitEvent(
        createAdjustmentEvent({
          card: invoice.card,
          invoiceMonth,
          amount: parseCurrency(amount),
          direction,
          eventDate,
          notes,
        }),
      )
    } catch {
      // O erro já foi exibido.
    }
  }

  const handleManualClose = async () => {
    if (!invoice) return

    try {
      await submitEvent(
        createManualCloseEvent({
          card: invoice.card,
          invoiceMonth,
          eventDate,
          notes,
        }),
      )
    } catch {
      // O erro já foi exibido.
    }
  }

  const handleReverse = async (payment) => {
    try {
      await submitEvent(
        createReversalEvent({
          card: invoice.card,
          invoiceMonth,
          payment,
          invoiceEvents: events,
          eventDate: todayIso(),
          notes: `Estorno do pagamento de ${formatCurrency(
            payment.amount,
          )}.`,
        }),
      )
    } catch {
      // O erro já foi exibido.
    }
  }

  if (!invoice) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fatura ${invoice.card.name} · ${invoiceMonth}`}
      size="lg"
      closeOnBackdrop={false}
      closeOnEscape={!loading}
      footer={
        tab === 'history' ? (
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            Fechar
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={loading}
              onClick={handleSubmit}
            >
              {tab === 'payment'
                ? 'Registrar pagamento'
                : 'Registrar ajuste'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Total', paymentSummary.total],
            ['Pago', paymentSummary.paid],
            ['Pendente', paymentSummary.remaining],
            ['Crédito', paymentSummary.credit],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3"
            >
              <p className="text-[9px] font-black uppercase tracking-wider text-[--text-tertiary]">
                {label}
              </p>
              <p className="mt-1 text-sm font-black text-[--text-primary]">
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['payment', 'Pagamento', Wallet],
            ['adjustment', 'Ajuste', Scale],
            ['history', 'Histórico', History],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value)
                setError('')
              }}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-[10px] font-black ${
                tab === value
                  ? 'border-[--brand-500] bg-[--brand-50] text-[--brand-700]'
                  : 'border-[--border-default] bg-[--bg-surface] text-[--text-secondary]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab !== 'history' && (
          <div className="space-y-4">
            {tab === 'adjustment' && (
              <div>
                <p className="mb-2 text-xs font-black text-[--text-secondary]">
                  Tipo de ajuste
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('credit')}
                    className={`min-h-11 rounded-xl border text-xs font-bold ${
                      direction === 'credit'
                        ? 'border-[--success-border] bg-[--success-bg] text-[--success-text]'
                        : 'border-[--border-default] text-[--text-secondary]'
                    }`}
                  >
                    Crédito / desconto
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('charge')}
                    className={`min-h-11 rounded-xl border text-xs font-bold ${
                      direction === 'charge'
                        ? 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]'
                        : 'border-[--border-default] text-[--text-secondary]'
                    }`}
                  >
                    Acréscimo
                  </button>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="invoice-event-amount"
                className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
              >
                {tab === 'payment'
                  ? 'Valor pago'
                  : 'Valor do ajuste'}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[--text-secondary]">
                  R$
                </span>
                <input
                  id="invoice-event-amount"
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) =>
                    setAmount(maskCurrency(event.target.value))
                  }
                  className="min-h-12 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] pl-10 pr-3 text-lg font-black text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="invoice-event-date"
                className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
              >
                Data do evento
              </label>
              <input
                id="invoice-event-date"
                type="date"
                value={eventDate}
                onChange={(event) =>
                  setEventDate(event.target.value)
                }
                className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
              />
            </div>

            {tab === 'payment' && (
              <div>
                <label
                  htmlFor="invoice-source-account"
                  className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
                >
                  Conta utilizada
                </label>
                <input
                  id="invoice-source-account"
                  type="text"
                  value={sourceAccount}
                  onChange={(event) =>
                    setSourceAccount(event.target.value)
                  }
                  placeholder="Ex.: Banco do Brasil"
                  className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="invoice-event-notes"
                className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
              >
                Observações
              </label>
              <textarea
                id="invoice-event-notes"
                rows={3}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder={
                  tab === 'adjustment'
                    ? 'O motivo é obrigatório para ajustes.'
                    : 'Informação opcional.'
                }
                className="w-full resize-none rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-2.5 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
              />
            </div>

            {!lifecycle?.manuallyClosed && (
              <button
                type="button"
                disabled={loading}
                onClick={handleManualClose}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[--border-default] bg-[--bg-subtle] px-3 text-xs font-bold text-[--text-secondary] disabled:opacity-50"
              >
                <LockKeyhole size={14} />
                Marcar fatura como fechada
              </button>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div>
            <div className="flex items-center gap-2 rounded-xl bg-[--brand-50] p-3 text-[10px] leading-relaxed text-[--brand-700]">
              <Receipt size={14} className="flex-shrink-0" />
              Pagamentos ficam fora de Transações para não duplicar
              despesas já contabilizadas pelas compras.
            </div>

            <div className="mt-3 max-h-[360px] overflow-y-auto">
              {events.length ? (
                events.map((event, index) => (
                  <EventRow
                    key={event.id || `${event.type}-${index}`}
                    event={event}
                    allEvents={events}
                    invoice={invoice}
                    onReverse={handleReverse}
                    loading={loading}
                  />
                ))
              ) : (
                <div className="py-10 text-center">
                  <History
                    size={28}
                    className="mx-auto text-[--text-tertiary]"
                  />
                  <p className="mt-2 text-sm font-black text-[--text-primary]">
                    Nenhum evento registrado
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[--danger-border] bg-[--danger-bg] p-3 text-xs text-[--danger-text]"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
