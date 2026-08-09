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
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
            <div className="min-w-0">
              <p className="text-[10px] text-[--text-tertiary]">Comprometido</p>
              <p className="break-words text-sm font-black tabular-nums text-[--text-primary] [overflow-wrap:anywhere]">
                {formatCurrency(committedAmount)}
              </p>
            </div>

            <div className="min-w-0 border-l border-[--border-subtle] pl-3">
              <p className="flex items-center gap-1 text-[10px] text-[--success-text]">
                <CheckCircle2 size={11} /> Pago
              </p>
              <p className="break-words text-sm font-black tabular-nums text-[--success-text] [overflow-wrap:anywhere]">
                {formatCurrency(paidAmount)}
              </p>
            </div>

            <div className="min-w-0 sm:border-l sm:border-[--border-subtle] sm:pl-3">
              <p className="flex items-center gap-1 text-[10px] text-[--warning-text]">
                <Clock3 size={11} /> A pagar
              </p>
              <p className="break-words text-sm font-black tabular-nums text-[--warning-text] [overflow-wrap:anywhere]">
                {formatCurrency(toPayAmount)}
              </p>
            </div>

            <div className="min-w-0 border-l border-[--border-subtle] pl-3">
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
