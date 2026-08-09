const DEFAULT_READINESS_CHECKS = Object.freeze({
  backend: true,
  privacy: true,
  indexesManaged: true,
})

function safeCount(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0
}

function percentage(numerator, denominator) {
  const total = safeCount(denominator)
  if (!total) return 0

  return Math.round((safeCount(numerator) / total) * 10_000) / 100
}

function buildCommercialMetrics({
  totalUsers,
  legalAccepted,
  deletionPending,
  deletionProcessing,
  deletionFailed,
  completedDeletions,
  appCheckEnforced,
  generatedAt = new Date(),
}) {
  const counts = {
    totalUsers: safeCount(totalUsers),
    legalAccepted: safeCount(legalAccepted),
    deletionPending: safeCount(deletionPending),
    deletionProcessing: safeCount(deletionProcessing),
    deletionFailed: safeCount(deletionFailed),
    completedDeletions: safeCount(completedDeletions),
  }

  const checks = {
    ...DEFAULT_READINESS_CHECKS,
    appCheck: Boolean(appCheckEnforced),
  }

  return {
    version: '18.0.0',
    generatedAt: generatedAt.toISOString(),
    counts,
    rates: {
      legalAcceptance: percentage(counts.legalAccepted, counts.totalUsers),
    },
    deletionBacklog: counts.deletionPending + counts.deletionProcessing + counts.deletionFailed,
    readiness: {
      checks,
      completed: Object.values(checks).filter(Boolean).length,
      total: Object.keys(checks).length,
      percentage: percentage(
        Object.values(checks).filter(Boolean).length,
        Object.keys(checks).length,
      ),
    },
  }
}

module.exports = {
  buildCommercialMetrics,
  percentage,
  safeCount,
}
