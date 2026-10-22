import { describe, expect, it } from 'vitest'
import {
  CATEGORY_PALETTE,
  categoryAccentStyle,
  categoryCompositionFromTransactions,
  decorateCategoryBreakdown,
  getCategoryColor,
} from './categoryComposition'

describe('Identidade cromática por categoria', () => {
  it('mantém a cor personalizada e oferece fallback estável quando ausente', () => {
    expect(getCategoryColor({ id: 'food', color: '#8A6251' })).toBe('#8A6251')
    expect(getCategoryColor({ id: 'food' })).toBe(getCategoryColor({ id: 'food' }))
    expect(CATEGORY_PALETTE).toContain(getCategoryColor({ id: 'food' }))
    expect(getCategoryColor({ id: 'food', color: 'red; background: url(http://x)' }))
      .toBe(getCategoryColor({ id: 'food' }))
    expect(categoryAccentStyle({ color: '#abc' })).toEqual({ '--category-accent': '#abc' })
  })

  it('agrega somente despesas efetivas e preserva uma cor por categoria', () => {
    const categories = [
      { id: 'food', name: 'Alimentação', color: '#B47750', icon: '🍽️' },
      { id: 'travel', name: 'Transporte', color: '#4C8192', icon: '🚙' },
    ]
    const transactions = [
      { type: 'expense', categoryId: 'food', amount: 200 },
      { type: 'expense', categoryId: 'food', amount: 100, paymentStatus: 'paid' },
      { type: 'expense', categoryId: 'travel', amount: 150, paymentStatus: 'pending' },
      { type: 'expense', categoryId: 'travel', amount: 200, paymentStatus: 'cancelled' },
      { type: 'expense', isSavings: true, amount: 10000, categoryId: 'food' },
      { type: 'expense', flowType: 'transfer', amount: 800, categoryId: 'travel' },
      { type: 'income', amount: 2000, categoryId: 'food' },
      { type: 'expense', categoryId: 'food', amount: Number.NaN },
    ]
    const result = categoryCompositionFromTransactions(transactions, categories)
    expect(result).toHaveLength(2)
    expect(result.map((x) => x.total)).toEqual([300, 150])
    expect(result[0]).toMatchObject({ categoryName: 'Alimentação', color: '#B47750', count: 2 })
    expect(result[1]).toMatchObject({ categoryName: 'Transporte', color: '#4C8192', count: 1 })
    expect(result.reduce((sum, x) => sum + x.sharePercent, 0)).toBeCloseTo(100)
  })

  it('usa o mesmo destaque do dashboard, sem alterar cálculos nem objetos de origem', () => {
    const source = [{ categoryId: 'food', categoryName: 'Comidas', categoryColor: '#AC7B4E', total: 800, sharePercent: 80, changePercent: -10 }]
    const decorated = decorateCategoryBreakdown(source, [{ id: 'food', name: 'Alimentação', color: '#4976A0', icon: '🥗' }])
    expect(decorated[0]).toMatchObject({ total: 800, sharePercent: 80, changePercent: -10, color: '#4976A0', categoryName: 'Alimentação', icon: '🥗' })
    expect(source[0].color).toBeUndefined()
    expect(decorateCategoryBreakdown(source, [])[0].color).toBe('#AC7B4E')
  })

  it('mantém identificáveis lançamentos legados sem categoria cadastrada', () => {
    const rows = categoryCompositionFromTransactions([
      { type: 'expense', categoryName: 'Serviços antigos', amount: 40, categoryColor: '#786C8D' },
    ])
    expect(rows).toMatchObject([{ categoryName: 'Serviços antigos', total: 40, color: '#786C8D', sharePercent: 100 }])
  })
})
