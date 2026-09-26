import { normalizeGlobalSearchText, searchGlobal } from './globalSearch'

const pages = [
  ['Dashboard', '/dashboard'],
  ['Relatórios', '/reports'],
]

test('normaliza acentos para pesquisa tolerante', () => {
  expect(normalizeGlobalSearchText('Alimentação')).toBe('alimentacao')
})

test('encontra módulos mesmo sem dados financeiros', () => {
  expect(searchGlobal({ query: 'relatorios', pages })[0]).toEqual({
    label: 'Relatórios',
    to: '/reports',
  })
})

test('encontra transação e cria rota para a busca interna', () => {
  const [result] = searchGlobal({
    query: 'odontologica',
    pages,
    transactions: [
      {
        id: 'tx-1',
        description: 'Consulta odontológica',
        categoryName: 'Saúde',
      },
    ],
  })

  expect(result.label).toBe('Consulta odontológica')
  expect(decodeURIComponent(result.to)).toContain('Consulta odontológica')
})

test('encontra categorias, metas e cartões inclusive com termos separados', () => {
  const data = {
    pages,
    categories: [{ id: 'food', name: 'Alimentação' }],
    goals: [{ id: 'car', name: 'Entrada do carro' }],
    creditCards: [{ id: 'nubank', name: 'Nubank', last4: '4582' }],
  }

  expect(searchGlobal({ ...data, query: 'alimentacao' })[0]?.to).toBe('/categories')
  expect(searchGlobal({ ...data, query: 'entrada carro' })[0]?.to).toBe('/goals')
  expect(searchGlobal({ ...data, query: '4582' })[0]?.to).toBe('/cards')
})

test('admin depende das páginas autorizadas recebidas do shell', () => {
  expect(searchGlobal({ query: 'admin', pages })).toEqual([])
  expect(searchGlobal({ query: 'admin', pages: [...pages, ['Admin', '/admin']] })[0]?.to).toBe(
    '/admin',
  )
})

test('consulta vazia retorna atalhos de navegação antes dos dados', () => {
  const results = searchGlobal({
    pages,
    transactions: [{ id: 't1', description: 'Mercado' }],
  })

  expect(results.map((item) => item.to)).toEqual(['/dashboard', '/reports', '/transactions?search=Mercado'])
})
