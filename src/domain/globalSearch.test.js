import {
  buildGlobalSearchIndex,
  normalizeGlobalSearchText,
  searchGlobalIndex,
} from './globalSearch'

test('normaliza acentos e espaços para pesquisa tolerante', () => {
  expect(normalizeGlobalSearchText('  Alimentação   Mensal ')).toBe('alimentacao mensal')
})

test('encontra módulos mesmo sem dados financeiros', () => {
  const index = buildGlobalSearchIndex()

  expect(searchGlobalIndex(index, 'relatorios')[0]).toMatchObject({
    kind: 'module',
    label: 'Relatórios',
    to: '/reports',
  })
})

test('encontra transação por descrição e cria rota para a busca interna', () => {
  const index = buildGlobalSearchIndex({
    transactions: [
      {
        id: 'tx-1',
        description: 'Consulta odontológica',
        categoryName: 'Saúde',
        type: 'expense',
        amount: 180,
      },
    ],
  })

  const [result] = searchGlobalIndex(index, 'odontologica')

  expect(result).toMatchObject({
    kind: 'transaction',
    label: 'Consulta odontológica',
  })
  expect(result.to).toContain('/transactions?search=')
  expect(decodeURIComponent(result.to)).toContain('Consulta odontológica')
})

test('encontra categorias, metas e cartões pelos seus campos principais', () => {
  const index = buildGlobalSearchIndex({
    categories: [{ id: 'food', name: 'Alimentação', type: 'expense' }],
    goals: [{ id: 'car', name: 'Entrada do carro', targetAmount: 60000 }],
    creditCards: [{ id: 'nubank', name: 'Nubank', last4: '4582', brand: 'mastercard' }],
  })

  expect(searchGlobalIndex(index, 'alimentacao')[0]?.kind).toBe('category')
  expect(searchGlobalIndex(index, 'entrada carro')[0]?.kind).toBe('goal')
  expect(searchGlobalIndex(index, '4582')[0]?.kind).toBe('card')
})

test('admin só aparece para usuário autorizado', () => {
  expect(searchGlobalIndex(buildGlobalSearchIndex({ isAdmin: false }), 'admin')).toEqual([])
  expect(searchGlobalIndex(buildGlobalSearchIndex({ isAdmin: true }), 'admin')[0]).toMatchObject({
    kind: 'module',
    to: '/admin',
  })
})

test('consulta vazia retorna somente atalhos de navegação no topo', () => {
  const index = buildGlobalSearchIndex({
    transactions: [{ id: 't1', description: 'Mercado', amount: 100, type: 'expense' }],
  })
  const results = searchGlobalIndex(index, '', 5)

  expect(results).toHaveLength(5)
  expect(results.every((item) => item.kind === 'module')).toBe(true)
})
