import { normalizeGlobalSearchText, searchGlobal } from './globalSearch'

test('normaliza acentos e espaços para pesquisa tolerante', () => {
  expect(normalizeGlobalSearchText('  Alimentação   Mensal ')).toBe('alimentacao mensal')
})

test('encontra módulos mesmo sem dados financeiros', () => {
  expect(searchGlobal({ query: 'relatorios' })[0]).toEqual({
    label: 'Relatórios',
    to: '/reports',
  })
})

test('encontra transação e cria rota para a busca interna', () => {
  const [result] = searchGlobal({
    query: 'odontologica',
    transactions: [
      {
        id: 'tx-1',
        description: 'Consulta odontológica',
        categoryName: 'Saúde',
        amount: 180,
      },
    ],
  })

  expect(result.label).toBe('Consulta odontológica')
  expect(decodeURIComponent(result.to)).toContain('Consulta odontológica')
})

test('encontra categorias, metas e cartões inclusive com termos separados', () => {
  const data = {
    categories: [{ id: 'food', name: 'Alimentação', type: 'expense' }],
    goals: [{ id: 'car', name: 'Entrada do carro', targetAmount: 60000 }],
    creditCards: [{ id: 'nubank', name: 'Nubank', last4: '4582', brand: 'mastercard' }],
  }

  expect(searchGlobal({ ...data, query: 'alimentacao' })[0]?.to).toBe('/categories')
  expect(searchGlobal({ ...data, query: 'entrada carro' })[0]?.to).toBe('/goals')
  expect(searchGlobal({ ...data, query: '4582' })[0]?.to).toBe('/cards')
})

test('admin só aparece para usuário autorizado', () => {
  expect(searchGlobal({ query: 'admin' })).toEqual([])
  expect(searchGlobal({ query: 'admin', isAdmin: true })[0]?.to).toBe('/admin')
})

test('consulta vazia retorna atalhos de navegação antes dos dados', () => {
  const results = searchGlobal({
    transactions: [{ id: 't1', description: 'Mercado', amount: 100 }],
    limit: 5,
  })

  expect(results).toHaveLength(5)
  expect(results.map((item) => item.to)).toEqual([
    '/dashboard',
    '/money',
    '/cards',
    '/transactions',
    '/categories',
  ])
})
