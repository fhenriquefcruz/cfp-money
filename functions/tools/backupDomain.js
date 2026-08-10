const crypto = require('node:crypto')

const BACKUP_VERSION = 1
const ALGORITHM = 'aes-256-gcm'

function requirePassphrase(value) {
  const passphrase = String(value || '')

  if (passphrase.length < 12) {
    throw new Error('A senha do backup deve ter pelo menos 12 caracteres.')
  }

  return passphrase
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(requirePassphrase(passphrase), salt, 32, {
    cost: 16384,
    blockSize: 8,
    parallelization: 1,
    maxmem: 64 * 1024 * 1024,
  })
}

function encryptJson(payload, passphrase) {
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = deriveKey(passphrase, salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return JSON.stringify(
    {
      version: BACKUP_VERSION,
      algorithm: ALGORITHM,
      kdf: 'scrypt',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    },
    null,
    2,
  )
}

function decryptJson(input, passphrase) {
  const envelope = typeof input === 'string' ? JSON.parse(input) : input

  if (envelope?.version !== BACKUP_VERSION || envelope?.algorithm !== ALGORITHM) {
    throw new Error('Formato de backup não suportado.')
  }

  const salt = Buffer.from(envelope.salt, 'base64')
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
  const key = deriveKey(passphrase, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return JSON.parse(plaintext.toString('utf8'))
}

module.exports = {
  BACKUP_VERSION,
  decryptJson,
  encryptJson,
}
