import {
  formatTransactionIsoDate,
  getTransactionAccountingDate,
  getTransactionActivityDate,
  getTransactionDateContext,
  getTransactionLedgerDate,
  getTransactionPurchaseDate,
  isProtectedTransactionGroup,
  isStructuredCreditPurchase,
} from './transactionDates'

const creditPurchase = {
  type: 'expense',
  paymentMethod: 'credit_card',
  isCreditPurchase: true,
  purchaseDate: '2026-07-25',
  originalPurchaseDate: '2026-07-25',
  date: '2026-09-01',
  dueDate: '2026-09-01',
  isInstallment: true,
  installmentGroupId: 'group-1',
}

test('distingue compra de cartão estruturada', () => {
  expect(isStructuredCreditPurchase(creditPurchase)).toBe(true)
  expect(getTransactionPurchaseDate(creditPurchase)).toBe('2026-07-25')
  expect(getTransactionAccountingDate(creditPurchase)).toBe('2026-09-01')
  expect(getTransactionActivityDate(creditPurchase)).toBe('2026-07-25')
})

test('expõe contexto de compra e fatura sem mudar a competência', () => {
  expect(getTransactionDateContext(creditPurchase)).toEqual({
    structuredCredit: true,
    purchaseDate: '2026-07-25',
    transactionDate: '2026-09-01',
    accountingDate: '2026-09-01',
    activityDate: '2026-07-25',
    purchaseLabel: '25/07/2026',
    transactionLabel: '01/09/2026',
    accountingLabel: '01/09/2026',
    hasSeparateAccountingDate: true,
  })
})

test('transação comum usa a data da movimentação como atividade', () => {
  const transaction = {
    type: 'expense',
    paymentMethod: 'pix',
    date: '2026-07-13',
    dueDate: '2026-07-11',
  }

  expect(getTransactionDateContext(transaction)).toMatchObject({
    structuredCredit: false,
    purchaseDate: '2026-07-13',
    transactionDate: '2026-07-13',
    accountingDate: '2026-07-11',
    activityDate: '2026-07-13',
    transactionLabel: '13/07/2026',
    accountingLabel: '11/07/2026',
    hasSeparateAccountingDate: false,
  })
})

test('formata data ISO sem depender do fuso', () => {
  expect(formatTransactionIsoDate('2026-12-31')).toBe('31/12/2026')
  expect(formatTransactionIsoDate('')).toBe('data indisponível')
})

test('identifica série que não deve ser alterada isoladamente', () => {
  expect(isProtectedTransactionGroup(creditPurchase)).toBe(true)
  expect(
    isProtectedTransactionGroup({
      type: 'expense',
      date: '2026-07-10',
    }),
  ).toBe(false)
})

test('extrato distribui parcelas por fatura e mantém atividade de compra', () => {
  const installments = ['2026-09-01', '2026-10-01', '2026-11-01'].map((date, index) => ({
    ...creditPurchase,
    installmentNum: index + 1,
    date,
    dueDate: date,
  }))
  expect(installments.map(getTransactionLedgerDate)).toEqual([
    '2026-09-01', '2026-10-01', '2026-11-01',
  ])
  expect(installments.map(getTransactionActivityDate)).toEqual([
    '2026-07-25', '2026-07-25', '2026-07-25',
  ])
})

test('extrato mantém parcelas manuais por data e usa fallback em crédito legado', () => {
  expect(getTransactionLedgerDate({
    type: 'expense', paymentMethod: 'pix', isInstallment: true, date: '2026-12-05',
  })).toBe('2026-12-05')
  expect(getTransactionLedgerDate({
    type: 'expense', paymentMethod: 'credit_card', isCreditPurchase: true,
    purchaseDate: '2026-07-25', date: '2026-09-01', dueDate: 'data inválida',
  })).toBe('2026-09-01')
})
