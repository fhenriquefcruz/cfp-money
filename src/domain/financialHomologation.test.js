import { describe, expect, test } from 'vitest'
import { buildCreditCardCenter } from './creditCardCenter'
import { auditCreditCardFinancialParity } from './creditCardFinancialParity'
import { buildCategoryBreakdown } from './dashboard'
import { calculateBudgetUsage, summarizeTransactions, transactionsForMonth } from './finance'
import { getMonthlyFinancialData } from './monthlyFinance'
import { analyzeMoney } from './money'
import {
  buildPaymentStatusIndex,
  canToggleTransactionPayment,
  getTransactionPaymentState,
  PAYMENT_STATUS,
} from './paymentControl'

// Cenário de homologação somente em memória, com datas de compra, vencimento,
// competência, pagamento parcial, estorno, transferência e saldo de reserva.
const creditCard = {
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
const transactions = [
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
  { id: 'internal-transfer', type: 'expense', amount: 200, flowType: 'transfer', date: '2026-08-10' },
  { id: 'cancelled', type: 'expense', amount: 999, paymentStatus: 'cancelled', date: '2026-08-11' },
]
const invoiceEvents = [
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
const reference = new Date(2026, 7, 10)

describe('homologação integrada: atividade de compra e resultado mensal', () => {
  test('Transações, Dashboard mensal, Money e Orçamento mostram a mesma despesa por atividade', () => {
    const augustTransactions = transactionsForMonth(transactions, 2026, 7)
    const august = summarizeTransactions(augustTransactions)
    const monthly = getMonthlyFinancialData(transactions, 2, reference)
    const money = analyzeMoney(
      transactions,
      { cycleType: 'calendar_month', comparisonMode: 'full_cycle' },
      '2026-08-10',
    )
    const budget = calculateBudgetUsage(
      transactions,
      { categoryId: 'food', amount: '100.00' },
      reference,
    )

    expect(august).toMatchObject({
      income: 1000,
      expenses: 60.04,
      balance: 939.96,
      savings: 25,
    })
    expect(monthly.map((item) => item.monthKey)).toEqual(['2026-07', '2026-08'])
    expect(monthly[1]).toMatchObject({
      income: august.income,
      expenses: august.expenses,
      balance: august.balance,
    })
    expect(money.current).toMatchObject({
      income: august.income,
      expenses: august.expenses,
      balance: august.balance,
    })
    expect(money.previous).toMatchObject({
      income: 500,
      expenses: 100.03,
      balance: 399.97,
    })
    expect(budget.spent).toBe(60.04)
    expect(budget.percent).toBeCloseTo(60.04, 10)
    expect(buildCategoryBreakdown([{ categoryId: 'food', total: budget.spent }])[0]).toMatchObject({
      total: 60.04,
      sharePercent: 100,
    })
    expect(augustTransactions.map((item) => item.id)).not.toContain('july-purchase')
    expect(augustTransactions.map((item) => item.id)).toContain('september-commitment')
  })

  test('pagar ou estornar fatura não cria nova despesa no mês da liquidação', () => {
    const before = summarizeTransactions(transactionsForMonth(transactions, 2026, 7))
    const after = summarizeTransactions(transactionsForMonth(transactions, 2026, 7))
    const center = buildCreditCardCenter({
      transactions,
      creditCards: [creditCard],
      invoiceEvents,
      selectedMonth: '2026-08',
      now: reference,
    })

    expect(after).toEqual(before)
    expect(center).toMatchObject({
      selectedPurchaseTotal: 120.04,
      selectedTotal: 120.04,
      selectedPaidTotal: 70.02,
      selectedRemainingTotal: 50.02,
      selectedCreditTotal: 0,
      futureInstallmentTotal: 30.02,
    })
    expect(center.invoices[0].paymentSource).toBe('invoice_events')
    expect(center.invoices[0].lifecycle).toMatchObject({
      paymentCount: 2,
      reversalCount: 1,
      status: 'partially_paid',
    })

    const paymentIndex = buildPaymentStatusIndex({
      transactions,
      creditCards: [creditCard],
      invoiceEvents,
      now: reference,
    })
    expect(
      getTransactionPaymentState(transactions.find((item) => item.id === 'july-purchase'), paymentIndex)
        .status,
    ).toBe(PAYMENT_STATUS.PARTIAL)
    expect(canToggleTransactionPayment(transactions[3])).toBe(false)

    const audit = auditCreditCardFinancialParity({
      transactions,
      creditCards: [creditCard],
      invoiceEvents,
      selectedMonth: '2026-08',
      now: reference,
    })
    expect(audit.status).toBe('ok')
    expect(audit.findings).toEqual([])
    expect(audit.totals).toMatchObject({
      invoiceTotal: center.selectedTotal,
      paidTotal: center.selectedPaidTotal,
      remainingTotal: center.selectedRemainingTotal,
      futureInstallments: center.futureInstallmentTotal,
    })
  })

  test('o mesmo histórico segue sem mudanças após filtros, cálculo e auditoria', () => {
    const originalTransactions = structuredClone(transactions)
    const originalEvents = structuredClone(invoiceEvents)
    getMonthlyFinancialData(transactions, 2, reference)
    analyzeMoney(transactions, { comparisonMode: 'full_cycle' }, '2026-08-10')
    auditCreditCardFinancialParity({
      transactions,
      creditCards: [creditCard],
      invoiceEvents,
      selectedMonth: '2026-08',
      now: reference,
    })

    expect(transactions).toEqual(originalTransactions)
    expect(invoiceEvents).toEqual(originalEvents)
  })
})
