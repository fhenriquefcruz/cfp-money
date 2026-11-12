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

test('parcelas estruturadas aparecem pela competência da fatura sem mudar a data da compra', () => {
  const installment = {
    ...creditPurchase,
    purchaseDate: '2026-11-05',
    originalPurchaseDate: '2026-11-05',
    date: '2027-01-20',
    dueDate: '2027-01-20',
    invoiceMonth: '2027-01',
    installmentNum: 3,
    installmentOf: 3,
  }
  expect(getTransactionLedgerDate(installment)).toBe('2027-01-20')
  expect(getTransactionLedgerDate(installment, 'activity')).toBe('2026-11-05')
  expect(getTransactionActivityDate(installment)).toBe('2026-11-05')
  expect(
    getTransactionLedgerDate({ type: 'expense', paymentMethod: 'pix', date: '2026-11-05' }),
  ).toBe('2026-11-05')
})

test('compra vinculada antiga sem flag de crédito respeita vencimento sem alterar atividade canônica', () => {
  const legacy = {
    type: 'expense',
    paymentMethod: 'credit_card',
    cardId: 'card-legado',
    purchaseDate: '2026-11-05',
    date: '2026-12-20',
    dueDate: '2026-12-20',
    isInstallment: true,
    installmentNum: 2,
    installmentOf: 3,
  }
  expect(getTransactionLedgerDate(legacy)).toBe('2026-12-20')
  expect(getTransactionLedgerDate(legacy, 'activity')).toBe('2026-12-20')
  expect(getTransactionActivityDate(legacy)).toBe('2026-12-20')
})

test('compra de cartão sem vencimento legado conserva a data disponível', () => {
  expect(
    getTransactionLedgerDate({
      type: 'expense',
      paymentMethod: 'credit_card',
      isCreditPurchase: true,
      purchaseDate: '2026-11-25',
    }),
  ).toBe('2026-11-25')
})
