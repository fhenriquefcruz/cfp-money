import { expect, test } from 'vitest'
import { auditCardLinkage } from './cardLinkageAudit'

const creditCards = [{ id: 'card-active', name: 'Ativo' }]
const expense = {
  type: 'expense',
  paymentMethod: 'credit_card',
  date: '2026-10-12',
}

test('separa vínculos salvos, compras sem vínculo e cartões apenas históricos', () => {
  const transactions = [
    { ...expense, id: 'linked', amount: 219.9, cardId: 'card-active' },
    { ...expense, id: 'historical', amount: 52.11, cardId: 'card-removed' },
    { ...expense, id: 'unlinked-a', amount: 0.1 },
    { ...expense, id: 'unlinked-b', amount: 0.2 },
  ]

  const result = auditCardLinkage({ transactions, creditCards })
  expect(result).toMatchObject({
    linked: 2,
    historical: 1,
    unlinked: 2,
  })
  expect(transactions[2].cardId).toBeUndefined()
  expect(creditCards).toHaveLength(1)
})

test('não trata cartão removido como compra sem vínculo nem força reassociação', () => {
  const historical = {
    ...expense,
    id: 'archived',
    amount: 99,
    cardId: 'archived-card',
    cardName: 'Cartão antigo',
  }
  const result = auditCardLinkage({ transactions: [historical], creditCards: [] })
  expect(result.linked).toBe(1)
  expect(result.historical).toBe(1)
  expect(result.unlinked).toBe(0)
  expect(historical.cardId).toBe('archived-card')
})

test('sinaliza separadamente compras de crédito sem método elegível para conciliação', () => {
  const result = auditCardLinkage({
    creditCards,
    transactions: [
      { ...expense, amount: 25, paymentMethod: 'pix', isCreditPurchase: true },
      { ...expense, amount: 35 },
      { ...expense, amount: 40, paymentStatus: 'cancelled' },
      { ...expense, amount: 50, isSavings: true },
      { ...expense, amount: 60, type: 'income' },
    ],
  })

  expect(result.unlinked).toBe(2)
})

test('retorna métricas zeradas sem dados e não modifica os parâmetros', () => {
  const transactions = Object.freeze([
    Object.freeze({ ...expense, amount: 12.35, cardId: 'card-active' }),
  ])
  const cards = Object.freeze([Object.freeze({ ...creditCards[0] })])

  expect(auditCardLinkage()).toMatchObject({
    linked: 0,
    unlinked: 0,
    historical: 0,
  })
  expect(auditCardLinkage({ transactions, creditCards: cards })).toMatchObject({
    linked: 1,
    unlinked: 0,
  })
})
