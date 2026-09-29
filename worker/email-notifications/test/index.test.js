import test from 'node:test'
import assert from 'node:assert/strict'
import worker, { getEnvironmentReadiness, runActivationTest } from '../src/index.js'

function readyEnvironment(overrides = {}) {
  return {
    FIREBASE_PROJECT_ID: 'cfp-money',
    APP_URL: 'https://example.com/#/profile',
    SENDER_EMAIL: 'sender@example.com',
    GOOGLE_CLIENT_EMAIL: 'service-account@example.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nTESTE\n-----END PRIVATE KEY-----',
    BREVO_API_KEY: 'brevo-test-key',
    ADMIN_TRIGGER_SECRET: 'a'.repeat(64),
    ACTIVATION_TEST_UID: 'test-user',
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

test('preflight exige UID fixo para o teste operacional', () => {
  const readiness = getEnvironmentReadiness(
    readyEnvironment({
      ACTIVATION_TEST_UID: undefined,
    }),
  )

  assert.equal(readiness.ready, false)
  assert.deepEqual(readiness.missing, ['ACTIVATION_TEST_UID'])
})

test('teste operacional falha quando a conta configurada não existe', async () => {
  const result = await runActivationTest(readyEnvironment(), {
    getDocumentImpl: async () => null,
    sendEmailImpl: async () => {
      throw new Error('não deveria enviar')
    },
  })

  assert.deepEqual(result, {
    ok: false,
    status: 'user-not-found',
    uid: 'test-user',
  })
})

test('teste operacional envia somente para o e-mail da conta fixa', async () => {
  const calls = []
  const result = await runActivationTest(readyEnvironment(), {
    getDocumentImpl: async (_env, path) => {
      assert.equal(path, 'users/test-user')
      return {
        id: 'test-user',
        email: 'teste@example.com',
        displayName: 'Conta de Teste',
      }
    },
    sendEmailImpl: async (_env, payload) => {
      calls.push(payload)
      return {
        messageId: 'provider-message-1',
      }
    },
  })

  assert.deepEqual(result, {
    ok: true,
    status: 'sent',
    uid: 'test-user',
    providerMessageId: 'provider-message-1',
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].to, 'teste@example.com')
  assert.deepEqual(calls[0].tags, ['activation-test'])
  assert.match(calls[0].subject, /Teste operacional/)
  assert.doesNotMatch(calls[0].html, /R\$|Receitas|Despesas|Saldo do período/)
})
