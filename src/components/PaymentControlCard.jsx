import React from 'react'
import { CheckCircle2, Clock3, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils'
import { Card, ProgressBar } from './ui'

function comparisonLabel(comparison = {}) {
  const percent = comparison.committedDeltaPercent

  if (percent === null || percent === undefined) return null
  if (percent === 0) return 'Mesmo comprometimento do mês anterior'

  const absolute = Math.abs(percent).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })

  return `${absolute}% ${percent > 0 ? 'acima' : 'abaixo'} do mês anterior`
}

export default function PaymentControlCard({ summary, loading = false }) {
  const committedAmount = summary.committedAmount ?? summary.totalAmount ?? 0
  const paidAmount = summary.paidAmount ?? 0
  const toPayAmount =
    summary.toPayAmount ?? (summary.pendingAmount ?? 0) + (summary.overdueAmount ?? 0)
  const overdueAmount = summary.overdueAmount ?? 0
  const dueNext7DaysAmount = summary.dueNext7DaysAmount ?? 0
  const unknownAmount = summary.unknownAmount ?? 0

  const comparison = comparisonLabel(summary.comparison)
  const unknownCount = summary.unknownCount ?? 0
  const toPayCount = summary.toPayCount ?? summary.pendingCount ?? 0

  return (
    <Card className="payment-control-card" variant="elevated">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ReceiptText size={16} className="text-[--brand-600]" />
            <h2 className="text-sm font-bold text-[--text-primary]">Controle de pagamentos</h2>
          </div>

          <p className="mt-1 text-xs text-[--text-tertiary]">
            {summary.totalCount > 0
              ? `${summary.paidCount} de ${summary.totalCount} obrigações pagas`
              : 'Nenhuma obrigação cadastrada neste mês'}
          </p>

          {summary.card?.itemCount > 0 && (
            <p className="mt-1 text-[10px] text-[--text-tertiary]">
              Cartões seguem automaticamente os pagamentos registrados nas faturas.
            </p>
          )}
        </div>

        <Link
          to="/transactions"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-[--text-brand] hover:underline"
        >
          Gerenciar
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[--bg-hover]" />
      ) : (
        <>
          <div className="dashboard-payment-overview mt-4 flex flex-wrap items-center gap-4">
            <div
              className="dashboard-payment-ring relative h-20 w-20 shrink-0"
              role="img"
              aria-label={`${Number(summary.progress || 0).toFixed(0)}% do valor comprometido já foi pago`}
            >
              <svg viewBox="0 0 80 80" aria-hidden="true" className="h-full w-full -rotate-90">
                <circle cx="40" cy="40" r="33" fill="none" stroke="#242937" strokeWidth="7" />
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="7"
                  strokeDasharray={`${Math.max(0, Math.min(100, summary.progress || 0)) * 2.073} 207.3`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-[--text-primary]">
                {(summary.progress ?? 0).toFixed(0)}%
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[11px] text-[--text-secondary]">
                {summary.paidCount} / {summary.totalCount} obrigações pagas
              </p>
              <p className="text-xs font-semibold text-emerald-400">
                Pago: {formatCurrency(paidAmount)}
              </p>
              <p className="text-xs font-semibold text-amber-300">
                A pagar: {formatCurrency(toPayAmount)}
              </p>
              {toPayCount > 0 && (
                <Link
                  to="/transactions?status=pending"
                  className="dashboard-payment-quick inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-bold"
                >
                  Dar baixa{' '}
                  <span className="ml-1" aria-hidden="true">
                    →
                  </span>
                </Link>
              )}
            </div>
          </div>
          <div className="payment-control-columns mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="payment-control-column payment-control-column--committed min-w-0">
              <p className="text-[10px] text-[--text-tertiary]">Comprometido</p>
              <p className="break-words text-sm font-black tabular-nums text-[--text-primary] [overflow-wrap:anywhere]">
                {formatCurrency(committedAmount)}
              </p>
            </div>

            <div className="payment-control-column payment-control-column--paid min-w-0">
              <p className="flex items-center gap-1 text-[10px] text-[--success-text]">
                <CheckCircle2 size={11} /> Pago
              </p>
              <p className="break-words text-sm font-black tabular-nums text-[--success-text] [overflow-wrap:anywhere]">
                {formatCurrency(paidAmount)}
              </p>
            </div>

            <div className="payment-control-column payment-control-column--pending min-w-0">
              <p className="flex items-center gap-1 text-[10px] text-[--warning-text]">
                <Clock3 size={11} /> A pagar
              </p>
              <p className="break-words text-sm font-black tabular-nums text-[--warning-text] [overflow-wrap:anywhere]">
                {formatCurrency(toPayAmount)}
              </p>
            </div>

            <div className="payment-control-column payment-control-column--late min-w-0">
              <p className="text-[10px] font-semibold text-[--danger-text]">Atrasado</p>
              <p className="break-words text-sm font-black tabular-nums text-[--danger-text] [overflow-wrap:anywhere]">
                {formatCurrency(overdueAmount)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-[--bg-hover] px-3 py-2">
              <p className="text-[10px] font-semibold text-[--text-secondary]">Próximos 7 dias</p>
              <p className="mt-0.5 text-xs font-bold tabular-nums text-[--text-primary]">
                {formatCurrency(dueNext7DaysAmount)}
              </p>
            </div>

            {comparison && (
              <div className="rounded-xl bg-[--bg-hover] px-3 py-2">
                <p className="text-[10px] font-semibold text-[--text-secondary]">
                  Comparação mensal
                </p>
                <p className="mt-0.5 text-xs font-bold text-[--text-primary]">{comparison}</p>
              </div>
            )}
          </div>

          {unknownCount > 0 && (
            <div className="mt-3 rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 py-2">
              <p className="text-xs font-bold text-[--warning-text]">
                {unknownCount} {unknownCount === 1 ? 'item' : 'itens'} a revisar
              </p>
              <p className="mt-0.5 text-[10px] text-[--warning-text]">
                {formatCurrency(unknownAmount)} sem status de pagamento confirmado.
              </p>
            </div>
          )}

          <div
            className="mt-4"
            role="progressbar"
            aria-label="Progresso dos pagamentos do mês"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(summary.progress ?? 0)}
          >
            <ProgressBar value={paidAmount} max={committedAmount} animated />

            <div className="mt-1 flex flex-wrap justify-between gap-1 text-[10px] text-[--text-tertiary]">
              <span>{(summary.progress ?? 0).toFixed(0)}% pago</span>
              <span>{toPayCount} a pagar</span>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
