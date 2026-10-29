// Fase 66.3: conferência agregada de dois backups. Nenhum ID ou dado pessoal é retornado.
const validId = (value) =>
  typeof value === 'string' && value.trim() && !['null', 'undefined'].includes(value.trim())

const cents = (value) => {
  if (value === null || value === '' || !Number.isFinite(Number(value))) return null
  return Math.round(Number(value) * 100)
}

const asCreditExpense = (tx) =>
  tx?.type === 'expense' &&
  !tx.isSavings &&
  tx.paymentStatus !== 'cancelled' &&
  (tx.cardId || tx.paymentMethod === 'credit_card' || tx.isCreditPurchase === true)

export function readSnapshotRecords(snapshot) {
  const records = snapshot?.collections || snapshot?.data || snapshot
  if (!Array.isArray(records?.transactions) || !Array.isArray(records?.creditCards)) {
    throw new Error('Exportação incompatível: transactions e creditCards devem ser listas.')
  }
  return {
    transactions: records.transactions,
    creditCards: records.creditCards,
    invoiceEvents: Array.isArray(records.invoiceEvents) ? records.invoiceEvents : [],
  }
}

export function snapshotDate(snapshot) {
  const raw = snapshot?.exportedAt || snapshot?.generatedAt
  const date = typeof raw === 'string' ? new Date(raw) : null
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null
}

export function summarizeSnapshotIdentity(snapshot) {
  const { creditCards, transactions, invoiceEvents } = readSnapshotRecords(snapshot)
  const cardIds = new Set()
  const transactionIds = new Set()
  const counts = {
    cardRecords: creditCards.length,
    validCardIds: 0,
    missingCardIds: 0,
    duplicateCardIds: 0,
    creditPurchases: 0,
    linkedPurchases: 0,
    unlinkedPurchases: 0,
    orphanCardReferences: 0,
    missingTransactionIds: 0,
    duplicateTransactionIds: 0,
    invalidCreditAmounts: 0,
    invoiceEvents: invoiceEvents.length,
    orphanInvoiceEvents: 0,
  }
  const amountsInCents = {
    linked: 0,
    unlinked: 0,
    orphan: 0,
  }
  for (const card of creditCards) {
    if (!validId(card?.id)) {
      counts.missingCardIds++
    } else if (cardIds.has(card.id)) {
      counts.duplicateCardIds++
    } else {
      cardIds.add(card.id)
      counts.validCardIds++
    }
  }
  for (const tx of transactions) {
    if (!validId(tx?.id)) counts.missingTransactionIds++
    else if (transactionIds.has(tx.id)) counts.duplicateTransactionIds++
    else transactionIds.add(tx.id)
    if (!asCreditExpense(tx)) continue
    counts.creditPurchases++
    const amount = cents(tx.amount)
    if (amount === null) counts.invalidCreditAmounts++
    const type = !validId(tx.cardId) ? 'unlinked' : cardIds.has(tx.cardId) ? 'linked' : 'orphan'
    counts[
      type === 'unlinked'
        ? 'unlinkedPurchases'
        : type === 'linked'
          ? 'linkedPurchases'
          : 'orphanCardReferences'
    ]++
    if (amount !== null) amountsInCents[type] += amount
  }
  for (const event of invoiceEvents) {
    if (validId(event?.cardId) && !cardIds.has(event.cardId)) counts.orphanInvoiceEvents++
  }
  return {
    counts,
    totals: Object.fromEntries(
      Object.entries(amountsInCents).map(([key, value]) => [key, value / 100]),
    ),
  }
}

export function compareCardSnapshots(previousSnapshot, currentSnapshot) {
  const previous = summarizeSnapshotIdentity(previousSnapshot)
  const current = summarizeSnapshotIdentity(currentSnapshot)
  const previousDate = snapshotDate(previousSnapshot)
  const currentDate = snapshotDate(currentSnapshot)
  if (previousDate && currentDate && previousDate > currentDate) {
    throw new Error('A exportação anterior tem data posterior à exportação atual.')
  }

  const oldRecords = readSnapshotRecords(previousSnapshot)
  const newRecords = readSnapshotRecords(currentSnapshot)
  // Apenas IDs exclusivos e válidos: nunca inferir equivalência por nome ou últimos dígitos.
  const oldTransactionIds = new Set()
  const duplicates = new Set()
  for (const tx of oldRecords.transactions) {
    if (!validId(tx?.id)) continue
    if (oldTransactionIds.has(tx.id)) duplicates.add(tx.id)
    oldTransactionIds.add(tx.id)
  }
  for (const id of duplicates) oldTransactionIds.delete(id)

  const newTransactionCounts = new Map()
  for (const tx of newRecords.transactions) {
    if (!validId(tx?.id)) continue
    newTransactionCounts.set(tx.id, (newTransactionCounts.get(tx.id) || 0) + 1)
  }
  const oldUniqueById = new Map(
    oldRecords.transactions.filter((tx) => oldTransactionIds.has(tx?.id)).map((tx) => [tx.id, tx]),
  )
  let commonTransactions = 0
  let unchangedCardReferences = 0
  let changedCardReferences = 0
  let changedAmounts = 0
  for (const tx of newRecords.transactions) {
    if (newTransactionCounts.get(tx?.id) !== 1 || !oldUniqueById.has(tx.id)) continue
    const prior = oldUniqueById.get(tx.id)
    commonTransactions++
    if ((prior.cardId || null) === (tx.cardId || null)) unchangedCardReferences++
    else changedCardReferences++
    if (cents(prior.amount) !== cents(tx.amount)) changedAmounts++
  }

  const deltas = Object.fromEntries(
    Object.keys(current.counts).map((key) => [key, current.counts[key] - previous.counts[key]]),
  )
  return {
    readOnly: true,
    periods: { previousExportedAt: previousDate, currentExportedAt: currentDate },
    previous,
    current,
    deltas,
    sharedRecords: {
      commonTransactions,
      unchangedCardReferences,
      changedCardReferences,
      changedAmounts,
    },
    identityObservation:
      previous.counts.missingCardIds > 0 && current.counts.missingCardIds === 0
        ? 'ids_present_in_new_export'
        : current.counts.missingCardIds > 0
          ? 'missing_ids_in_new_export'
          : 'no_missing_ids_observed',
    interpretation:
      'Comparação de snapshots, não prova migração, recuperação individual ou identidade de cartões sem ID.',
  }
}
