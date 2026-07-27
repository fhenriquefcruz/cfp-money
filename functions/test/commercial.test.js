const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildCommercialMetrics,
  percentage,
  safeCount,
} = require('../lib/commercialDomain')

test('normaliza contagens inválidas', () => {
  assert.equal(safeCount(-5), 0)
  assert.equal(safeCount('12'), 12)
  assert.equal(safeCount('abc'), 0)
})

test('calcula percentual com duas casas', () => {
  assert.equal(percentage(1, 3), 33.33)
  assert.equal(percentage(0, 0), 0)
})

test('monta métricas comerciais agregadas', () => {
  const metrics = buildCommercialMetrics({
    totalUsers: 100,
    telegramLinked: 25,
    legalAccepted: 80,
    deletionPending: 2,
    deletionProcessing: 1,
    deletionFailed: 1,
    completedDeletions: 7,
    appCheckEnforced: true,
    generatedAt: new Date(
      '2026-07-27T12:00:00.000Z',
    ),
  })

  assert.equal(metrics.version, '18.0.0')
  assert.equal(metrics.rates.telegramAdoption, 25)
  assert.equal(metrics.rates.legalAcceptance, 80)
  assert.equal(metrics.deletionBacklog, 4)
  assert.equal(metrics.readiness.percentage, 100)
})

test('sinaliza App Check pendente', () => {
  const metrics = buildCommercialMetrics({
    totalUsers: 10,
    appCheckEnforced: false,
  })

  assert.equal(metrics.readiness.checks.appCheck, false)
  assert.equal(metrics.readiness.completed, 4)
  assert.equal(metrics.readiness.total, 5)
  assert.equal(metrics.readiness.percentage, 80)
})

test('não produz NaN sem usuários', () => {
  const metrics = buildCommercialMetrics({
    totalUsers: 0,
    telegramLinked: 5,
    legalAccepted: 4,
  })

  assert.equal(metrics.rates.telegramAdoption, 0)
  assert.equal(metrics.rates.legalAcceptance, 0)
})
