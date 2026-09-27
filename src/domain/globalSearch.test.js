import { normalizeGlobalSearchText, searchGlobal } from './globalSearch'

const pages = [
  ['Dashboard', '/dashboard'],
  ['Relatórios', '/reports'],
]

test('normaliza acentos para pesquisa tolerante', () => {
  expect(normalizeGlobalSearchText('Alimentação')).toBe('alimentacao')
})

test('encontra módulos mesmo sem dados financeiros', () => {
  expect(searchGlobal({ query: 'relatorios', pages })[0]).toMatchObject({
    label: 'Relatórios',
    to: '/reports',
    kind: 'page',
  })
})

test('encontra transação e abre a busca interna sem limitar ao mês atual', () => {
  const [result] = searchGlobal({
    query: 'odontologica',
    pages,
    transactions: [
      {
        id: 'tx-1',
        date: '2026-02-10',
        description: 'Consulta odontológica',
        categoryName: 'Saúde',
        amount: 180,
      },
    ],
  })

  expect(result).toMatchObject({
    id: 'transaction:tx-1',
    label: 'Consulta odontológica',
    kind: 'transaction',
  })
  expect(decodeURIComponent(result.to)).toContain('search=Consulta odontológica')
  expect(result.to).toContain('scope=all')
  expect(result.context).toContain('Saúde')
})

test('encontra categorias, metas e cartões inclusive com termos separados', () => {
  const data = {
    pages,
    categories: [{ id: 'food', name: 'Alimentação' }],
    goals: [{ id: 'car', name: 'Entrada do carro' }],
    creditCards: [{ id: 'nubank', name: 'Nubank', last4: '4582' }],
  }

  expect(searchGlobal({ ...data, query: 'alimentacao' })[0]).toMatchObject({
    to: '/categories',
    kind: 'category',
  })
  expect(searchGlobal({ ...data, query: 'entrada carro' })[0]).toMatchObject({
    to: '/goals',
    kind: 'goal',
  })
  expect(searchGlobal({ ...data, query: '4582' })[0]).toMatchObject({
    to: '/cards',
    kind: 'card',
    context: 'Cartão · Final 4582',
  })
})

test('admin depende das páginas autorizadas recebidas do shell', () => {
  expect(searchGlobal({ query: 'admin', pages })).toEqual([])
  expect(searchGlobal({ query: 'admin', pages: [...pages, ['Admin', '/admin']] })[0]?.to).toBe(
    '/admin',
  )
})

test('consulta vazia retorna somente atalhos de navegação', () => {
  const results = searchGlobal({
    pages,
    transactions: [{ id: 't1', description: 'Mercado' }],
  })

  expect(results.map((item) => item.to)).toEqual(['/dashboard', '/reports'])
})

test('prioriza correspondência exata antes de correspondência parcial', () => {
  const results = searchGlobal({
    query: 'mercado',
    transactions: [
      { id: '1', description: 'Supermercado Central' },
      { id: '2', description: 'Mercado' },
    ],
  })

  expect(results[0].label).toBe('Mercado')
})
