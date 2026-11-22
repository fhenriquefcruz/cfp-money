import { describe, expect, test } from 'vitest'
import { buildCreditCardCenter } from './creditCardCenter'
import { auditCreditCardFinancialParity } from './creditCardFinancialParity'
import { buildCategoryBreakdown } from './dashboard'
import { calculateBudgetUsage, summarizeTransactions, transactionsForMonth } from './finance'
import { getMonthlyFinancialData } from './monthlyFinance'
import { buildSavingsOverview, getGoalEffectiveCurrent } from './savings'
import { analyzeMoney } from './money'
import {
  creditCard,
  invoiceEvents,
  reference,
  savingsPrecisionGoal,
  savingsPrecisionTransactions,
  transactions,
} from './financialHomologationFixture'
import {
  buildPaymentStatusIndex,
  canToggleTransactionPayment,
  getTransactionPaymentState,
  PAYMENT_STATUS,
} from './paymentControl'

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
      getTransactionPaymentState(
        transactions.find((item) => item.id === 'july-purchase'),
        paymentIndex,
      ).status,
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
  test('Relatórios, Money, Reservas e Metas preservam o mesmo resultado com aportes e retiradas', () => {
    const month = getMonthlyFinancialData(savingsPrecisionTransactions, 1, reference)[0]
    const monthly = summarizeTransactions(
      transactionsForMonth(savingsPrecisionTransactions, 2026, 7),
    )
    const money = analyzeMoney(
      savingsPrecisionTransactions,
      { cycleType: 'calendar_month', comparisonMode: 'full_cycle' },
      '2026-08-10',
    )
    const reserve = buildSavingsOverview(savingsPrecisionTransactions, {
      start: '2026-08-01',
      end: '2026-08-31',
    })
    const effectiveGoal = getGoalEffectiveCurrent(
      savingsPrecisionGoal,
      savingsPrecisionTransactions,
    )

    expect(monthly).toMatchObject({
      income: 0,
      expenses: 0,
      savings: 0.29,
      balance: 0,
      count: 3,
    })
    expect(month).toMatchObject({
      income: monthly.income,
      expenses: monthly.expenses,
      savings: monthly.savings,
      balance: monthly.balance,
    })
    expect(money.current).toMatchObject({ income: 0, expenses: 0, balance: 0 })
    expect(reserve).toMatchObject({
      totalBalance: monthly.savings,
      periodNet: monthly.savings,
    })
    expect(effectiveGoal).toBe(3.79)
    expect(savingsPrecisionGoal.currentAmount).toBe('3.50')
  })
})
