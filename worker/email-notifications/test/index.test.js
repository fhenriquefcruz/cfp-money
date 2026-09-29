import test from 'node:test'
import assert from 'node:assert/strict'
import worker, { getEnvironmentReadiness } from '../src/index.js'

function readyEnvironment(overrides = {}) {
  return {
    FIREBASE_PROJECT_ID: 'cfp-money',
    APP_URL: 'https://example.com/#/profile',
    SENDER_EMAIL: 'sender@example.com',
    GOOGLE_CLIENT_EMAIL: 'service-account@example.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\nTESTE\n-----END PRIVATE KEY-----',
    BREVO_API_KEY: 'brevo-test-key',
    ADMIN_TRIGGER_SECRET: 'a'.repeat(64),
    ...overrides,
  }
}

test('preflight identifica ambiente completo sem expor valores', () => {
  const env = readyEnvironment()
  const readiness = getEnvironmentReadiness(env)

  assert.equal(readiness.ready, true)
  assert.deepEqual(readiness.missing, [])
  assert.deepEqual(readiness.invalid, [])
  assert.equal(JSON.stringify(readiness).includes(env.ADMIN_TRIGGER_SECRET), false)
  assert.equal(JSON.stringify(readiness).includes(env.BREVO_API_KEY), false)
})

test('preflight rejeita segredo curto e chave privada inválida', () => {
  const readiness = getEnvironmentReadiness(
    readyEnvironment({
      ADMIN_TRIGGER_SECRET: 'curto',
      GOOGLE_PRIVATE_KEY: 'invalida',
    }),
  )

  assert.equal(readiness.ready, false)
  assert.deepEqual(readiness.missing, [])
  assert.deepEqual(readiness.invalid.sort(), ['ADMIN_TRIGGER_SECRET', 'GOOGLE_PRIVATE_KEY'])
})

test('/health retorna 503 quando configuração está incompleta', async () => {
  const response = await worker.fetch(new Request('https://worker.example/health'), {})
  const body = await response.json()

  assert.equal(response.status, 503)
  assert.equal(body.ok, false)
  assert.equal(body.configuration, 'incomplete')
  assert.equal(JSON.stringify(body).includes('ADMIN_TRIGGER_SECRET'), false)
})

test('/health retorna 200 somente com preflight aprovado', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/health'),
    readyEnvironment(),
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.configuration, 'ready')
})

test('/run não aceita Bearer undefined quando segredo não está configurado', async () => {
  const env = readyEnvironment({ ADMIN_TRIGGER_SECRET: undefined })
  const response = await worker.fetch(
    new Request('https://worker.example/run', {
      method: 'POST',
      headers: {
        authorization: 'Bearer undefined',
        'content-type': 'application/json',
      },
      body: '{}',
    }),
    env,
  )

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'service-unavailable',
  })
})

test('/run exige bearer exato quando serviço está pronto', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/run', {
      method: 'POST',
      headers: {
        authorization: 'Bearer incorreto',
        'content-type': 'application/json',
      },
      body: '{}',
    }),
    readyEnvironment(),
  )

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'forbidden',
  })
})
