import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import process from 'node:process'
import {
  buildFirestoreUserDocument,
  buildParityReport,
  firestoreDocumentToUser,
  normalizeAuthExport,
} from '../src/domain/adminBackfill.js'

const DEFAULT_PROJECT = 'cfp-money'

function parseArgs(argv) {
  const args = {
    project: DEFAULT_PROJECT,
    authExport: process.env.FIREBASE_AUTH_EXPORT || 'cfp-auth-users.json',
    apply: false,
    uids: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--apply') {
      args.apply = true
      continue
    }

    if (arg === '--project' || arg === '--auth-export' || arg === '--uids') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`Valor ausente para ${arg}.`)
      }

      index += 1

      if (arg === '--project') args.project = value
      if (arg === '--auth-export') args.authExport = value
      if (arg === '--uids') {
        args.uids = new Set(
          value
            .split(',')
            .map((uid) => uid.trim())
            .filter(Boolean),
        )
      }
      continue
    }

    throw new Error(`Argumento desconhecido: ${arg}`)
  }

  return args
}

function getAccessToken() {
  const envToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim()
  if (envToken) return envToken

  const executable = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud'

  try {
    return execFileSync(executable, ['auth', 'application-default', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }).trim()
  } catch {
    throw new Error(
      'Não foi possível obter credencial administrativa. Execute "gcloud auth application-default login" e tente novamente.',
    )
  }
}

function firestoreBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents`
}

async function requestJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (response.status === 404) {
    return { status: 404, body: null }
  }

  let body = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body?.error?.message ? body.error.message : String(body || '')
    throw new Error(`Firestore REST ${response.status}: ${detail || response.statusText}`)
  }

  return { status: response.status, body }
}

async function listFirestoreUsers(projectId, token) {
  const users = []
  let pageToken = ''

  do {
    const url = new URL(`${firestoreBase(projectId)}/users`)
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const { body } = await requestJson(url, token)
    users.push(...(body?.documents || []).map(firestoreDocumentToUser))
    pageToken = body?.nextPageToken || ''
  } while (pageToken)

  return users
}

async function documentExists(projectId, uid, token) {
  const { status } = await requestJson(
    `${firestoreBase(projectId)}/users/${encodeURIComponent(uid)}`,
    token,
  )
  return status !== 404
}

async function createUserDocument(projectId, user, token) {
  if (await documentExists(projectId, user.uid, token)) {
    return 'SKIP'
  }

  const url = new URL(`${firestoreBase(projectId)}/users`)
  url.searchParams.set('documentId', user.uid)

  try {
    await requestJson(url, token, {
      method: 'POST',
      body: JSON.stringify(buildFirestoreUserDocument(user)),
    })
    return 'CREATED'
  } catch (error) {
    if (/Firestore REST 409/.test(error.message)) {
      return 'SKIP'
    }
    throw error
  }
}

function printUsers(label, users) {
  console.log(`\n${label}: ${users.length}`)
  for (const user of users) {
    console.log(`- ${user.uid} | ${user.email || '(sem e-mail)'}`)
  }
}

function printDuplicates(label, duplicates) {
  console.log(`\n${label}: ${duplicates.length}`)
  for (const item of duplicates) {
    console.log(`- ${item.email}: ${item.uids.join(', ')}`)
  }
}

function printReport(report) {
  console.log('\n=== DIAGNÓSTICO AUTH x FIRESTORE ===')
  console.log(`Authentication: ${report.authTotal}`)
  console.log(`Firestore users: ${report.firestoreTotal}`)
  console.log(`Presentes nos dois: ${report.presentInBoth.length}`)
  printUsers('Auth sem Firestore', report.authOnly)
  printUsers('Firestore sem Auth', report.firestoreOnly)
  printDuplicates('E-mails duplicados no Auth', report.authDuplicateEmails)
  printDuplicates('E-mails duplicados no Firestore', report.firestoreDuplicateEmails)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const payload = JSON.parse(fs.readFileSync(args.authExport, 'utf8'))
  const authUsers = normalizeAuthExport(payload)
  const token = getAccessToken()
  const firestoreUsers = await listFirestoreUsers(args.project, token)
  const initialReport = buildParityReport(authUsers, firestoreUsers)

  printReport(initialReport)

  const targets = initialReport.authOnly.filter((user) => !args.uids || args.uids.has(user.uid))

  if (args.uids) {
    const missingRequestedUids = [...args.uids].filter(
      (uid) => !authUsers.some((user) => user.uid === uid),
    )
    if (missingRequestedUids.length > 0) {
      throw new Error(
        `UID(s) solicitado(s) não encontrados no export do Authentication: ${missingRequestedUids.join(
          ', ',
        )}`,
      )
    }
  }

  if (targets.some((user) => !user.creationTime)) {
    const invalid = targets.filter((user) => !user.creationTime).map((user) => user.uid)
    throw new Error(
      `Backfill não executado: conta(s) sem data original de criação: ${invalid.join(', ')}`,
    )
  }

  if (!args.apply) {
    console.log(
      `\nDRY RUN: ${targets.length} perfil(is) seria(m) criado(s). Use --apply somente após revisar o diagnóstico.`,
    )
    return
  }

  console.log(`\nAplicando backfill em ${targets.length} perfil(is)...`)
  for (const user of targets) {
    const result = await createUserDocument(args.project, user, token)
    console.log(`- ${result}: ${user.uid}`)
  }

  const finalFirestoreUsers = await listFirestoreUsers(args.project, token)
  const finalReport = buildParityReport(authUsers, finalFirestoreUsers)

  console.log('\n=== DIAGNÓSTICO APÓS BACKFILL ===')
  printReport(finalReport)

  if (finalReport.authOnly.length > 0) {
    process.exitCode = 2
    console.error('\nAinda existem contas do Authentication sem perfil no Firestore.')
  }
}

main().catch((error) => {
  console.error(`\n[admin:sync-users] ${error.message}`)
  process.exitCode = 1
})
