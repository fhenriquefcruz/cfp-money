import { buildCategoryReviewQueue, reviewTransactionCategory } from './categoryReview'

const categories = [
  { id: 'fuel', name: 'Combustível', type: 'expense' },
  { id: 'ride', name: 'Transporte por aplicativo', type: 'expense' },
  { id: 'loan', name: 'Empréstimos', type: 'expense' },
]

test('sinaliza descrição incompatível sem alterar a transação', () => {
  const transaction = {
    id: 'tx-1',
    type: 'expense',
    description: 'Uber viagem centro',
    categoryId: 'fuel',
    categoryName: 'Combustível',
    amount: 42,
  }

  expect(reviewTransactionCategory(transaction, categories)).toMatchObject({
    transactionId: 'tx-1',
    currentCategoryName: 'Combustível',
    suggestedCategoryId: 'ride',
    suggestedCategoryName: 'Transporte por aplicativo',
    requiresConfirmation: true,
  })
  expect(transaction.categoryId).toBe('fuel')
})

test('sinaliza consórcio classificado como combustível mesmo sem categoria de destino existente', () => {
  expect(
    reviewTransactionCategory(
      {
        id: 'tx-2',
        type: 'expense',
        description: 'CONSÓRCIO parcela mensal',
        categoryId: 'fuel',
        categoryName: 'Combustível',
      },
      categories,
    ),
  ).toMatchObject({
    suggestedFamily: 'vehicle_financing',
    suggestedCategoryId: null,
    suggestedCategoryName: 'Consórcio / financiamento',
  })
})

test('não cria falso alerta quando descrição e categoria pertencem à mesma família', () => {
  expect(
    reviewTransactionCategory(
      {
        id: 'tx-3',
        type: 'expense',
        description: 'Posto avenida gasolina',
        categoryId: 'fuel',
      },
      categories,
    ),
  ).toBeNull()
})

test('ignora cancelamentos e monta uma fila de revisão', () => {
  const queue = buildCategoryReviewQueue(
    [
      { id: 'ok', type: 'expense', description: 'Gasolina', categoryId: 'fuel' },
      { id: 'review', type: 'expense', description: '99 app corrida', categoryId: 'fuel' },
      {
        id: 'cancelled',
        type: 'expense',
        description: 'Uber',
        categoryId: 'fuel',
        paymentStatus: 'cancelled',
      },
    ],
    categories,
  )

  expect(queue).toHaveLength(1)
  expect(queue[0].transactionId).toBe('review')
})
