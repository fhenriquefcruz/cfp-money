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
    authExport: process.env.FIREBASE_AUTH_EXPORT?.trim() || null,
    apply: false,
    auditOrphans: false,
    uids: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--apply') {
      args.apply = true
      continue
    }

    if (arg === '--audit-orphans') {
      args.auditOrphans = true
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

function identityToolkitBase(projectId) {
  return `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
}

async function parseResponse(response) {
  let body = null
  const text = await response.text()

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return body
}

async function requestJson(url, token, projectId, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': projectId,
      ...(options.headers || {}),
    },
  })

  if (response.status === 404) {
    return { status: 404, body: null }
  }

  const body = await parseResponse(response)

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body?.error?.message ? body.error.message : String(body || '')
    throw new Error(`Firestore REST ${response.status}: ${detail || response.statusText}`)
  }

  return { status: response.status, body }
}

async function requestIdentityJson(url, token, projectId) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-goog-user-project': projectId,
    },
  })

  const body = await parseResponse(response)

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body?.error?.message ? body.error.message : String(body || '')
    throw new Error(`Identity Toolkit REST ${response.status}: ${detail || response.statusText}`)
  }

  return body
}

async function listAuthUsers(projectId, token) {
  const users = []
  let nextPageToken = ''

  do {
    const url = new URL(`${identityToolkitBase(projectId)}/accounts:batchGet`)
    url.searchParams.set('maxResults', '1000')
    if (nextPageToken) url.searchParams.set('nextPageToken', nextPageToken)

    const body = await requestIdentityJson(url, token, projectId)
    users.push(...(body?.users || []))
    nextPageToken = body?.nextPageToken || ''
  } while (nextPageToken)

  return normalizeAuthExport(users)
}

function loadAuthExport(authExport) {
  const payload = JSON.parse(fs.readFileSync(authExport, 'utf8'))
  return normalizeAuthExport(payload)
}

async function listFirestoreUsers(projectId, token) {
  const users = []
  let pageToken = ''

  do {
    const url = new URL(`${firestoreBase(projectId)}/users`)
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const { body } = await requestJson(url, token, projectId)
    users.push(...(body?.documents || []).map(firestoreDocumentToUser))
    pageToken = body?.nextPageToken || ''
  } while (pageToken)

  return users
}

const ORPHAN_ROOT_QUERIES = [
  { label: 'categories(ownerUid)', collectionId: 'categories', fieldPath: 'ownerUid' },
  { label: 'privacyConsents(uid)', collectionId: 'privacyConsents', fieldPath: 'uid' },
  { label: 'supportRequests(uid)', collectionId: 'supportRequests', fieldPath: 'uid' },
  { label: 'adminAudit(targetUid)', collectionId: 'adminAudit', fieldPath: 'targetUid' },
  { label: 'adminAudit(actorUid)', collectionId: 'adminAudit', fieldPath: 'actorUid' },
]

const ORPHAN_DIRECT_DOCUMENTS = [
  { label: 'notificationSubscribers/{uid}', collectionId: 'notificationSubscribers' },
  { label: 'accountDeletionRequests/{uid}', collectionId: 'accountDeletionRequests' },
  { label: 'userIntegrations/{uid}', collectionId: 'userIntegrations' },
]

function firestoreScalar(field) {
  if (!field || typeof field !== 'object') return null
  if ('stringValue' in field) return field.stringValue
  if ('booleanValue' in field) return field.booleanValue
  if ('timestampValue' in field) return field.timestampValue
  if ('integerValue' in field) return Number(field.integerValue)
  if ('doubleValue' in field) return Number(field.doubleValue)
  if ('nullValue' in field) return null
  return '[complexo]'
}

async function getFirestoreDocument(projectId, path, token) {
  const { status, body } = await requestJson(
    `${firestoreBase(projectId)}/${path}`,
    token,
    projectId,
  )
  return status === 404 ? null : body
}

async function listSubcollectionIds(projectId, uid, token) {
  const ids = []
  let pageToken = ''

  do {
    const { body } = await requestJson(
      `${firestoreBase(projectId)}/users/${encodeURIComponent(uid)}:listCollectionIds`,
      token,
      projectId,
      {
        method: 'POST',
        body: JSON.stringify({
          pageSize: 1000,
          ...(pageToken ? { pageToken } : {}),
        }),
      },
    )

    ids.push(...(body?.collectionIds || []))
    pageToken = body?.nextPageToken || ''
  } while (pageToken)

  return ids.sort()
}

async function countCollectionDocuments(projectId, collectionPath, token) {
  let total = 0
  let pageToken = ''

  do {
    const url = new URL(`${firestoreBase(projectId)}/${collectionPath}`)
    url.searchParams.set('pageSize', '1000')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const { body } = await requestJson(url, token, projectId)
    total += body?.documents?.length || 0
    pageToken = body?.nextPageToken || ''
  } while (pageToken)

  return total
}

async function countRootReference(projectId, accessToken, uid, queryDefinition) {
  const { body } = await requestJson(
    `${firestoreBase(projectId)}:runQuery`,
    accessToken,
    projectId,
    {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: queryDefinition.collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath: queryDefinition.fieldPath },
              op: 'EQUAL',
              value: { stringValue: uid },
            },
          },
        },
      }),
    },
  )

  return Array.isArray(body) ? body.filter((item) => item?.document).length : 0
}

async function auditFirestoreOrphan(projectId, orphan, token) {
  const uid = orphan.uid
  const document = await getFirestoreDocument(projectId, `users/${encodeURIComponent(uid)}`, token)
  const fields = document?.fields || {}
  const subcollectionIds = await listSubcollectionIds(projectId, uid, token)
  const subcollections = []

  for (const collectionId of subcollectionIds) {
    subcollections.push({
      collectionId,
      count: await countCollectionDocuments(
        projectId,
        `users/${encodeURIComponent(uid)}/${encodeURIComponent(collectionId)}`,
        token,
      ),
    })
  }

  const rootReferences = []
  for (const definition of ORPHAN_ROOT_QUERIES) {
    rootReferences.push({
      label: definition.label,
      count: await countRootReference(projectId, token, uid, definition),
    })
  }

  for (const definition of ORPHAN_DIRECT_DOCUMENTS) {
    const related = await getFirestoreDocument(
      projectId,
      `${definition.collectionId}/${encodeURIComponent(uid)}`,
      token,
    )
    rootReferences.push({
      label: definition.label,
      count: related ? 1 : 0,
    })
  }

  return {
    uid,
    profile: {
      email: firestoreScalar(fields.email),
      displayName: firestoreScalar(fields.displayName),
      plan: firestoreScalar(fields.plan),
      blocked: firestoreScalar(fields.blocked),
      createdAt: firestoreScalar(fields.createdAt),
      trialStart: firestoreScalar(fields.trialStart),
      premiumUntil: firestoreScalar(fields.premiumUntil),
      fieldCount: Object.keys(fields).length,
    },
    subcollections,
    rootReferences,
    relatedDocumentCount:
      subcollections.reduce((sum, item) => sum + item.count, 0) +
      rootReferences.reduce((sum, item) => sum + item.count, 0),
  }
}

function printOrphanAudit(audit) {
  console.log(`\n=== AUDITORIA SOMENTE LEITURA · FIRESTORE ÓRFÃO ===`)
  console.log(`UID: ${audit.uid}`)
  console.log(`E-mail: ${audit.profile.email || '(sem e-mail)'}`)
  console.log(`Nome: ${audit.profile.displayName || '(sem nome)'}`)
  console.log(`Plano: ${audit.profile.plan || '(não informado)'}`)
  console.log(`Bloqueado: ${audit.profile.blocked ?? '(não informado)'}`)
  console.log(`Criado em: ${audit.profile.createdAt || '(não informado)'}`)
  console.log(`Trial iniciado em: ${audit.profile.trialStart || '(não informado)'}`)
  console.log(`Premium até: ${audit.profile.premiumUntil || '(não informado)'}`)
  console.log(`Campos no perfil: ${audit.profile.fieldCount}`)

  console.log('\nSubcoleções do usuário:')
  if (!audit.subcollections.length) console.log('- nenhuma')
  for (const item of audit.subcollections) {
    console.log(`- ${item.collectionId}: ${item.count} documento(s)`)
  }

  console.log('\nVínculos em coleções globais:')
  for (const item of audit.rootReferences) {
    console.log(`- ${item.label}: ${item.count} documento(s)`)
  }

  console.log(`\nTotal de documentos relacionados encontrados: ${audit.relatedDocumentCount}`)
  console.log('Nenhum dado foi alterado por esta auditoria.')
}

async function documentExists(projectId, uid, token) {
  const { status } = await requestJson(
    `${firestoreBase(projectId)}/users/${encodeURIComponent(uid)}`,
    token,
    projectId,
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
    await requestJson(url, token, projectId, {
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
  const token = getAccessToken()
  const authUsers = args.authExport
    ? loadAuthExport(args.authExport)
    : await listAuthUsers(args.project, token)
  const firestoreUsers = await listFirestoreUsers(args.project, token)
  const initialReport = buildParityReport(authUsers, firestoreUsers)

  console.log(
    `Fonte do Authentication: ${
      args.authExport ? `arquivo ${args.authExport}` : 'consulta administrativa ao vivo'
    }`,
  )
  printReport(initialReport)

  if (args.auditOrphans) {
    if (!initialReport.firestoreOnly.length) {
      console.log('\nNenhum perfil órfão no Firestore para auditar.')
    }

    for (const orphan of initialReport.firestoreOnly) {
      const audit = await auditFirestoreOrphan(args.project, orphan, token)
      printOrphanAudit(audit)
    }
  }

  const targets = initialReport.authOnly.filter((user) => !args.uids || args.uids.has(user.uid))

  if (args.uids) {
    const missingRequestedUids = [...args.uids].filter(
      (uid) => !authUsers.some((user) => user.uid === uid),
    )
    if (missingRequestedUids.length > 0) {
      throw new Error(
        `UID(s) solicitado(s) não encontrados no Authentication: ${missingRequestedUids.join(
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
