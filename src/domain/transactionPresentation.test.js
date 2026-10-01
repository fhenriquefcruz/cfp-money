import { getTransactionKind, transactionKindLabel } from './transactionPresentation'

test('distingue receita, despesa, transferência e aporte', () => {
  expect(getTransactionKind({ type: 'income' })).toBe('income')
  expect(getTransactionKind({ type: 'expense' })).toBe('expense')
  expect(getTransactionKind({ type: 'expense', flowType: 'transfer' })).toBe('transfer')
  expect(getTransactionKind({ type: 'expense', isSavings: true })).toBe('savings')
})

test('transferência não é apresentada como despesa', () => {
  expect(getTransactionKind({ type: 'expense', kind: 'transfer' })).toBe('transfer')
  expect(transactionKindLabel('transfer')).toBe('Transferência')
})

test('usa rótulos explícitos sem depender apenas de cor', () => {
  expect(transactionKindLabel('income')).toBe('Receita')
  expect(transactionKindLabel('expense')).toBe('Despesa')
  expect(transactionKindLabel('savings')).toBe('Aporte / reserva')
})
