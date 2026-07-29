let tokenCache = null

function base64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input)

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function pemToArrayBuffer(pem) {
  const normalized = String(pem)
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')

  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

async function signJwt(unsigned, privateKey) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )

  return base64Url(new Uint8Array(signature))
}

export async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000)

  if (tokenCache && tokenCache.expiresAt > now + 60) {
    return tokenCache.value
  }

  const tokenUri = env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token'
  const header = base64Url(
    JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
    }),
  )
  const claims = base64Url(
    JSON.stringify({
      iss: env.GOOGLE_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claims}`
  const signature = await signJwt(unsigned, env.GOOGLE_PRIVATE_KEY)
  const assertion = `${unsigned}.${signature}`

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    throw new Error(`Google OAuth falhou (${response.status}): ${await response.text()}`)
  }

  const data = await response.json()
  tokenCache = {
    value: data.access_token,
    expiresAt: now + Number(data.expires_in || 3600),
  }

  return tokenCache.value
}
