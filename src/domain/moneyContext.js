export const MONEY_CONTEXT_PROMPTS = Object.freeze({
  financialHealth: 'Como estão minhas finanças?',
  spendingLeaks: 'Quais vazamentos de gastos você encontrou neste período?',
})

export function buildMoneyPromptPath(prompt) {
  const value = String(prompt || '').trim()
  if (!value) return '/money'
  return `/money?prompt=${encodeURIComponent(value)}`
}
