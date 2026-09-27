const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeSupportResponse, publicAdminUserSnapshot } = require('../admin')

test('normaliza resposta administrativa de suporte', () => {
  assert.deepEqual(
    normalizeSupportResponse({
      requestId: ' support-1 ',
      status: 'answered',
      response: '  Resolvido com sucesso.  ',
    }),
    {
      requestId: 'support-1',
      status: 'answered',
      response: 'Resolvido com sucesso.',
    },
  )
})

test('rejeita status administrativo de suporte inválido', () => {
  assert.throws(
    () =>
      normalizeSupportResponse({
        requestId: 'support-1',
        status: 'deleted',
        response: 'Resposta válida.',
      }),
    /Status de atendimento inválido/,
  )
})

test('rejeita resposta administrativa vazia', () => {
  assert.throws(
    () =>
      normalizeSupportResponse({
        requestId: 'support-1',
        status: 'answered',
        response: ' ',
      }),
    /entre 2 e 4000 caracteres/,
  )
})

test('expõe somente campos necessários do usuário no painel admin', () => {
  const document = {
    id: 'user-1',
    data: () => ({
      email: 'user@example.com',
      displayName: 'Usuário',
      plan: 'premium',
      trialStart: new Date('2026-09-01T12:00:00.000Z'),
      premiumUntil: new Date('2026-10-01T12:00:00.000Z'),
      blocked: false,
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
      moneySettings: { hidden: true },
    }),
  }

  assert.deepEqual(publicAdminUserSnapshot(document), {
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'Usuário',
    plan: 'premium',
    trialStart: '2026-09-01T12:00:00.000Z',
    premiumUntil: '2026-10-01T12:00:00.000Z',
    blocked: false,
    createdAt: '2026-08-01T12:00:00.000Z',
  })
})
