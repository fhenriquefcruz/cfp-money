import { expect, test } from 'vitest'
import {
  compareCardSnapshots,
  readSnapshotRecords,
  snapshotDate,
  summarizeSnapshotIdentity,
} from '../../scripts/card-snapshot-comparison.mjs'

const previous = {
  exportedAt: '2026-09-28T12:00:00.000Z',
  mode: 'spark',
  collections: {
    creditCards: [
      { id: null, name: 'CONFIDENTIAL OLD CARD' },
      { id: null, name: 'CONFIDENTIAL SECOND CARD' },
    ],
    transactions: [
      {
        id: 'tx-stable',
        type: 'expense',
        paymentMethod: 'credit_card',
        cardId: 'card-canonical',
        amount: 50.11,
      },
      {
        id: 'tx-legacy',
        type: 'expense',
        paymentMethod: 'credit_card',
        amount: 25.23,
      },
    ],
    invoiceEvents: [],
  },
}

const current = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-10-28T12:00:00.000Z',
  data: {
    creditCards: [
      { id: 'card-canonical', name: 'CONFIDENTIAL CURRENT CARD' },
      { id: 'card-another', name: 'CONFIDENTIAL ANOTHER CARD' },
    ],
    transactions: [
      {
        id: 'tx-stable',
        type: 'expense',
        paymentMethod: 'credit_card',
        cardId: 'card-canonical',
        amount: 50.11,
      },
      {
        id: 'tx-legacy',
        type: 'expense',
        paymentMethod: 'credit_card',
        amount: 25.23,
      },
    ],
    invoiceEvents: [],
  },
}

test('compara exportações de modos diferentes sem vincular cartões por nome', () => {
  const oldText = JSON.stringify(previous)
  const currentText = JSON.stringify(current)
  const audit = compareCardSnapshots(previous, current)
  expect(audit).toMatchObject({
    readOnly: true,
    previous: {
      counts: {
        cardRecords: 2,
        missingCardIds: 2,
        orphanCardReferences: 1,
        unlinkedPurchases: 1,
      },
    },
    current: {
      counts: {
        cardRecords: 2,
        validCardIds: 2,
        missingCardIds: 0,
        orphanCardReferences: 0,
        unlinkedPurchases: 1,
      },
      totals: { linked: 50.11, unlinked: 25.23 },
    },
    deltas: { cardRecords: 0, missingCardIds: -2, orphanCardReferences: -1 },
    sharedRecords: {
      commonTransactions: 2,
      unchangedCardReferences: 2,
      changedCardReferences: 0,
      changedAmounts: 0,
    },
    identityObservation: 'ids_present_in_new_export',
  })
  expect(JSON.stringify(audit)).not.toContain('tx-stable')
  expect(JSON.stringify(audit)).not.toContain('card-canonical')
  expect(JSON.stringify(audit)).not.toContain('CONFIDENTIAL')
  expect(JSON.stringify(previous)).toBe(oldText)
  expect(JSON.stringify(current)).toBe(currentText)
})

test('identifica mudanças reais nos vínculos e valores apenas com IDs de transação únicos', () => {
  const newInput = {
    ...current,
    data: {
      ...current.data,
      transactions: [
        { ...current.data.transactions[0], amount: 70.21, cardId: 'card-another' },
        current.data.transactions[1],
        { id: 'tx-new', type: 'income', amount: 1000 },
      ],
    },
  }
  const audit = compareCardSnapshots(previous, newInput)
  expect(audit.sharedRecords).toEqual({
    commonTransactions: 2,
    unchangedCardReferences: 1,
    changedCardReferences: 1,
    changedAmounts: 1,
  })
  expect(audit.deltas.missingCardIds).toBe(-2)
})

test('contabiliza duplicidades, valores ilegíveis e estornos órfãos sem imprimir IDs', () => {
  const exportData = {
    exportedAt: '2026-10-28T12:00:00Z',
    collections: {
      creditCards: [{ id: 'same' }, { id: 'same' }, { id: null }],
      transactions: [
        {
          id: 'duplicate',
          type: 'expense',
          paymentMethod: 'credit_card',
          cardId: 'same',
          amount: 0.1,
        },
        {
          id: 'duplicate',
          type: 'expense',
          paymentMethod: 'credit_card',
          cardId: 'gone',
          amount: 'bad',
        },
        {
          id: null,
          type: 'expense',
          paymentMethod: 'credit_card',
          amount: 0.2,
        },
        {
          id: 'cancelled',
          type: 'expense',
          paymentMethod: 'credit_card',
          paymentStatus: 'cancelled',
          amount: 1000,
        },
      ],
      invoiceEvents: [{ id: 'event', type: 'payment', cardId: 'gone' }],
    },
  }
  const report = summarizeSnapshotIdentity(exportData)
  expect(report).toEqual({
    counts: {
      cardRecords: 3,
      validCardIds: 1,
      missingCardIds: 1,
      duplicateCardIds: 1,
      creditPurchases: 3,
      linkedPurchases: 1,
      unlinkedPurchases: 1,
      orphanCardReferences: 1,
      missingTransactionIds: 1,
      duplicateTransactionIds: 1,
      invalidCreditAmounts: 1,
      invoiceEvents: 1,
      orphanInvoiceEvents: 1,
    },
    totals: { linked: 0.1, unlinked: 0.2, orphan: 0 },
  })
  expect(JSON.stringify(report)).not.toContain('gone')
})

test('não considera nomes iguais como IDs e ignora duplicidades na comparação individual', () => {
  const data = {
    ...current,
    data: {
      creditCards: [{ id: 'null' }, { id: 'undefined' }],
      transactions: [
        { id: 'duplicate', type: 'expense', cardId: 'fake', amount: 10 },
        { id: 'duplicate', type: 'expense', cardId: 'fake', amount: 20 },
      ],
      invoiceEvents: [],
    },
  }
  expect(summarizeSnapshotIdentity(data).counts.missingCardIds).toBe(2)
  expect(compareCardSnapshots(data, data).sharedRecords.commonTransactions).toBe(0)
})

test('preserva proveniência e não aceita arquivos invertidos ou formatos inválidos', () => {
  expect(snapshotDate(previous)).toBe('2026-09-28T12:00:00.000Z')
  expect(snapshotDate({ exportedAt: 'invalid' })).toBeNull()
  expect(readSnapshotRecords(current).creditCards).toHaveLength(2)
  expect(() => compareCardSnapshots(current, previous)).toThrow(/posterior/)
  expect(() => readSnapshotRecords({ data: { creditCards: {}, transactions: [] } })).toThrow(
    /incompatível/,
  )
})

test('não contabiliza alterações em salários e receitas como mudança de fatura', () => {
  const before = {
    exportedAt: '2026-09-01T00:00:00Z',
    collections: {
      creditCards: [],
      transactions: [{ id: 'salary', type: 'income', amount: 1000 }],
    },
  }
  const after = {
    exportedAt: '2026-10-01T00:00:00Z',
    collections: {
      creditCards: [],
      transactions: [{ id: 'salary', type: 'income', amount: 1500 }],
    },
  }
  expect(compareCardSnapshots(before, after).sharedRecords).toEqual({
    commonTransactions: 0,
    unchangedCardReferences: 0,
    changedCardReferences: 0,
    changedAmounts: 0,
  })
})
