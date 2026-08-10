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

  const original = await buildFirestoreBackup(db, PROJECT_ID)

  assert.equal(original.documentCount, 3)

  const encrypted = encryptJson(original, PASSPHRASE)

  assert.equal(encrypted.includes('alice@example.com'), false)
  assert.equal(encrypted.includes('Mercado'), false)

  const decrypted = decryptJson(encrypted, PASSPHRASE)

  await removeDocuments(db, original.documents)

  assert.equal((await db.doc('users/alice').get()).exists, false)
  assert.equal((await db.doc('users/alice/transactions/tx-1').get()).exists, false)

  const restoredCount = await restoreFirestoreBackup(db, decrypted)

  assert.equal(restoredCount, 3)

  const restored = await buildFirestoreBackup(db, PROJECT_ID)

  assert.deepEqual(normalize(restored), normalize(original))

  console.log(
    `Backup/recovery: round-trip criptografado aprovado no Firestore Emulator (${restoredCount}/${original.documentCount} docs).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
