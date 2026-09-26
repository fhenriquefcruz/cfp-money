export const MONEY_CONTEXT_PROMPTS = Object.freeze({
  financialHealth: 'Como estão minhas finanças?',
  spendingLeaks: 'Quais vazamentos de gastos você encontrou neste período?',
})

function normalizeReferenceDate(value) {
  if (!value) return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-')
  }

  const raw = String(value).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

export function buildMoneyPromptPath(prompt, { referenceDate } = {}) {
  const value = String(prompt || '').trim()
  if (!value) return '/money'

  const params = new URLSearchParams({ prompt: value })
  const normalizedReference = normalizeReferenceDate(referenceDate)
  if (normalizedReference) params.set('reference', normalizedReference)

  return `/money?${params.toString()}`
}

export function readMoneyPromptContext(searchParams) {
  const prompt = String(searchParams?.get?.('prompt') || '').trim()
  const referenceDate = normalizeReferenceDate(searchParams?.get?.('reference'))

  return {
    prompt,
    referenceDate: referenceDate || null,
  }
}
