import { getGoogleAccessToken } from './googleAuth.js'

function decodeValue(value = {}) {
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) {
    return value.booleanValue
  }
  if ('integerValue' in value) {
    return Number(value.integerValue)
  }
  if ('doubleValue' in value) {
    return Number(value.doubleValue)
  }
  if ('timestampValue' in value) {
    return value.timestampValue
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(decodeValue)
  }
  if ('mapValue' in value) {
    return decodeFields(value.mapValue.fields || {})
  }
  return null
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function encodeValue(value) {
  if (value == null) return { nullValue: null }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() }
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(encodeValue),
      },
    }
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value }
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: encodeFields(value),
      },
    }
  }
  return { stringValue: String(value) }
}

function encodeFields(data = {}) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]))
}

function documentId(name) {
  return String(name || '')
    .split('/')
    .pop()
}

export function decodeDocument(document) {
  return {
    id: documentId(document.name),
    name: document.name,
    createTime: document.createTime,
    updateTime: document.updateTime,
    ...decodeFields(document.fields || {}),
  }
}

function base(env) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    env.FIREBASE_PROJECT_ID,
  )}/databases/(default)/documents`
}

async function request(env, path, options = {}) {
  const token = await getGoogleAccessToken(env)
  const response = await fetch(`${base(env)}/${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  })

  return response
}

export async function getDocument(env, path) {
  const response = await request(env, path.split('/').map(encodeURIComponent).join('/'))

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Firestore GET ${path} falhou (${response.status}): ${await response.text()}`)
  }

  return decodeDocument(await response.json())
}

export async function listCollection(env, path, { limit = 2000 } = {}) {
  const items = []
  let pageToken = ''

  while (items.length < limit) {
    const separator = path.includes('?') ? '&' : '?'
    const query = new URLSearchParams({
      pageSize: String(Math.min(1000, limit - items.length)),
    })
    if (pageToken) {
      query.set('pageToken', pageToken)
    }

    const response = await request(env, `${path}${separator}${query.toString()}`)

    if (response.status === 404) return []
    if (!response.ok) {
      throw new Error(
        `Firestore LIST ${path} falhou (${response.status}): ${await response.text()}`,
      )
    }

    const data = await response.json()
    items.push(...(data.documents || []).map(decodeDocument))

    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return items
}

export async function patchDocument(env, path, data, fieldPaths = Object.keys(data)) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const query = new URLSearchParams()

  for (const field of fieldPaths) {
    query.append('updateMask.fieldPaths', field)
  }

  const response = await request(env, `${encodedPath}?${query.toString()}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: encodeFields(data),
    }),
  })

  if (!response.ok) {
    throw new Error(`Firestore PATCH ${path} falhou (${response.status}): ${await response.text()}`)
  }

  return decodeDocument(await response.json())
}

export async function createOrReplaceDocument(env, path, data) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')

  const response = await request(env, encodedPath, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: encodeFields(data),
    }),
  })

  if (!response.ok) {
    throw new Error(`Firestore WRITE ${path} falhou (${response.status}): ${await response.text()}`)
  }

  return decodeDocument(await response.json())
}

export async function hashKey(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function deleteDocument(env, path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')

  const response = await request(env, encodedPath, { method: 'DELETE' })

  if (response.status !== 404 && !response.ok) {
    throw new Error(
      `Firestore DELETE ${path} falhou (${response.status}): ${await response.text()}`,
    )
  }
}
