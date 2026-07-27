const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildAccessUpdate,
  calculateEntitlement,
  normalizeAdminAction,
} = require('../lib/access')

test('trial ativo libera recursos premium', () => {
  const now = new Date('2026-07-27T12:00:00.000Z')
  const status = calculateEntitlement(
    {
      plan: 'trial',
      trialStart: new Date('2026-07-24T12:00:00.000Z'),
      blocked: false,
    },
    { now },
  )

  assert.equal(status.isPremium, true)
  assert.equal(status.isTrial, true)
  assert.equal(status.daysLeft, 4)
})

test('usuário bloqueado não recebe acesso', () => {
  const status = calculateEntitlement(
    {
      plan: 'premium',
      premiumUntil: new Date('2027-01-01T00:00:00.000Z'),
      blocked: true,
    },
    {
      now: new Date('2026-07-27T00:00:00.000Z'),
    },
  )

  assert.equal(status.isPremium, false)
  assert.equal(status.blocked, true)
  assert.equal(status.isExpired, true)
})

test('renovação soma meses ao prazo premium ainda ativo', () => {
  const update = buildAccessUpdate(
    {
      plan: 'premium',
      premiumUntil: new Date('2026-08-10T00:00:00.000Z'),
    },
    {
      targetUid: 'user-1',
      action: 'activate',
      months: 1,
    },
    new Date('2026-07-27T00:00:00.000Z'),
  )

  assert.equal(update.plan, 'premium')
  assert.equal(
    update.premiumUntil.toISOString(),
    '2026-09-09T00:00:00.000Z',
  )
  assert.equal(update.blocked, false)
})

test('ativação expirada começa a contar da data atual', () => {
  const update = buildAccessUpdate(
    {
      plan: 'premium',
      premiumUntil: new Date('2026-01-01T00:00:00.000Z'),
    },
    {
      targetUid: 'user-1',
      action: 'activate',
      months: 2,
    },
    new Date('2026-07-27T00:00:00.000Z'),
  )

  assert.equal(
    update.premiumUntil.toISOString(),
    '2026-09-25T00:00:00.000Z',
  )
})

test('rejeita prazo administrativo fora do limite', () => {
  assert.throws(
    () =>
      normalizeAdminAction({
        targetUid: 'user-1',
        action: 'activate',
        months: 25,
      }),
    /entre 1 e 24 meses/,
  )
})

test('remoção do premium preserva outros campos', () => {
  assert.deepEqual(
    buildAccessUpdate(
      {},
      {
        targetUid: 'user-1',
        action: 'remove',
      },
    ),
    {
      plan: 'free',
      premiumUntil: null,
    },
  )
})
