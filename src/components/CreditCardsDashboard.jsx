import React, { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Info,
  Layers3,
  Plus,
  ReceiptText,
  Settings2,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { buildCreditCardCenter, monthKeyFromDate, shiftMonthKey } from '../domain/creditCardCenter'
import { formatCurrency, formatDate } from '../utils'
import { Card } from './ui'
import InvoiceLifecycleModal from './InvoiceLifecycleModal'
import CreditCardsSettingsCard from './CreditCardsSettingsCard'
import PremiumGate from './PremiumGate'

const STATUS = {
  forming: ['Em formação', 'bg-[--brand-100] text-[--brand-700]'],
  closed: ['Fechada', 'bg-[--warning-bg] text-[--warning-text]'],
  due_today: ['Vence hoje', 'bg-[--danger-bg] text-[--danger-text]'],
  partially_paid: ['Parcial', 'bg-[--brand-100] text-[--brand-700]'],
  paid: ['Paga', 'bg-[--success-bg] text-[--success-text]'],
  overdue: ['Vencida', 'bg-[--danger-bg] text-[--danger-text]'],
  overdue_partial: ['Vencida parcial', 'bg-[--danger-bg] text-[--danger-text]'],
  overpaid: ['Crédito', 'bg-[--success-bg] text-[--success-text]'],
  past_due: ['Vencimento passado', 'bg-[--bg-hover] text-[--text-secondary]'],
  future: ['Futura', 'bg-[--bg-hover] text-[--text-tertiary]'],
  empty: ['Sem lançamentos', 'bg-[--bg-hover] text-[--text-tertiary]'],
}

function SummaryCard({ icon: Icon, label, value, helper }) {
  return (
    <Card className="shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[--text-tertiary]">
            {label}
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-[--text-primary]">{value}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">{helper}</p>
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-100] text-[--brand-600]">
          <Icon size={17} />
        </div>
      </div>
    </Card>
  )
}

function InvoiceCard({ invoice, selected, onSelect }) {
  const [statusLabel, statusClass] = STATUS[invoice.status] || STATUS.empty
  const { card, dates, lifecycle } = invoice

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-3xl border p-4 text-left transition-all ${
        selected
          ? 'border-[--brand-500] bg-[--brand-50] shadow-md'
          : 'border-[--border-default] bg-[--bg-surface] hover:-translate-y-0.5 hover:border-[--brand-300] hover:shadow-sm'
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[--brand-600] to-violet-600 text-white shadow-sm">
          <CreditCard size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-[--text-primary]">
              {card.name}
              {card.last4 ? ` •••• ${card.last4}` : ''}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>

          <p className="mt-1 text-[10px] text-[--text-tertiary]">
            Fecha em {formatDate(dates.closingDate)} · vence em {formatDate(dates.dueDate)}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                Total
              </p>
              <p className="mt-0.5 text-lg font-black text-[--text-primary]">
                {formatCurrency(invoice.total)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                Pendente
              </p>
              <p className="mt-0.5 text-sm font-black text-[--text-primary]">
                {formatCurrency(lifecycle.remainingAmount)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[--text-tertiary]">
            Pago: {formatCurrency(lifecycle.paidAmount)} · {invoice.itemCount} lançamento
            {invoice.itemCount === 1 ? '' : 's'}
          </p>

          {card.historicalOnly && (
            <p className="mt-2 text-[9px] leading-relaxed text-[--warning-text]">
              Cartão removido do cadastro; dados históricos preservados.
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

function TransactionRow({ transaction }) {
  const purchaseDate =
    transaction.purchaseDate || transaction.originalPurchaseDate || transaction.date

  return (
    <div className="credit-card-transaction flex min-w-0 flex-wrap items-center gap-3 border-b border-[--border-subtle] py-3 last:border-b-0 sm:flex-nowrap">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--bg-hover] text-base">
        {transaction.categoryIcon || '💳'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-bold text-[--text-primary]">
            {transaction.description || 'Compra no cartão'}
          </p>
          {transaction.isInstallment && (
            <span className="rounded-full bg-[--brand-100] px-2 py-0.5 text-[9px] font-black text-[--brand-700]">
              {transaction.installmentNum}/{transaction.installmentOf}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
          {transaction.categoryName || 'Sem categoria'} · compra em {formatDate(purchaseDate)}
        </p>
      </div>

      <p className="max-w-full break-words text-right text-xs font-black tabular-nums text-[--text-primary] [overflow-wrap:anywhere] sm:flex-shrink-0">
        {formatCurrency(transaction.amount)}
      </p>
    </div>
  )
}

function CreditCardsCenterContent() {
  const { transactions, creditCards, invoiceEvents, loading, createInvoiceEvent } = useApp()
  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate())
  const [selectedCardId, setSelectedCardId] = useState('all')
  const [managingCardId, setManagingCardId] = useState(null)
  const [cardSettingsOpen, setCardSettingsOpen] = useState(false)

  const center = useMemo(
    () =>
      buildCreditCardCenter({
        transactions,
        creditCards,
        invoiceEvents,
        selectedMonth,
        now: new Date(),
      }),
    [transactions, creditCards, invoiceEvents, selectedMonth],
  )

  const visibleInvoices =
    selectedCardId === 'all'
      ? center.invoices
      : center.invoices.filter((invoice) => invoice.card.id === selectedCardId)

  const visibleTransactions =
    selectedCardId === 'all'
      ? center.selectedTransactions
      : center.selectedTransactions.filter((transaction) => transaction.cardId === selectedCardId)

  const selectedInvoice =
    selectedCardId === 'all'
      ? null
      : center.invoices.find((invoice) => invoice.card.id === selectedCardId)
  const managedInvoice = center.invoices.find((invoice) => invoice.card.id === managingCardId)

  const loadingData = loading.transactions || loading.creditCards || loading.invoiceEvents

  return (
    <div className="operational-page credit-cards-premium mx-auto min-w-0 w-full max-w-7xl space-y-5 pb-24 lg:pb-6">
      <header className="operational-hero credit-cards-premium__hero overflow-hidden rounded-3xl border border-[--brand-200] bg-gradient-to-br from-slate-950 via-indigo-950 to-[--brand-700] p-5 text-white shadow-xl sm:p-6">
        <div className="operational-hero__layout flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/20 backdrop-blur">
              <WalletCards size={22} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Cartões e faturas
                </h1>
                <span className="rounded-full bg-cyan-300/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-100 ring-1 ring-cyan-200/20">
                  Premium
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
                Acompanhe vencimentos, parcelas e compromissos futuros sem confundir a data da
                compra com o mês da fatura.
              </p>
            </div>
          </div>

          <div className="operational-hero__actions flex flex-wrap gap-2">
            <Link
              to="/transactions"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-indigo-900 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Nova compra
            </Link>
            <button
              type="button"
              onClick={() => setCardSettingsOpen((current) => !current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur hover:bg-white/15"
              aria-expanded={cardSettingsOpen}
            >
              <Settings2 size={14} />
              {cardSettingsOpen ? 'Fechar cartões' : 'Meus cartões'}
            </button>
          </div>
        </div>
      </header>

      {cardSettingsOpen && (
        <section aria-label="Gerenciamento de cartões">
          <CreditCardsSettingsCard />
        </section>
      )}

      <Card className="shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[--brand-600]">
              Período da fatura
            </p>
            <h2 className="mt-1 text-lg font-black text-[--text-primary]">
              {center.selectedMonthLabel}
            </h2>
          </div>

          <div className="credit-cards-period flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonth((month) => shiftMonthKey(month, -1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[--border-default] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-hover]"
              aria-label="Fatura do mês anterior"
            >
              <ChevronLeft size={17} />
            </button>

            <label className="relative">
              <span className="sr-only">Selecionar mês da fatura</span>
              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-3 top-3.5 text-[--text-tertiary]"
              />
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value)
                  setSelectedCardId('all')
                }}
                className="min-h-11 w-full min-w-0 rounded-xl border border-[--border-default] bg-[--bg-surface] pl-9 pr-3 text-xs font-semibold text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] sm:w-auto"
              />
            </label>

            <button
              type="button"
              onClick={() => setSelectedMonth((month) => shiftMonthKey(month, 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[--border-default] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-hover]"
              aria-label="Fatura do próximo mês"
            >
              <ChevronRight size={17} />
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedMonth(monthKeyFromDate())
                setSelectedCardId('all')
              }}
              className="min-h-11 rounded-xl border border-[--brand-200] bg-[--brand-50] px-3 text-xs font-bold text-[--brand-700]"
            >
              Mês atual
            </button>
          </div>
        </div>
      </Card>

      {loadingData ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-[--bg-hover]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={CircleDollarSign}
              label="Total das faturas"
              value={formatCurrency(center.selectedTotal)}
              helper={`${center.selectedItemCount} lançamento${
                center.selectedItemCount === 1 ? '' : 's'
              } no período`}
            />
            <SummaryCard
              icon={CreditCard}
              label="Total pago"
              value={formatCurrency(center.selectedPaidTotal)}
              helper="Pagamentos líquidos, já descontados os estornos"
            />
            <SummaryCard
              icon={ReceiptText}
              label="Saldo pendente"
              value={formatCurrency(center.selectedRemainingTotal)}
              helper="Valor ainda necessário para liquidar as faturas"
            />
            <SummaryCard
              icon={Layers3}
              label="Parcelas futuras"
              value={formatCurrency(center.futureInstallmentTotal)}
              helper={`${center.futureInstallmentCount} parcela${
                center.futureInstallmentCount === 1 ? '' : 's'
              } após este mês`}
            />
          </div>

          {center.legacyCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-[--warning-border] bg-[--warning-bg] p-4">
              <Info size={17} className="mt-0.5 flex-shrink-0 text-[--warning-icon]" />
              <div>
                <p className="text-xs font-black text-[--text-primary]">
                  Existem compras antigas fora da consolidação
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[--text-secondary]">
                  Esses registros continuam nos relatórios gerais, mas não possuem cartão,
                  fechamento e vencimento suficientes para compor uma fatura estruturada.
                </p>
              </div>
            </div>
          )}

          <div className="credit-cards-premium__grid grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(380px,1.12fr)]">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[--text-primary]">
                      Próximos compromissos
                    </h2>
                    <p className="mt-1 text-[10px] text-[--text-tertiary]">
                      Previsão baseada nas compras já lançadas
                    </p>
                  </div>
                  <Sparkles size={16} className="text-[--brand-600]" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-3 2xl:grid-cols-6">
                  {center.forecast.map((item) => {
                    const height = Math.max(8, Math.round((item.total / center.forecastMax) * 62))
                    const active = item.month === selectedMonth

                    return (
                      <button
                        key={item.month}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(item.month)
                          setSelectedCardId('all')
                        }}
                        className={`rounded-2xl border p-2 text-center transition-colors ${
                          active
                            ? 'border-[--brand-500] bg-[--brand-50]'
                            : 'border-[--border-subtle] bg-[--bg-subtle] hover:border-[--brand-300]'
                        }`}
                      >
                        <div className="flex h-16 items-end justify-center">
                          <span
                            className="w-5 rounded-t-lg bg-gradient-to-t from-[--brand-600] to-cyan-400"
                            style={{ height }}
                          />
                        </div>
                        <p className="mt-2 truncate text-[9px] font-bold text-[--text-secondary]">
                          {item.label.split(' de ')[0]}
                        </p>
                        <p className="mt-0.5 text-[9px] font-black text-[--text-primary]">
                          {formatCurrency(item.total, { compact: true })}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </Card>

              <div className="space-y-3">
                {visibleInvoices.length === 0 ? (
                  <Card className="border-dashed text-center shadow-sm">
                    <CreditCard size={28} className="mx-auto text-[--text-tertiary]" />
                    <p className="mt-2 text-sm font-black text-[--text-primary]">
                      Nenhum cartão cadastrado
                    </p>
                    <p className="mt-1 text-xs text-[--text-tertiary]">
                      Cadastre fechamento e vencimento no Perfil.
                    </p>
                  </Card>
                ) : (
                  visibleInvoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.card.id}
                      invoice={invoice}
                      selected={selectedCardId === invoice.card.id}
                      onSelect={() =>
                        setSelectedCardId((current) =>
                          current === invoice.card.id ? 'all' : invoice.card.id,
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <Card className="overflow-hidden shadow-sm" padding={false}>
              <div className="border-b border-[--border-subtle] bg-gradient-to-r from-[--brand-50] to-[--bg-surface] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[--text-primary]">
                      Lançamentos da fatura
                    </h2>
                    <p className="mt-1 text-[10px] text-[--text-tertiary]">
                      {selectedCardId === 'all'
                        ? 'Todos os cartões'
                        : center.cards.find((card) => card.id === selectedCardId)?.name}
                    </p>
                  </div>

                  {selectedInvoice && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setManagingCardId(selectedInvoice.card.id)}
                        className="min-h-10 rounded-xl bg-[--brand-600] px-3 text-[10px] font-black text-white"
                      >
                        Gerenciar fatura
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCardId('all')}
                        className="min-h-10 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-[10px] font-bold text-[--text-secondary]"
                      >
                        Mostrar todos
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-[620px] overflow-y-auto p-4">
                {visibleTransactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <ReceiptText size={30} className="mx-auto text-[--text-tertiary]" />
                    <p className="mt-3 text-sm font-black text-[--text-primary]">
                      Nenhuma compra nesta fatura
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
                      Compras estruturadas aparecerão aqui conforme o vencimento calculado.
                    </p>
                  </div>
                ) : (
                  visibleTransactions.map((transaction, index) => (
                    <TransactionRow
                      key={transaction.id || `${transaction.cardId}-${transaction.date}-${index}`}
                      transaction={transaction}
                    />
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      <InvoiceLifecycleModal
        isOpen={Boolean(managingCardId)}
        invoice={managedInvoice}
        invoiceMonth={selectedMonth}
        onCreateEvent={createInvoiceEvent}
        onClose={() => setManagingCardId(null)}
      />
    </div>
  )
}

export default function CreditCardsDashboard() {
  return (
    <PremiumGate
      feature="Central de cartões e faturas"
      description="Consolide faturas, parcelas e próximos vencimentos em uma visão segura e organizada."
      benefits={[
        'Faturas agrupadas por cartão',
        'Previsão dos próximos meses',
        'Parcelas futuras consolidadas',
        'Histórico antigo preservado',
      ]}
    >
      <CreditCardsCenterContent />
    </PremiumGate>
  )
}
