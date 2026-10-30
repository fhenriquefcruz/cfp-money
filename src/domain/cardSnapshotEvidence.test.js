import { expect, test } from 'vitest'
import { assessCardSnapshotEvidence } from '../../scripts/card-snapshot-evidence.mjs'
import { compareCardSnapshots } from '../../scripts/card-snapshot-comparison.mjs'

const now = new Date('2026-10-30T15:00:00.000Z')
const complete = () => ({
  exportedAt: '2026-10-29T12:00:00.000Z',
  collections: {
    creditCards: [{ id: 'private-card', name: 'NOME_PRIVADO' }],
    transactions: [
      {
        id: 'private-transaction',
        type: 'expense',
        paymentMethod: 'credit_card',
        cardId: 'private-card',
        amount: 20.12,
      },
    ],
    invoiceEvents: [],
  },
})

test('exportação recente e completa é revisável, mas não equivale a conciliação bancária', () => {
  const source = complete()
  const before = JSON.stringify(source)
  const evidence = assessCardSnapshotEvidence(source, { now })

  expect(evidence).toMatchObject({
    level: 'reviewable',
    warnings: [],
    collections: {
      creditCards: 1,
      transactions: 1,
      invoiceEvents: 0,
      invoiceEventsIncluded: true,
    },
    exportTimestampVerified: true,
    bankReconciliation: false,
  })
  expect(JSON.stringify(evidence)).not.toContain('NOME_PRIVADO')
  expect(JSON.stringify(evidence)).not.toContain('private-card')
  expect(JSON.stringify(source)).toBe(before)
})

test('backup vazio e sem eventos exportados não valida cartões nem pagamentos', () => {
  const evidence = assessCardSnapshotEvidence(
    { collections: { creditCards: [], transactions: [] } },
    { now },
  )
  expect(evidence.level).toBe('insufficient')
  expect(evidence.warnings).toEqual([
    'export_timestamp_missing',
    'invoice_events_not_exported',
    'no_credit_activity_in_export',
  ])
  expect(evidence.exportTimestampVerified).toBe(false)
})

test('exportação antiga com IDs ambíguos, valores ilegíveis e horário futuro recebe ressalvas', () => {
  const source = complete()
  source.exportedAt = '2026-09-01T12:00:00.000Z'
  source.collections.creditCards.push({ id: 'private-card' })
  source.collections.transactions.push({
    id: 'private-transaction',
    type: 'expense',
    paymentMethod: 'credit_card',
    cardId: 'private-card',
    amount: 'INVÁLIDO_PRIVADO',
  })
  source.collections.transactions.push({
    id: 'boolean-amount',
    type: 'expense',
    paymentMethod: 'credit_card',
    amount: false,
  })
  source.collections.transactions.push({
    id: 'blank-amount',
    type: 'expense',
    paymentMethod: 'credit_card',
    amount: '   ',
  })
  const evidence = assessCardSnapshotEvidence(source, { now })
  expect(evidence.level).toBe('limited')
  expect(evidence.warnings).toEqual(
    expect.arrayContaining([
      'export_older_than_30_days',
      'ambiguous_card_identifiers',
      'ambiguous_transaction_identifiers',
      'invalid_credit_amounts',
    ]),
  )
  expect(evidence.collections.transactions).toBe(4)
  expect(JSON.stringify(evidence)).not.toContain('INVÁLIDO_PRIVADO')

  source.exportedAt = '2026-11-01T12:00:00.000Z'
  expect(assessCardSnapshotEvidence(source, { now }).warnings).toContain(
    'export_timestamp_in_future',
  )
})

test('comparação sem IDs compartilhados ou cronologia comprovada é limitada', () => {
  const previous = complete()
  const current = complete()
  delete previous.exportedAt
  previous.collections.transactions[0].id = 'old-private-id'
  const comparison = compareCardSnapshots(previous, current)
  const evidence = assessCardSnapshotEvidence(current, { comparison, now })

  expect(evidence.level).toBe('limited')
  expect(evidence.warnings).toEqual(
    expect.arrayContaining([
      'comparison_chronology_unverified',
      'no_shared_unique_credit_transactions',
    ]),
  )
  expect(evidence.bankReconciliation).toBe(false)
})

test('evento de fatura sem cartão cadastrado exige revisão sem expor o identificador', () => {
  const source = complete()
  source.collections.invoiceEvents.push({
    cardId: 'event-card-private',
    type: 'payment',
    amount: 12.34,
  })
  const evidence = assessCardSnapshotEvidence(source, { now })
  expect(evidence.level).toBe('limited')
  expect(evidence.warnings).toContain('invoice_events_without_registered_card')
  expect(JSON.stringify(evidence)).not.toContain('event-card-private')
})
