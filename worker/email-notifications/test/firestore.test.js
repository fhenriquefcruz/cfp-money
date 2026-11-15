import test from 'node:test'
import assert from 'node:assert/strict'
import { assertCompleteCollectionPage } from '../src/firestore.js'

test('leitura completa não confunde última página exata com truncamento', () => {
  assert.doesNotThrow(() => assertCompleteCollectionPage(10000, 10000, ''))
  assert.doesNotThrow(() => assertCompleteCollectionPage(9999, 10000, 'next-page'))
  assert.doesNotThrow(() => assertCompleteCollectionPage(0, 10000, undefined))
})

test('histórico maior que o limite interrompe alertas em vez de usar saldo parcial', () => {
  assert.throws(() => assertCompleteCollectionPage(10000, 10000, 'next-page'), /dados incompletos/)
  assert.throws(() => assertCompleteCollectionPage(10001, 10000, 'next-page'), /dados incompletos/)
})
