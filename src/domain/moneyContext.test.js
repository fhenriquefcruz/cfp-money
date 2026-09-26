import { expect, test } from 'vitest'
import { MONEY_CONTEXT_PROMPTS, buildMoneyPromptPath, readMoneyPromptContext } from './moneyContext'

test('gera deep link seguro para abrir o Money com pergunta contextual', () => {
  const path = buildMoneyPromptPath(MONEY_CONTEXT_PROMPTS.spendingLeaks)

  expect(path).toBe(
    '/money?prompt=Quais+vazamentos+de+gastos+voc%C3%AA+encontrou+neste+per%C3%ADodo%3F',
  )
})

test('preserva a data de referência do contexto financeiro', () => {
  const path = buildMoneyPromptPath(MONEY_CONTEXT_PROMPTS.financialHealth, {
    referenceDate: new Date(2026, 7, 15),
  })
  const query = path.split('?')[1]
  const context = readMoneyPromptContext(new URLSearchParams(query))

  expect(context).toEqual({
    prompt: MONEY_CONTEXT_PROMPTS.financialHealth,
    referenceDate: '2026-08-15',
  })
})

test('descarta data de referência inválida', () => {
  const context = readMoneyPromptContext(
    new URLSearchParams('prompt=Como+estao+minhas+financas&reference=ontem'),
  )

  expect(context.referenceDate).toBeNull()
})

test('volta para a rota simples quando não há prompt', () => {
  expect(buildMoneyPromptPath('')).toBe('/money')
})
