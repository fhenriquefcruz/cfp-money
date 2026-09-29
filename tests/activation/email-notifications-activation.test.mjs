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

test('recusa ativação quando nenhum relatório de teste foi processado', async () => {
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
            results: [
              {
                uid: 'test-user',
                status: 'processed',
                reports: 0,
                alerts: 0,
              },
            ],
          })
        },
      }),
    /Nenhum relatório de teste foi processado/,
  )
})

test('aprova somente health pronto e relatório de teste processado', async () => {
  const requests = []

  const result = await runEmailNotificationActivationCheck({
    env: env(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })

      if (url.endsWith('/health')) {
        return response(200, { ok: true, configuration: 'ready' })
      }

      return response(200, {
        results: [
          {
            uid: 'test-user',
            status: 'processed',
            reports: 1,
            alerts: 2,
          },
        ],
      })
    },
  })

  assert.deepEqual(result, {
    health: 'ready',
    processed: true,
    reports: 1,
    alerts: 2,
  })
  assert.equal(requests.length, 2)
  assert.equal(requests[1].options.authorization, undefined)
  assert.match(requests[1].options.headers.authorization, /^Bearer /)
})
