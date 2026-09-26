import { expect, test } from 'vitest'
import { MONEY_CONTEXT_PROMPTS, buildMoneyPromptPath } from './moneyContext'

test('gera deep link seguro para abrir o Money com pergunta contextual', () => {
  const path = buildMoneyPromptPath(MONEY_CONTEXT_PROMPTS.spendingLeaks)

  expect(path).toBe(
    '/money?prompt=Quais%20vazamentos%20de%20gastos%20voc%C3%AA%20encontrou%20neste%20per%C3%ADodo%3F',
  )
})

test('volta para a rota simples quando não há prompt', () => {
  expect(buildMoneyPromptPath('')).toBe('/money')
})
