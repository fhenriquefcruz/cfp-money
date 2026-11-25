import { describe, expect, it } from 'vitest'
import {
  CATEGORY_PALETTE,
  categoryAccentStyle,
  categoryCompositionFromTransactions,
  decorateCategoryBreakdown,
  getCategoryColor,
} from './categoryComposition'

describe('Identidade cromática por categoria', () => {
  it('usa uma paleta visual estável sem alterar as cores salvas', () => {
    expect(getCategoryColor({ id: 'food', color: '#8A6251' })).toBe('#8A6251')
    expect(getCategoryColor({ id: 'food' })).toBe(getCategoryColor({ id: 'food' }))
    expect(CATEGORY_PALETTE).toContain(getCategoryColor({ id: 'food' }))
    expect(getCategoryColor({ id: 'food', color: 'red; background: url(http://x)' })).toBe(
      getCategoryColor({ id: 'food' }),
    )
    expect(categoryAccentStyle({ id: 'food', color: '#abc' })).toEqual({
      '--category-accent': '#ABC',
    })
  })

  it('harmoniza categorias globais e personalizadas sem usar cores financeiras', () => {
    expect(
      getCategoryColor({
        id: 'food',
        name: 'Alimentação',
        type: 'expense',
        color: '#f97316',
        isDefault: true,
      }),
    ).toBe(CATEGORY_PALETTE[0])
    expect(
      getCategoryColor({
        id: 'health',
        name: 'Saúde',
        type: 'expense',
        color: '#10b981',
        isDefault: true,
      }),
    ).toBe(CATEGORY_PALETTE[3])
    expect(
      getCategoryColor({
        id: 'leisure',
        name: 'Lazer',
        type: 'expense',
        color: '#8b5cf6',
        isDefault: true,
      }),
    ).toBe(CATEGORY_PALETTE[2])
    expect(
      getCategoryColor({
        id: 'custom',
        name: 'Saúde',
        color: '#10b981',
        type: 'expense',
        isDefault: false,
      }),
    ).toBe('#10B981')
    expect(
      getCategoryColor({
        id: 'salary',
        name: 'Salário',
        color: '#22c55e',
        type: 'income',
        isDefault: true,
      }),
    ).toBe(getCategoryColor({ id: 'salary' }))
  })

  it('mantém cores pessoais nos gráficos sem aceitar CSS arbitrário', () => {
    expect(
      getCategoryColor({ id: 'housing', name: 'Moradia', color: '#bc712a', isDefault: false }),
    ).toBe('#BC712A')
    expect(
      getCategoryColor({ id: 'housing', name: 'Moradia', color: 'red;url(x)', isDefault: false }),
    ).toBe(CATEGORY_PALETTE[1])
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
    expect(result[0]).toMatchObject({
      categoryName: 'Alimentação',
      color: '#B47750',
      count: 2,
    })
    expect(result[1]).toMatchObject({
      categoryName: 'Transporte',
      color: '#4C8192',
      count: 1,
    })
    expect(result.reduce((sum, x) => sum + x.sharePercent, 0)).toBeCloseTo(100)
  })

  it('usa o mesmo destaque do dashboard, sem alterar cálculos nem objetos de origem', () => {
    const source = [
      {
        categoryId: 'food',
        categoryName: 'Comidas',
        categoryColor: '#AC7B4E',
        total: 800,
        sharePercent: 80,
        changePercent: -10,
      },
    ]
    const decorated = decorateCategoryBreakdown(source, [
      { id: 'food', name: 'Alimentação', color: '#4976A0', icon: '🥗' },
    ])
    expect(decorated[0]).toMatchObject({
      total: 800,
      sharePercent: 80,
      changePercent: -10,
      color: '#4976A0',
      categoryName: 'Alimentação',
      icon: '🥗',
    })
    expect(source[0].color).toBeUndefined()
    expect(decorateCategoryBreakdown(source, [])[0].color).toBe('#AC7B4E')
  })

  it('mantém identificáveis lançamentos legados sem categoria cadastrada', () => {
    const rows = categoryCompositionFromTransactions([
      { type: 'expense', categoryName: 'Serviços antigos', amount: 40, categoryColor: '#786C8D' },
    ])
    expect(rows[0]).toMatchObject({
      categoryName: 'Serviços antigos',
      total: 40,
      sharePercent: 100,
    })
    expect(rows[0].color).toBe('#786C8D')
  })
  it('reconcilia despesas legadas pt-BR e decimais em centavos inteiros', () => {
    const rows = categoryCompositionFromTransactions(
      [
        { type: 'expense', categoryId: 'food', amount: '100,50' },
        { type: 'expense', categoryId: 'food', amount: 0.1 },
        { type: 'expense', categoryId: 'food', amount: 0.2 },
        { type: 'expense', categoryId: 'food', amount: 'R$ 1.234,56' },
        { type: 'expense', categoryId: 'food', amount: 'invalido' },
      ],
      [{ id: 'food', name: 'Mercado' }],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      total: 1335.36,
      count: 4,
      sharePercent: 100,
    })
  })
})
