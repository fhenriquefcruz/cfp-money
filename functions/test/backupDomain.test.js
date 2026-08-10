const assert = require('node:assert/strict')
const test = require('node:test')
const { decryptJson, encryptJson } = require('../tools/backupDomain')

const PASSPHRASE = 'meu-real-backup-test-2026'

test('criptografa e restaura JSON sem perda', () => {
  const original = {
    projectId: 'demo-cfp-money',
    users: [{ id: 'user-1', amount: 1990 }],
  }

  const encrypted = encryptJson(original, PASSPHRASE)
  const restored = decryptJson(encrypted, PASSPHRASE)

  assert.deepEqual(restored, original)
  assert.equal(encrypted.includes('user-1'), false)
})

test('rejeita senha incorreta', () => {
  const encrypted = encryptJson({ secret: 'valor' }, PASSPHRASE)

  assert.throws(() => decryptJson(encrypted, 'senha-incorreta-1234'))
})

test('exige senha com pelo menos 12 caracteres', () => {
  assert.throws(() => encryptJson({ ok: true }, 'curta'))
})
