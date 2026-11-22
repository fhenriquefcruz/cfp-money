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

  // Faturas e seus bloqueios devem ser recuperados com o mesmo UID e IDs.
  await db.doc('users/alice/invoiceEvents/op_payment-backup-0000001').set({
    type: 'payment',
    operationId: 'payment-backup-0000001',
    cardId: 'card-alice',
    invoiceMonth: '2026-08',
    invoiceKey: 'card-alice:2026-08',
    amount: 120.03,
    eventDate: '2026-08-12',
    createdAt,
  })
  await db.doc('users/alice/invoiceEvents/op_reversal-backup-0000001').set({
    type: 'reversal',
    operationId: 'reversal-backup-0000001',
    cardId: 'card-alice',
    invoiceMonth: '2026-08',
    invoiceKey: 'card-alice:2026-08',
    reversesEventId: 'op_payment-backup-0000001',
    amount: 0.01,
    eventDate: '2026-08-13',
    createdAt,
  })
  await db.doc('users/alice/invoiceReversalLocks/op_payment-backup-0000001').set({
    paymentId: 'op_payment-backup-0000001',
    reversalEventId: 'op_reversal-backup-0000001',
    invoiceKey: 'card-alice:2026-08',
    amountCents: 1,
    createdAt,
  })
  await db.doc('users/alice/goals/goal-1').set({
    name: 'Reserva',
    currentAmount: 3.5,
    targetAmount: 100,
  })

  // O segundo UID deve manter seus próprios lançamentos, sem mistura.
  await db.doc('users/bob').set({
    email: 'bob@example.com',
    displayName: 'Bob',
    createdAt,
  })
  await db.doc('users/bob/transactions/tx-1').set({
    description: 'Despesa de Bob',
    amount: 15.75,
    ownerReference: db.doc('users/bob'),
    proofBytes: Buffer.from('comprovante'),
  })

  const original = await buildFirestoreBackup(db, PROJECT_ID)

  assert.equal(original.documentCount, 9)

  const encrypted = encryptJson(original, PASSPHRASE)

  assert.equal(encrypted.includes('alice@example.com'), false)
  assert.equal(encrypted.includes('Mercado'), false)

  const decrypted = decryptJson(encrypted, PASSPHRASE)

  await removeDocuments(db, original.documents)

  assert.equal((await db.doc('users/alice').get()).exists, false)
  assert.equal((await db.doc('users/alice/transactions/tx-1').get()).exists, false)
  assert.equal((await db.doc('users/bob/transactions/tx-1').get()).exists, false)

  // Um arquivo inconsistente não pode gravar sequer os primeiros documentos.
  for (const invalid of [
    { ...decrypted, documentCount: decrypted.documentCount + 1 },
    {
      ...decrypted,
      documentCount: decrypted.documentCount + 1,
      documents: [...decrypted.documents, decrypted.documents[0]],
    },
    {
      ...decrypted,
      documentCount: decrypted.documentCount + 1,
      documents: [
        ...decrypted.documents,
        { path: 'users/alice/transactions', data: { amount: 999 } },
      ],
    },
  ]) {
    await assert.rejects(() => restoreFirestoreBackup(db, invalid), /inválido|duplicado/)
    assert.equal((await db.doc('users/alice').get()).exists, false)
    assert.equal((await db.doc('users/bob').get()).exists, false)
  }

  const restoredCount = await restoreFirestoreBackup(db, decrypted)
  assert.equal(restoredCount, 9)

  const restored = await buildFirestoreBackup(db, PROJECT_ID)
  assert.deepEqual(normalize(restored), normalize(original))
  assert.equal((await db.doc('users/alice/transactions/tx-1').get()).data().amount, 125.5)
  const bobTransaction = (await db.doc('users/bob/transactions/tx-1').get()).data()
  assert.equal(bobTransaction.amount, 15.75)
  assert.equal(bobTransaction.ownerReference.path, 'users/bob')
  assert.equal(bobTransaction.proofBytes.toString('utf8'), 'comprovante')
  const payment = (await db.doc('users/alice/invoiceEvents/op_payment-backup-0000001').get()).data()
  const reversal = (
    await db.doc('users/alice/invoiceEvents/op_reversal-backup-0000001').get()
  ).data()
  const lock = (
    await db.doc('users/alice/invoiceReversalLocks/op_payment-backup-0000001').get()
  ).data()
  assert.equal(payment.amount, 120.03)
  assert.equal(reversal.reversesEventId, 'op_payment-backup-0000001')
  assert.equal(lock.reversalEventId, 'op_reversal-backup-0000001')
  assert.equal(lock.amountCents, 1)

  console.log(
    `Backup/recovery: round-trip criptografado aprovado no Firestore Emulator (${restoredCount}/${original.documentCount} docs).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
