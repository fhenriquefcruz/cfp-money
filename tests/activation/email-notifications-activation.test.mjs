import test from 'node:test'
import assert from 'node:assert/strict'
import {
  runEmailNotificationActivationCheck,
  validateActivationEnvironment,
} from '../../scripts/lib/email-notifications-activation.mjs'

function env(overrides = {}) {
  return {
    EMAIL_NOTIFICATIONS_WORKER_URL: 'https://worker.example',
    EMAIL_NOTIFICATIONS_ADMIN_SECRET: 'a'.repeat(64),
    EMAIL_NOTIFICATIONS_TEST_UID: 'test-user',
    ...overrides,
  }
}

function response(status, body) {
  return {
    status,
    async json() {
      return body
    },
  }
}

test('recusa configuração de ativação incompleta sem expor segredo', () => {
  assert.throws(
    () =>
      validateActivationEnvironment({
        EMAIL_NOTIFICATIONS_ADMIN_SECRET: 'segredo',
      }),
    /EMAIL_NOTIFICATIONS_WORKER_URL/,
  )
})

test('recusa worker sem health pronto', async () => {
  await assert.rejects(
    () =>
      runEmailNotificationActivationCheck({
        env: env(),
        fetchImpl: async () => response(503, { ok: false, configuration: 'incomplete' }),
      }),
    /Worker não está pronto/,
  )
})

test('recusa ativação quando o teste operacional não é enviado', async () => {
  let calls = 0

  await assert.rejects(
    () =>
      runEmailNotificationActivationCheck({
        env: env(),
        fetchImpl: async () => {
          calls += 1
          if (calls === 1) {
            return response(200, { ok: true, configuration: 'ready' })
          }

          return response(409, {
            ok: false,
            status: 'missing-email',
            uid: 'test-user',
          })
        },
      }),
    /Teste operacional falhou/,
  )
})

test('recusa resposta para UID diferente da conta de teste', async () => {
  let calls = 0

  await assert.rejects(
    () =>
      runEmailNotificationActivationCheck({
        env: env(),
        fetchImpl: async () => {
          calls += 1
          if (calls === 1) {
            return response(200, { ok: true, configuration: 'ready' })
          }

          return response(200, {
            ok: true,
            status: 'sent',
            uid: 'outro-usuario',
            providerMessageId: 'msg-1',
          })
        },
      }),
    /UID diferente/,
  )
})

test('aprova somente health pronto e teste operacional enviado', async () => {
  const requests = []

  const result = await runEmailNotificationActivationCheck({
    env: env(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })

      if (url.endsWith('/health')) {
        return response(200, { ok: true, configuration: 'ready' })
      }

      return response(200, {
        ok: true,
        status: 'sent',
        uid: 'test-user',
        providerMessageId: 'provider-message-1',
      })
    },
  })

  assert.deepEqual(result, {
    health: 'ready',
    activationTest: 'sent',
    uid: 'test-user',
    providerMessageId: 'provider-message-1',
  })
  assert.equal(requests.length, 2)
  assert.equal(requests[1].url, 'https://worker.example/activation-test')
  assert.equal(requests[1].options.authorization, undefined)
  assert.match(requests[1].options.headers.authorization, /^Bearer /)
})
