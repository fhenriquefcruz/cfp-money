import React from 'react'
import { CheckCircle2, Clock3, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils'
import { Card, ProgressBar } from './ui'

export default function PaymentControlCard({ summary, loading = false }) {
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
              ? `${summary.paidCount} de ${summary.totalCount} despesas pagas`
              : 'Nenhuma despesa cadastrada neste mês'}
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
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-[--bg-hover]" />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-[--text-tertiary]">Total</p>
              <p className="break-words text-sm font-black tabular-nums text-[--text-primary] [overflow-wrap:anywhere]">
                {formatCurrency(summary.totalAmount)}
              </p>
            </div>
            <div className="min-w-0 border-l border-[--border-subtle] pl-2">
              <p className="flex items-center gap-1 text-[10px] text-[--success-text]">
                <CheckCircle2 size={11} /> Pago
              </p>
              <p className="break-words text-sm font-black tabular-nums text-[--success-text] [overflow-wrap:anywhere]">
                {formatCurrency(summary.paidAmount)}
              </p>
            </div>
            <div className="min-w-0 border-l border-[--border-subtle] pl-2">
              <p className="flex items-center gap-1 text-[10px] text-[--warning-text]">
                <Clock3 size={11} /> Pendente
              </p>
              <p className="break-words text-sm font-black tabular-nums text-[--warning-text] [overflow-wrap:anywhere]">
                {formatCurrency(summary.pendingAmount)}
              </p>
            </div>
          </div>
          <div
            className="mt-3"
            role="progressbar"
            aria-label="Progresso dos pagamentos do mês"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(summary.progress)}
          >
            <ProgressBar value={summary.paidAmount} max={summary.totalAmount} animated />
            <div className="mt-1 flex justify-between text-[10px] text-[--text-tertiary]">
              <span>{summary.progress.toFixed(0)}% pago</span>
              <span>
                {summary.pendingCount} pendente{summary.pendingCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
