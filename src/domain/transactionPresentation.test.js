import {
  getTransactionKind,
  matchesTransactionKind,
  transactionKindLabel,
  TRANSACTION_KIND,
} from './transactionPresentation'

test('distingue receita, despesa, transferência e aporte', () => {
  expect(getTransactionKind({ type: 'income' })).toBe(TRANSACTION_KIND.INCOME)
  expect(getTransactionKind({ type: 'expense' })).toBe(TRANSACTION_KIND.EXPENSE)
  expect(getTransactionKind({ type: 'expense', flowType: 'transfer' })).toBe(
    TRANSACTION_KIND.TRANSFER,
  )
  expect(getTransactionKind({ type: 'expense', isSavings: true })).toBe(TRANSACTION_KIND.SAVINGS)
})

test('filtra pelo tipo apresentado ao usuário', () => {
  const transfer = { type: 'expense', kind: 'transfer' }
  expect(matchesTransactionKind(transfer, 'transfer')).toBe(true)
  expect(matchesTransactionKind(transfer, 'expense')).toBe(false)
  expect(matchesTransactionKind(transfer, 'all')).toBe(true)
})

test('usa rótulos explícitos sem depender apenas de cor', () => {
  expect(transactionKindLabel('income')).toBe('Receita')
  expect(transactionKindLabel('expense')).toBe('Despesa')
  expect(transactionKindLabel('transfer')).toBe('Transferência')
  expect(transactionKindLabel('savings')).toBe('Aporte / reserva')
})
