import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { normalizeAuthExport } from '../src/domain/adminBackfill.js'

const DEFAULT_PROJECT = 'cfp-money'

function parseArgs(argv) {
  const args = {
    project: DEFAULT_PROJECT,
    apply: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--apply') {
      args.apply = true
      continue
    }

    if (arg === '--project') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        throw new Error('Valor ausente para --project.')
      }
      args.project = value
      index += 1
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

function identityToolkitBase(projectId) {
  return `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
}

function firestoreBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents`
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request(url, token, projectId, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': projectId,
      ...(options.headers || {}),
    },
  })

  const body = await parseResponse(response)

  if (response.status === 404) {
    return { status: 404, body: null }
  }

  if (!response.ok) {
    const detail =
      typeof body === 'object' && body?.error?.message ? body.error.message : String(body || '')
    throw new Error(`Google API ${response.status}: ${detail || response.statusText}`)
  }

  return { status: response.status, body }
}

async function listAuthUsers(projectId, token) {
  const users = []
  let nextPageToken = ''

  do {
    const url = new URL(`${identityToolkitBase(projectId)}/accounts:batchGet`)
    url.searchParams.set('maxResults', '1000')
    if (nextPageToken) url.searchParams.set('nextPageToken', nextPageToken)

    const { body } = await request(url, token, projectId)
    users.push(...(body?.users || []))
    nextPageToken = body?.nextPageToken || ''
  } while (nextPageToken)

  return normalizeAuthExport(users)
}

async function profileExists(projectId, uid, token) {
  const { status } = await request(
    `${firestoreBase(projectId)}/users/${encodeURIComponent(uid)}`,
    token,
    projectId,
  )
  return status !== 404
}

async function updateLastSignIn(projectId, user, token) {
  const url = new URL(`${firestoreBase(projectId)}/users/${encodeURIComponent(user.uid)}`)
  url.searchParams.append('updateMask.fieldPaths', 'lastSignInAt')

  await request(url, token, projectId, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        lastSignInAt: {
          timestampValue: user.lastSignInTime,
        },
      },
    }),
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const token = getAccessToken()
  const authUsers = await listAuthUsers(args.project, token)

  const withLastSignIn = authUsers.filter((user) => user.lastSignInTime)
  const targets = []
  const missingProfiles = []

  for (const user of withLastSignIn) {
    if (await profileExists(args.project, user.uid, token)) {
      targets.push(user)
    } else {
      missingProfiles.push(user)
    }
  }

  console.log('\n=== BACKFILL DE ATIVIDADE · AUTH → FIRESTORE ===')
  console.log(`Authentication: ${authUsers.length}`)
  console.log(`Com último login: ${withLastSignIn.length}`)
  console.log(`Perfis prontos para sincronizar: ${targets.length}`)
  console.log(`Auth sem perfil Firestore: ${missingProfiles.length}`)

  if (!args.apply) {
    console.log(
      '\nDRY RUN: nenhum dado foi alterado. Use --apply somente após revisar os totais acima.',
    )
    return
  }

  console.log('\nSincronizando lastSignInAt...')
  for (const user of targets) {
    await updateLastSignIn(args.project, user, token)
    console.log(`- UPDATED: ${user.uid} | ${user.email || '(sem e-mail)'} | ${user.lastSignInTime}`)
  }

  console.log(`\nConcluído: ${targets.length} perfil(is) atualizado(s).`)

  if (missingProfiles.length) {
    console.log(
      'Observação: existem contas do Authentication sem perfil no Firestore; execute admin:sync-users antes de repetir este backfill.',
    )
  }
}

main().catch((error) => {
  console.error(`\n[admin:sync-activity] ${error.message}`)
  process.exitCode = 1
})
