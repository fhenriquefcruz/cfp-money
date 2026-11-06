const assert = require('node:assert/strict')
const { getApps, initializeApp } = require('firebase-admin/app')
const { Timestamp, getFirestore } = require('firebase-admin/firestore')
const { decryptJson, encryptJson } = require('./backupDomain')
const { buildFirestoreBackup, restoreFirestoreBackup } = require('./firestoreBackup')

const PROJECT_ID = 'demo-cfp-money-backup'
const PASSPHRASE = 'meu-real-emulator-backup-2026'

function normalize(backup) {
  return {
    schemaVersion: backup.schemaVersion,
    projectId: backup.projectId,
    documentCount: backup.documentCount,
    documents: backup.documents,
  }
}

async function removeDocuments(db, documents) {
  const ordered = [...documents].sort((a, b) => b.path.split('/').length - a.path.split('/').length)

  for (const document of ordered) {
    await db.doc(document.path).delete()
  }
}

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Este teste só pode rodar com FIRESTORE_EMULATOR_HOST definido.')
  }

  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT_ID })
  }

  const db = getFirestore()

  const createdAt = Timestamp.fromDate(new Date('2026-08-09T20:00:00-04:00'))

  await db.doc('users/alice').set({
    email: 'alice@example.com',
    displayName: 'Alice',
    createdAt,
    plan: 'premium',
  })

  await db.doc('users/alice/transactions/tx-1').set({
    description: 'Mercado',
    amount: 125.5,
    paid: true,
    occurredAt: createdAt,
  })

  await db.doc('categories/custom-food').set({
    name: 'Alimentação especial',
    ownerUid: 'alice',
    active: true,
  })

  // Eventos sintéticos: preservar IDs idempotentes, vínculos e histórico legado.
  const paymentId = 'evt_123e4567-e89b-42d3-a456-426614174000'
  const reversalId = 'rev_' + paymentId
  await db.doc('users/alice/invoiceEvents/' + paymentId).set({
    operationId: paymentId,
    type: 'payment',
    cardId: 'card-synthetic',
    invoiceKey: 'card-synthetic:2026-08',
    invoiceMonth: '2026-08',
    eventDate: '2026-08-09',
    paymentDate: '2026-08-09',
    amount: 125.5,
    sourceAccount: 'Conta fictícia',
    createdAt,
  })
  await db.doc('users/alice/invoiceEvents/' + reversalId).set({
    operationId: reversalId,
    type: 'reversal',
    reversesEventId: paymentId,
    cardId: 'card-synthetic',
    invoiceKey: 'card-synthetic:2026-08',
    invoiceMonth: '2026-08',
    eventDate: '2026-08-09',
    amount: 125.5,
    sourceAccount: 'Conta fictícia',
    createdAt,
  })
  await db.doc('users/alice/invoiceEvents/legacy-no-event-date').set({
    type: 'payment',
    cardId: 'legacy-card',
    invoiceKey: 'legacy-card:2025-12',
    invoiceMonth: '2025-12',
    paymentDate: '2025-12-15',
    amount: 50.25,
  })

  const original = await buildFirestoreBackup(db, PROJECT_ID)

  assert.equal(original.documentCount, 6)

  const encrypted = encryptJson(original, PASSPHRASE)

  assert.equal(encrypted.includes('alice@example.com'), false)
  assert.equal(encrypted.includes('Mercado'), false)

  const decrypted = decryptJson(encrypted, PASSPHRASE)

  await removeDocuments(db, original.documents)

  assert.equal((await db.doc('users/alice').get()).exists, false)
  assert.equal((await db.doc('users/alice/transactions/tx-1').get()).exists, false)

  const restoredCount = await restoreFirestoreBackup(db, decrypted)

  assert.equal(restoredCount, 6)

  const restored = await buildFirestoreBackup(db, PROJECT_ID)

  assert.deepEqual(normalize(restored), normalize(original))
  const payment = await db.doc('users/alice/invoiceEvents/' + paymentId).get()
  const reversal = await db.doc('users/alice/invoiceEvents/' + reversalId).get()
  const legacy = await db.doc('users/alice/invoiceEvents/legacy-no-event-date').get()
  assert.equal(payment.data().operationId, paymentId)
  assert.equal(reversal.data().reversesEventId, paymentId)
  assert.equal(reversal.data().amount, payment.data().amount)
  assert.equal(legacy.data().eventDate, undefined)
  assert.equal(legacy.data().paymentDate, '2025-12-15')

  console.log(
    `Backup/recovery: round-trip criptografado aprovado no Firestore Emulator (${restoredCount}/${original.documentCount} docs).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
