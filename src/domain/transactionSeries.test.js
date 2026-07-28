import {
  SERIES_SCOPE,
  buildSeriesDeletePlan,
  buildSeriesEditPlan,
  getSeriesMembers,
  getSeriesSelection,
  getTransactionSeries,
  isTransactionSeries,
} from './transactionSeries'

const installments = [
  {
    id: 'p1',
    type: 'expense',
    amount: 33.34,
    date: '2026-08-10',
    installmentNum: 1,
    installmentOf: 3,
    installmentGroupId: 'purchase-1',
    originalAmount: 100,
  },
  {
    id: 'p2',
    type: 'expense',
    amount: 33.33,
    date: '2026-09-10',
    installmentNum: 2,
    installmentOf: 3,
    installmentGroupId: 'purchase-1',
    originalAmount: 100,
  },
  {
    id: 'p3',
    type: 'expense',
    amount: 33.33,
    date: '2026-10-10',
    installmentNum: 3,
    installmentOf: 3,
    installmentGroupId: 'purchase-1',
    originalAmount: 100,
  },
]

const recurring = [
  {
    id: 'r1',
    type: 'expense',
    amount: 80,
    date: '2026-08-05',
    isRecurring: true,
    recurringGroupId: 'rent-1',
  },
  {
    id: 'r2',
    type: 'expense',
    amount: 80,
    date: '2026-09-05',
    isRecurring: true,
    recurringGroupId: 'rent-1',
  },
  {
    id: 'r3',
    type: 'expense',
    amount: 80,
    date: '2026-10-05',
    isRecurring: true,
    recurringGroupId: 'rent-1',
  },
]

const transactions = [...installments, ...recurring]

test('identifica parcelamentos e recorrências', () => {
  expect(getTransactionSeries(installments[0])).toMatchObject({
    kind: 'installment',
    id: 'purchase-1',
  })
  expect(getTransactionSeries(recurring[0])).toMatchObject({
    kind: 'recurring',
    id: 'rent-1',
  })
  expect(isTransactionSeries({ id: 'single' })).toBe(false)
})

test('ordena e seleciona esta parcela e as próximas', () => {
  expect(getSeriesMembers(transactions, installments[1]).map((item) => item.id)).toEqual([
    'p1',
    'p2',
    'p3',
  ])

  const selection = getSeriesSelection({
    transactions,
    anchor: installments[1],
    scope: SERIES_SCOPE.FOLLOWING,
  })

  expect(selection.selected.map((item) => item.id)).toEqual(['p2', 'p3'])
  expect(selection.remaining.map((item) => item.id)).toEqual(['p1'])
})

test('redistribui centavos ao editar o total de uma compra parcelada', () => {
  const plan = buildSeriesEditPlan({
    transactions,
    anchor: installments[0],
    scope: SERIES_SCOPE.ALL,
    changes: {
      amount: 110,
      description: 'Nova descrição',
    },
  })

  const amountById = Object.fromEntries(plan.updates.map((item) => [item.id, item.data.amount]))

  expect(amountById).toEqual({
    p1: 36.67,
    p2: 36.67,
    p3: 36.66,
  })
  expect(plan.summary.seriesTotalAfter).toBe(110)
  expect(plan.updates.every((item) => item.data.originalAmount === 110)).toBe(true)
})

test('edita somente o saldo restante do parcelamento', () => {
  const plan = buildSeriesEditPlan({
    transactions,
    anchor: installments[1],
    scope: SERIES_SCOPE.FOLLOWING,
    changes: {
      amount: 50,
      description: 'Saldo renegociado',
    },
  })

  expect(plan.summary.selectedTotalAfter).toBe(50)
  expect(plan.summary.seriesTotalAfter).toBe(83.34)
  expect(plan.updates.find((item) => item.id === 'p1').data).toEqual({ originalAmount: 83.34 })
})

test('aplica valor por ocorrência em uma recorrência', () => {
  const plan = buildSeriesEditPlan({
    transactions,
    anchor: recurring[1],
    scope: SERIES_SCOPE.FOLLOWING,
    changes: {
      amount: 95,
      description: 'Academia',
    },
  })

  expect(plan.summary.affectedCount).toBe(2)
  expect(plan.summary.selectedTotalAfter).toBe(190)
  expect(plan.updates.filter((item) => item.data.amount === 95)).toHaveLength(2)
})

test('exclui uma parcela e renumera o restante', () => {
  const plan = buildSeriesDeletePlan({
    transactions,
    anchor: installments[1],
    scope: SERIES_SCOPE.SINGLE,
  })

  expect(plan.deletes).toEqual(['p2'])
  expect(plan.summary.removedTotal).toBe(33.33)
  expect(plan.summary.remainingTotal).toBe(66.67)
  expect(plan.updates).toEqual([
    {
      id: 'p1',
      data: {
        installmentNum: 1,
        installmentOf: 2,
        originalAmount: 66.67,
      },
    },
    {
      id: 'p3',
      data: {
        installmentNum: 2,
        installmentOf: 2,
        originalAmount: 66.67,
      },
    },
  ])
})

test('exclui esta recorrência e as próximas, preservando o passado', () => {
  const plan = buildSeriesDeletePlan({
    transactions,
    anchor: recurring[1],
    scope: SERIES_SCOPE.FOLLOWING,
  })

  expect(plan.deletes).toEqual(['r2', 'r3'])
  expect(plan.updates).toEqual([
    {
      id: 'r1',
      data: {
        recurringNum: 1,
        recurringOf: 1,
      },
    },
  ])
})

test('exclui toda a série sem atualizações residuais', () => {
  const plan = buildSeriesDeletePlan({
    transactions,
    anchor: installments[0],
    scope: SERIES_SCOPE.ALL,
  })

  expect(plan.deletes).toEqual(['p1', 'p2', 'p3'])
  expect(plan.updates).toEqual([])
  expect(plan.summary.remainingCount).toBe(0)
})
