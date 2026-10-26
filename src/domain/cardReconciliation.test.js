import { expect, test } from 'vitest'
import { isUnlinkedCreditPurchase, previewCardReconciliation } from './cardReconciliation'

const card = {
  id: 'firestore-card-01',
  name: 'Cartão pessoal',
  last4: '3210',
  closingDay: 5,
  dueDay: 12,
}

const legacy = {
  id: 'old-01',
  type: 'expense',
  paymentMethod: 'credit_card',
  amount: 219.9,
  date: '2026-08-12',
  installmentNum: 2,
  installmentOf: 5,
  categoryId: 'transport',
}

test('só considera compras de crédito sem vínculo para conciliação', () => {
  expect(isUnlinkedCreditPurchase(legacy)).toBe(true)
  expect(isUnlinkedCreditPurchase({ ...legacy, cardId: 'other' })).toBe(false)
  expect(isUnlinkedCreditPurchase({ ...legacy, paymentMethod: 'pix' })).toBe(false)
  expect(isUnlinkedCreditPurchase({ ...legacy, paymentStatus: 'cancelled' })).toBe(false)
  expect(isUnlinkedCreditPurchase({ ...legacy, isSavings: true })).toBe(false)
})

test('preserva o mês contábil de registros sem data original de compra', () => {
  const preview = previewCardReconciliation(legacy, card)
  expect(preview).toMatchObject({
    cardId: 'firestore-card-01',
    invoiceMonth: '2026-08',
    cardLast4: '3210',
  })
  expect(preview).not.toHaveProperty('date')
  expect(preview).not.toHaveProperty('amount')
  expect(preview).not.toHaveProperty('installmentNum')
  expect(legacy.cardId).toBeUndefined()
})

test('respeita vencimento previamente registrado antes de recalcular a competência', () => {
  expect(previewCardReconciliation({ ...legacy, dueDate: '2026-09-12' }, card).invoiceMonth)
    .toBe('2026-09')
  expect(previewCardReconciliation({ ...legacy, invoiceMonth: '2026-10' }, card).invoiceMonth)
    .toBe('2026-10')
})

test('calcula a competência pelo ciclo somente quando a data de compra é explícita', () => {
  expect(
    previewCardReconciliation({ ...legacy, purchaseDate: '2026-08-06' }, card).invoiceMonth,
  ).toBe('2026-09')
  expect(
    previewCardReconciliation({ ...legacy, purchaseDate: '2026-08-04' }, card).invoiceMonth,
  ).toBe('2026-08')
})

test('recusa cartão inválido, compras vinculadas e competência ausente', () => {
  expect(() => previewCardReconciliation(legacy, { name: 'Sem ID' })).toThrow('cartão')
  expect(() => previewCardReconciliation({ ...legacy, cardId: 'other' }, card)).toThrow('elegível')
  expect(() => previewCardReconciliation({ ...legacy, date: '' }, card)).toThrow('competência')
})
