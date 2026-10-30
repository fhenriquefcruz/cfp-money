import {
  readSnapshotRecords,
  snapshotDate,
  summarizeSnapshotIdentity,
} from './card-snapshot-comparison.mjs'

// Qualidade da evidencia, nunca comprovacao de saldo bancario ou migracao.
export function assessCardSnapshotEvidence(
  snapshot,
  { comparison = null, now = new Date() } = {},
) {
  const records = readSnapshotRecords(snapshot)
  const identity = summarizeSnapshotIdentity(snapshot)
  const exportedAt = snapshotDate(snapshot)
  const rawCollections = snapshot?.collections || snapshot?.data || snapshot
  const warnings = []
  const add = (code, condition) => {
    if (condition) warnings.push(code)
  }

  const hasInvoiceEvents = Array.isArray(rawCollections?.invoiceEvents)
  const clock = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const ageDays =
    exportedAt && Number.isFinite(clock)
      ? (clock - Date.parse(exportedAt)) / 86_400_000
      : null

  add('export_timestamp_missing', !exportedAt)
  add('export_timestamp_in_future', ageDays !== null && ageDays < -5 / 1440)
  add('export_older_than_30_days', ageDays !== null && ageDays > 30)
  add('invoice_events_not_exported', !hasInvoiceEvents)
  add(
    'ambiguous_card_identifiers',
    identity.counts.missingCardIds > 0 || identity.counts.duplicateCardIds > 0,
  )
  add(
    'ambiguous_transaction_identifiers',
    identity.counts.missingTransactionIds > 0 || identity.counts.duplicateTransactionIds > 0,
  )
  add('invalid_credit_amounts', identity.counts.invalidCreditAmounts > 0)

  if (comparison) {
    add(
      'comparison_chronology_unverified',
      !comparison.periods.previousExportedAt || !comparison.periods.currentExportedAt,
    )
    add(
      'no_shared_unique_credit_transactions',
      comparison.previous.counts.creditPurchases > 0 &&
        comparison.current.counts.creditPurchases > 0 &&
        comparison.sharedRecords.commonTransactions === 0,
    )
  }

  const hasCreditEvidence = identity.counts.creditPurchases > 0 || records.invoiceEvents.length > 0
  const level = !hasCreditEvidence ? 'insufficient' : warnings.length ? 'limited' : 'reviewable'

  return {
    level,
    scope: 'full_export',
    warnings: !hasCreditEvidence ? [...warnings, 'no_credit_activity_in_export'] : warnings,
    collections: {
      creditCards: records.creditCards.length,
      transactions: records.transactions.length,
      invoiceEvents: records.invoiceEvents.length,
      invoiceEventsIncluded: hasInvoiceEvents,
    },
    exportTimestampVerified: Boolean(exportedAt),
    ageDays: ageDays === null ? null : Math.max(0, Math.floor(ageDays)),
    bankReconciliation: false,
    interpretation:
      'A qualidade da exportacao permite apenas revisar dados locais; nao confirma saldo bancario ou correspondencia de documentos sem verificacao adicional.',
  }
}
