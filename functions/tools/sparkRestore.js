const fs = require('node:fs')
const path = require('node:path')
const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { decryptJson } = require('./backupDomain')
const { restoreFirestoreBackup } = require('./firestoreBackup')

const projectId = process.env.MEU_REAL_FIREBASE_PROJECT_ID
const passphrase = process.env.MEU_REAL_BACKUP_PASSPHRASE
const allowProductionRestore = process.env.MEU_REAL_ALLOW_PRODUCTION_RESTORE === 'YES'
const confirmation = process.env.MEU_REAL_RESTORE_CONFIRM
const inputFile = process.argv[2]

async function main() {
  if (!inputFile) {
    throw new Error('Informe o arquivo .json.enc que será restaurado.')
  }

  if (!fs.existsSync(inputFile)) {
    throw new Error(`Arquivo não encontrado: ${inputFile}`)
  }

  if (!projectId) {
    throw new Error('Defina MEU_REAL_FIREBASE_PROJECT_ID.')
  }

  if (!passphrase || passphrase.length < 12) {
    throw new Error('Defina MEU_REAL_BACKUP_PASSPHRASE com pelo menos 12 caracteres.')
  }

  const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

  if (!isEmulator) {
    if (projectId !== 'cfp-money') {
      throw new Error(`Projeto recusado: ${projectId}. Esperado: cfp-money.`)
    }

    if (!allowProductionRestore) {
      throw new Error(
        'Restore de produção bloqueado. Defina MEU_REAL_ALLOW_PRODUCTION_RESTORE=YES.',
      )
    }

    if (confirmation !== 'RESTAURAR CFP-MONEY') {
      throw new Error(
        'Confirmação inválida. Defina MEU_REAL_RESTORE_CONFIRM="RESTAURAR CFP-MONEY".',
      )
    }
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: isEmulator ? undefined : applicationDefault(),
      projectId,
    })
  }

  const encrypted = fs.readFileSync(path.resolve(inputFile), 'utf8')
  const backup = decryptJson(encrypted, passphrase)

  if (backup.projectId !== projectId) {
    throw new Error(
      `Backup pertence ao projeto ${backup.projectId}; destino informado: ${projectId}.`,
    )
  }

  const restored = await restoreFirestoreBackup(getFirestore(), backup)

  console.log(`Restore concluído: ${restored} documento(s).`)
  console.log(`Projeto: ${projectId}`)
  console.log(`Origem: ${path.resolve(inputFile)}`)
}

main().catch((error) => {
  console.error(`Restore falhou: ${error.message}`)
  process.exitCode = 1
})
