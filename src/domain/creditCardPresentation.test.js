import { buildInvoiceReading, getSimpleInvoiceStatus } from './creditCardPresentation'

test('traduz estados técnicos para linguagem simples', () => {
  expect(getSimpleInvoiceStatus('forming')).toMatchObject({
    label: 'Aberta',
    tone: 'brand',
  })
  expect(getSimpleInvoiceStatus('overdue_partial')).toMatchObject({
    label: 'Vencida',
    tone: 'danger',
  })
  expect(getSimpleInvoiceStatus('paid')).toMatchObject({
    label: 'Paga',
    tone: 'success',
  })
})

test('resume a fatura nos valores que o usuário precisa entender', () => {
  expect(
    buildInvoiceReading({
      status: 'partially_paid',
      total: 900,
      itemCount: 4,
      installmentCount: 2,
      dates: {
        closingDate: '2026-09-03',
        dueDate: '2026-09-10',
      },
      lifecycle: {
        paidAmount: 300,
        remainingAmount: 600,
      },
    }),
  ).toMatchObject({
    total: 900,
    paid: 300,
    remaining: 600,
    dueDate: '2026-09-10',
    itemCount: 4,
    installmentCount: 2,
    status: {
      label: 'Pagamento parcial',
    },
  })
})
