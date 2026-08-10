const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { encryptJson } = require('./backupDomain')
const { buildFirestoreBackup } = require('./firestoreBackup')

const projectId = process.env.MEU_REAL_FIREBASE_PROJECT_ID
const passphrase = process.env.MEU_REAL_BACKUP_PASSPHRASE
const outputDirectory = process.env.MEU_REAL_BACKUP_DIR || 'backups'

async function main() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('O backup de produção não pode rodar com FIRESTORE_EMULATOR_HOST definido.')
  }

  if (!projectId) {
    throw new Error('Defina MEU_REAL_FIREBASE_PROJECT_ID.')
  }

  if (projectId !== 'cfp-money') {
    throw new Error(`Projeto recusado: ${projectId}. Esperado: cfp-money.`)
  }

  if (!passphrase || passphrase.length < 12) {
    throw new Error('Defina MEU_REAL_BACKUP_PASSPHRASE com pelo menos 12 caracteres.')
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    })
  }

  const db = getFirestore()
  const backup = await buildFirestoreBackup(db, projectId)
  const encrypted = encryptJson(backup, passphrase)

  fs.mkdirSync(outputDirectory, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `meu-real-firestore-${timestamp}.json.enc`
  const filepath = path.resolve(outputDirectory, filename)

  fs.writeFileSync(filepath, encrypted, {
    encoding: 'utf8',
    mode: 0o600,
  })

  const checksum = crypto.createHash('sha256').update(encrypted).digest('hex')

  console.log(`Backup criado: ${filepath}`)
  console.log(`Projeto: ${projectId}`)
  console.log(`Documentos: ${backup.documentCount}`)
  console.log(`SHA-256: ${checksum}`)
}

main().catch((error) => {
  console.error(`Backup falhou: ${error.message}`)
  process.exitCode = 1
})
