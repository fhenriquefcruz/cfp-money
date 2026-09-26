const STATUS_PRESENTATION = {
  forming: {
    label: 'Aberta',
    tone: 'brand',
    helper: 'Ainda pode receber novas compras antes do fechamento.',
  },
  closed: {
    label: 'Fechada',
    tone: 'warning',
    helper: 'Fatura fechada e aguardando pagamento.',
  },
  due_today: {
    label: 'Vence hoje',
    tone: 'danger',
    helper: 'O vencimento desta fatura é hoje.',
  },
  partially_paid: {
    label: 'Pagamento parcial',
    tone: 'warning',
    helper: 'Uma parte já foi paga, mas ainda existe saldo pendente.',
  },
  paid: {
    label: 'Paga',
    tone: 'success',
    helper: 'Nenhum valor pendente nesta fatura.',
  },
  overdue: {
    label: 'Vencida',
    tone: 'danger',
    helper: 'Existe saldo pendente após o vencimento.',
  },
  overdue_partial: {
    label: 'Vencida',
    tone: 'danger',
    helper: 'Houve pagamento parcial, mas ainda existe saldo vencido.',
  },
  overpaid: {
    label: 'Paga',
    tone: 'success',
    helper: 'A fatura foi quitada e existe crédito registrado.',
  },
  past_due: {
    label: 'Vencimento passado',
    tone: 'neutral',
    helper: 'Não há compras suficientes para consolidar uma fatura atual.',
  },
  future: {
    label: 'Fatura futura',
    tone: 'neutral',
    helper: 'Esta competência ainda está no futuro.',
  },
  empty: {
    label: 'Sem compras',
    tone: 'neutral',
    helper: 'Nenhuma compra foi vinculada a esta fatura.',
  },
}

export function getSimpleInvoiceStatus(status) {
  return STATUS_PRESENTATION[status] || STATUS_PRESENTATION.empty
}

export function buildInvoiceReading(invoice) {
  if (!invoice) return null

  return {
    total: Number(invoice.total) || 0,
    paid: Number(invoice.lifecycle?.paidAmount) || 0,
    remaining: Number(invoice.lifecycle?.remainingAmount) || 0,
    dueDate: invoice.dates?.dueDate || '',
    closingDate: invoice.dates?.closingDate || '',
    itemCount: Number(invoice.itemCount) || 0,
    installmentCount: Number(invoice.installmentCount) || 0,
    status: getSimpleInvoiceStatus(invoice.status),
  }
}
