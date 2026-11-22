// Cenário de homologação somente em memória, com datas de compra, vencimento,
// competência, pagamento parcial, estorno, transferência e saldo de reserva.
export const creditCard = {
  id: 'card-a',
  name: 'Cartão de homologação',
  closingDay: 5,
  dueDay: 12,
  active: true,
}
const cardPurchase = (id, amount, purchaseDate, invoiceMonth, extra = {}) => ({
  id,
  type: 'expense',
  paymentMethod: 'credit_card',
  isCreditPurchase: true,
  cardId: creditCard.id,
  categoryId: 'food',
  categoryName: 'Alimentação',
  date: `${invoiceMonth}-12`,
  dueDate: `${invoiceMonth}-12`,
  purchaseDate,
  invoiceMonth,
  amount,
  ...extra,
})
export const transactions = [
  { id: 'salary-july', type: 'income', amount: '500.00', date: '2026-07-04' },
  { id: 'salary-aug', type: 'income', amount: '1000.00', date: '2026-08-03' },
  {
    id: 'cash-food',
    type: 'expense',
    amount: '10.01',
    categoryId: 'food',
    categoryName: 'Alimentação',
    date: '2026-08-07',
    dueDate: '2026-09-02',
  },
  cardPurchase('july-purchase', '100.03', '2026-07-24', '2026-08'),
  cardPurchase('august-installment', '20.01', '2026-08-05', '2026-08', {
    isInstallment: true,
    installmentNum: 1,
    installmentOf: 2,
  }),
  cardPurchase('september-commitment', '30.02', '2026-08-18', '2026-09', {
    isInstallment: true,
    installmentNum: 2,
    installmentOf: 2,
  }),
  { id: 'reserve-deposit', type: 'income', amount: 25, isSavings: true, date: '2026-08-22' },
  {
    id: 'internal-transfer',
    type: 'expense',
    amount: 200,
    flowType: 'transfer',
    date: '2026-08-10',
  },
  { id: 'cancelled', type: 'expense', amount: 999, paymentStatus: 'cancelled', date: '2026-08-11' },
]
export const invoiceEvents = [
  {
    id: 'pay-one',
    type: 'payment',
    cardId: creditCard.id,
    invoiceKey: 'card-a:2026-08',
    invoiceMonth: '2026-08',
    amount: 50.01,
  },
  {
    id: 'pay-two',
    type: 'payment',
    cardId: creditCard.id,
    invoiceKey: 'card-a:2026-08',
    invoiceMonth: '2026-08',
    amount: 20.02,
  },
  {
    id: 'reversal-one-cent',
    type: 'reversal',
    reversesEventId: 'pay-one',
    cardId: creditCard.id,
    invoiceKey: 'card-a:2026-08',
    invoiceMonth: '2026-08',
    amount: 0.01,
  },
]
export const reference = new Date(2026, 7, 10)

