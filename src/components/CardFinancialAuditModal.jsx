import { formatCurrency } from '../utils'
import { Modal } from './ui'

// Somente leitura. A Central já calculou os valores a partir dos dados da sessão.
export default function CardFinancialAuditModal({ center, linkageAudit, creditCards, onClose }) {
  const cents = (value) => Math.round(Number(value || 0) * 100)
  const ids = new Set()
  let invalidCards = 0
  for (const card of creditCards) {
    if (!card.id || ids.has(card.id)) invalidCards++
    if (card.id) ids.add(card.id)
  }

  let arithmeticIssues = 0
  let mixedPayments = 0
  for (const invoice of center.invoices) {
    const purchase = invoice.items.reduce((total, item) => total + (cents(item.amount) || 0), 0)
    const total = cents(invoice.lifecycle.invoiceTotal)
    const paid = cents(invoice.lifecycle.paidAmount)
    if (
      purchase !== cents(invoice.purchaseTotal) ||
      total !== Math.max(0, purchase + cents(invoice.lifecycle.adjustmentTotal)) ||
      cents(invoice.lifecycle.remainingAmount) !== Math.max(0, total - paid)
    ) {
      arithmeticIssues++
    }
    if (
      invoice.paymentSource === 'invoice_events' &&
      invoice.items.some((tx) => tx.paymentStatus === 'paid' || tx.isPaid === true)
    ) {
      mixedPayments++
    }
  }

  const review = linkageAudit.unlinked > 0 || center.reconciledPurchaseCount > 0 || mixedPayments > 0
  const critical = invalidCards > 0 || arithmeticIssues > 0
  const status = critical
    ? 'Inconsistências para investigar'
    : review
      ? 'Existem itens para revisar'
      : 'Conferência sem divergências de cálculo'
  const items = [
    ['Compras sem cartão salvo', linkageAudit.unlinked],
    ['Associações sugeridas, não salvas', center.reconciledPurchaseCount],
    ['Cartões com identificação inválida', invalidCards],
    ['Faturas com divergência de cálculo', arithmeticIssues],
    ['Fontes de pagamento em conflito', mixedPayments],
    ['Vínculos históricos (informativos)', linkageAudit.historical],
  ].filter(([, count]) => count > 0)

  return (
    <Modal isOpen onClose={onClose} title="Conferência financeira dos cartões" size="lg">
      <div className="space-y-4" aria-label="Resultado da auditoria financeira">
        <div role="status" className="rounded-xl border border-[--border-default] p-3">
          <p className="text-sm font-black text-[--text-primary]">{status}</p>
          <p className="mt-1 text-xs text-[--text-secondary]">
            Competência {center.selectedMonth} · {center.invoices.length} fatura(s).
            Cálculo sobre dados carregados nesta sessão, sem alterar o banco.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Total', center.selectedTotal],
            ['Pago', center.selectedPaidTotal],
            ['Pendente', center.selectedRemainingTotal],
            ['Parcelas futuras', center.futureInstallmentTotal],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-xl bg-[--bg-subtle] p-3">
              <p className="text-[10px] text-[--text-secondary]">{label}</p>
              <p className="mt-1 break-words text-sm font-black tabular-nums text-[--text-primary]">
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[--text-secondary]">
          {linkageAudit.saved} vínculos salvos · {linkageAudit.unlinked} compras sem cartão
        </p>
        <section aria-label="Alertas da conferência">
          <h3 className="text-xs font-black text-[--text-primary]">Pontos de atenção</h3>
          {items.length ? (
            <ul className="mt-2 space-y-2">
              {items.map(([label, count]) => (
                <li
                  key={label}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-[--border-subtle] p-2 text-xs text-[--text-secondary]"
                >
                  <span>{label}</span>
                  <strong>{count} ocorrência(s)</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[--text-secondary]">
              Nenhuma divergência detectada pelas verificações desta tela.
            </p>
          )}
        </section>
        <p className="text-[11px] leading-relaxed text-[--text-tertiary]">
          Vínculos históricos podem ser legítimos. Sugestões não estão salvas. Nenhum lançamento é
          corrigido automaticamente. O resultado não substitui conferência com o banco.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-xl bg-[--brand-600] px-4 text-xs font-black text-white"
        >
          Concluir conferência
        </button>
      </div>
    </Modal>
  )
}
