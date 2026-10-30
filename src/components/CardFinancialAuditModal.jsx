import { useMemo } from 'react'
import { auditCreditCardFinancialParity } from '../domain/creditCardFinancialParity'
import { formatCurrency } from '../utils'
import { Modal } from './ui'

const FINDING_LABELS = {
  missing_card_registration_id: 'Cartão cadastrado sem identificador',
  duplicate_card_registration_id: 'Identificador de cartão duplicado',
  duplicate_transaction_id: 'Compra com identificador duplicado',
  invalid_purchase_amount: 'Compra com valor inválido',
  invalid_invoice_month: 'Compra com mês de fatura inválido',
  invalid_invoice_month_without_id: 'Mês de fatura inválido sem ID de compra',
  unlinked_credit_purchases: 'Compras sem cartão salvo',
  historical_card_references: 'Compras ligadas a cartões históricos',
  unsaved_card_match_preview: 'Associações sugeridas, ainda não salvas',
  mixed_payment_sources: 'Pagamentos manuais e status de compra coexistem',
  unmatched_payment_reversal: 'Estorno sem pagamento correspondente nesta fatura',
  invoice_arithmetic_mismatch: 'Divergência no cálculo de uma fatura',
  dashboard_invoice_totals_mismatch: 'Divergência entre faturas e resumo',
  saved_purchase_ledger_mismatch: 'Divergência entre compras salvas e valores mostrados',
}

const STATUS = {
  critical: ['Encontramos inconsistências', 'text-[--danger-text]'],
  review: ['Itens precisam de conferência', 'text-[--warning-text]'],
  ok: ['Cálculos conferidos', 'text-[--success-text]'],
}

export default function CardFinancialAuditModal({
  onClose,
  selectedMonth,
  transactions,
  creditCards,
  invoiceEvents,
}) {
  // A auditoria usa apenas dados já carregados pela sessão e não executa writes ou rede.
  const audit = useMemo(
    () =>
      auditCreditCardFinancialParity({
        transactions,
        creditCards,
        invoiceEvents,
        selectedMonth,
        now: new Date(),
      }),
    [transactions, creditCards, invoiceEvents, selectedMonth],
  )
  const findings = useMemo(() => {
    const byCode = new Map()
    for (const item of audit.findings) {
      const current = byCode.get(item.code)
      byCode.set(item.code, {
        code: item.code,
        severity: item.severity,
        count: (current?.count || 0) + (item.count || 1),
      })
    }
    return [...byCode.values()]
  }, [audit.findings])
  const [heading, color] = STATUS[audit.status]

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title="Conferência financeira dos cartões"
    >
      <div className="space-y-4" aria-label="Resultado da auditoria financeira">
        <div role="status" className="rounded-2xl border border-[--border-subtle] p-4">
          <p className={`text-sm font-black ${color}`}>{heading}</p>
          <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">
            Competência {audit.invoiceMonth} · {audit.counts.invoices} cartão(ões) conferido(s).
            Cálculo sobre dados carregados nesta sessão, sem consultar ou alterar o banco.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Faturas', audit.totals.invoiceTotal],
            ['Pagamentos', audit.totals.paidTotal],
            ['Pendente', audit.totals.remainingTotal],
            ['Parcelas futuras', audit.totals.futureInstallments],
          ].map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 rounded-xl border border-[--border-subtle] bg-[--bg-subtle] p-3"
            >
              <p className="text-[10px] font-bold text-[--text-secondary]">{label}</p>
              <p className="mt-1 break-words text-sm font-black tabular-nums text-[--text-primary]">
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-[--text-secondary]">
          <span className="rounded-lg border border-[--border-default] px-2.5 py-1.5">
            {audit.counts.saved} vínculos salvos
          </span>
          <span className="rounded-lg border border-[--border-default] px-2.5 py-1.5">
            {audit.counts.unlinked} compras sem cartão
          </span>
          <span className="rounded-lg border border-[--border-default] px-2.5 py-1.5">
            {audit.counts.historical} vínculos históricos
          </span>
          <span className="rounded-lg border border-[--border-default] px-2.5 py-1.5">
            {audit.counts.previewMatches} sugestões não salvas
          </span>
        </div>

        <section aria-label="Alertas da conferência" className="space-y-2">
          <h3 className="text-sm font-black text-[--text-primary]">Pontos de atenção</h3>
          {findings.length === 0 ? (
            <p className="text-xs text-[--text-secondary]">
              Nenhuma divergência detectada pelas regras automáticas.
            </p>
          ) : (
            <ul className="space-y-2">
              {findings.map((item) => (
                <li
                  key={item.code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[--border-subtle] px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-[--text-primary]">
                    {FINDING_LABELS[item.code] || 'Registro para conferência'}
                  </span>
                  <span className="text-[--text-secondary]">{item.count} ocorrência(s)</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] leading-relaxed text-[--text-tertiary]">
          Alertas são indicativos, não provam erro financeiro. Vínculos históricos podem ser
          legítimos. Associações sugeridas não são consideradas salvas. Nenhum lançamento é
          corrigido automaticamente. O resultado não substitui conferência com o extrato do banco.
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
