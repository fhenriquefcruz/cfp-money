const FINDING_COPY = {
  over_reversed_payment: [
    'Estornos acima do pagamento',
    'A soma dos estornos supera o pagamento de origem. Confira os eventos e o extrato antes de corrigir o histórico.',
  ],
  cross_invoice_payment_reversal: [
    'Estorno vinculado a outra fatura',
    'O pagamento de origem está associado a outro cartão ou competência. Verifique os vínculos sem transferir valores automaticamente.',
  ],
  ambiguous_payment_reversal_origin: [
    'Origem de estorno ambígua',
    'Mais de um pagamento possui o mesmo identificador. Revise o histórico antes de relacionar o estorno.',
  ],
  unmatched_payment_reversal: [
    'Estorno sem pagamento identificado',
    'O pagamento de origem não foi encontrado nos eventos carregados. Confira se falta algum registro.',
  ],
  invalid_reversal_event_amount: [
    'Valor de estorno inválido',
    'O estorno possui valor não positivo, ilegível ou com fração de centavo.',
  ],
  invalid_payment_event_amount: [
    'Valor de pagamento inválido',
    'O pagamento de origem possui valor não positivo, ilegível ou com fração de centavo.',
  ],
  mixed_payment_sources: [
    'Duas fontes de pagamento',
    'Há pagamentos tanto nos eventos da fatura quanto nos estados das compras. Confira qual fonte representa a liquidação real.',
  ],
  invoice_arithmetic_mismatch: [
    'Valores da fatura divergentes',
    'A soma de compras, ajustes, pagamentos e saldo não corresponde aos valores apresentados.',
  ],
  dashboard_invoice_totals_mismatch: [
    'Totais de faturas divergentes',
    'Os totais individuais não correspondem ao consolidado desta competência.',
  ],
  saved_purchase_ledger_mismatch: [
    'Compras vinculadas divergentes',
    'O total dos lançamentos salvos difere do valor exibido na fatura.',
  ],
  invalid_purchase_amount: [
    'Valor de compra ilegível',
    'Um lançamento de cartão precisa de revisão antes de ser usado na conciliação.',
  ],
  invalid_invoice_month: [
    'Competência de compra inválida',
    'Um lançamento possui mês de fatura inválido. Confira o histórico da compra.',
  ],
  invalid_invoice_month_without_id: [
    'Competência inválida sem identificador',
    'Há lançamento com mês de fatura inválido e sem ID estável para identificação.',
  ],
  duplicate_transaction_id: [
    'Lançamentos com ID duplicado',
    'Dois lançamentos de cartão usam o mesmo identificador. Revise antes de conciliar.',
  ],
  duplicate_card_registration_id: [
    'Cartões com ID duplicado',
    'Existem cadastros de cartão com o mesmo identificador.',
  ],
  missing_card_registration_id: [
    'Cartão sem identificador',
    'Um cadastro de cartão não possui ID estável.',
  ],
  unlinked_credit_purchases: [
    'Compras sem cartão vinculado',
    'Existem compras de crédito que precisam de vínculo explícito com um cartão.',
  ],
  unsaved_card_match_preview: [
    'Correspondências ainda não confirmadas',
    'O sistema encontrou possíveis vínculos apenas para consulta. Eles não foram salvos.',
  ],
  historical_card_references: [
    'Referências históricas preservadas',
    'Há lançamentos associados a cartões removidos. Isso não significa, por si só, erro financeiro.',
  ],
}

const SEVERITY_RANK = { critical: 0, review: 1, info: 2 }

export function describeCardAuditFindings(findings = [], invoiceCards = []) {
  const cardsById = new Map(invoiceCards.filter((card) => card?.id).map((card) => [card.id, card]))

  return findings
    .map((finding, index) => {
      const [title, guidance] = FINDING_COPY[finding.code] || [
        'Registro financeiro a conferir',
        'Confira os lançamentos associados antes de qualquer correção manual.',
      ]
      const card = cardsById.get(finding.cardId)
      const scope = [
        finding.cardId ? card?.name || 'Cartão sem cadastro atual' : '',
        finding.invoiceMonth ? `Fatura ${finding.invoiceMonth}` : '',
      ]
        .filter(Boolean)
        .join(' · ')

      return {
        ...finding,
        key: `${finding.code}-${index}`,
        title,
        guidance,
        scope,
        rank: SEVERITY_RANK[finding.severity] ?? 3,
        index,
      }
    })
    .sort((first, second) => first.rank - second.rank || first.index - second.index)
}
