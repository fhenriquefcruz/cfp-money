import { describe, expect, it } from 'vitest'
import { resolveExportSummary } from './index'

const summary = {
  income: 5000,
  expenses: 3200,
  balance: 1800,
  savings: 400,
}

describe('resolveExportSummary', () => {
  it('aceita a assinatura atual com o resumo no segundo argumento', () => {
    expect(resolveExportSummary(summary)).toEqual(summary)
  })

  it('mantém compatibilidade com categorias e resumo no terceiro argumento', () => {
    const categories = [{ id: 'food', name: 'Alimentação' }]
    expect(resolveExportSummary(categories, summary)).toEqual(summary)
  })

  it('não interpreta uma lista de categorias como resumo financeiro', () => {
    expect(resolveExportSummary([{ id: 'food' }])).toEqual({})
  })
})
