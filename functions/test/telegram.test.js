const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildPeriod,
  buildTransactionDocuments,
  invoiceDueDate,
  parseBrazilianAmount,
  parseMoneyMessage,
  splitInstallments,
  summarizeTransactions,
} = require('../lib/telegramDomain')

test('interpreta valor brasileiro', () => {
  assert.equal(parseBrazilianAmount('Paguei R$ 1.234,56'), 1234.56)
  assert.equal(parseBrazilianAmount('Recebi 250'), 250)
})

test('prepara despesa por Pix', () => {
  const result = parseMoneyMessage({
    message: 'Paguei R$ 180 no dentista por Pix hoje',
    now: new Date('2026-07-27T15:00:00.000Z'),
  })

  assert.equal(result.ok, true)
  assert.deepEqual(
    {
      type: result.draft.type,
      amount: result.draft.amount,
      paymentMethod: result.draft.paymentMethod,
      categoryName: result.draft.categoryName,
    },
    {
      type: 'expense',
      amount: 180,
      paymentMethod: 'pix',
      categoryName: 'Saúde',
    },
  )
})

test('exige cartão reconhecido quando a mensagem menciona crédito', () => {
  const result = parseMoneyMessage({
    message: 'Comprei 600 no cartão em 3x',
    creditCards: [],
  })

  assert.equal(result.ok, false)
  assert.equal(result.needsCard, true)
})

test('prepara compra parcelada no cartão cadastrado', () => {
  const result = parseMoneyMessage({
    message: 'Comprei R$ 600 no Nubank em 3x no mercado',
    creditCards: [
      {
        id: 'card-1',
        name: 'Nubank',
        last4: '1234',
        closingDay: 20,
        dueDay: 1,
      },
    ],
    now: new Date('2026-07-27T15:00:00.000Z'),
  })

  assert.equal(result.ok, true)
  assert.equal(result.draft.kind, 'credit_purchase')
  assert.equal(result.draft.installments, 3)
  assert.equal(result.draft.card.id, 'card-1')
})

test('divide parcelas sem perder centavos', () => {
  assert.deepEqual(splitInstallments(100, 3), [33.34, 33.33, 33.33])
})

test('calcula vencimento conforme fechamento', () => {
  assert.equal(
    invoiceDueDate(
      '2026-07-19',
      {
        closingDay: 20,
        dueDay: 1,
      },
      0,
    ),
    '2026-08-01',
  )
  assert.equal(
    invoiceDueDate(
      '2026-07-21',
      {
        closingDay: 20,
        dueDay: 1,
      },
      0,
    ),
    '2026-09-01',
  )
})

test('gera documentos estruturados do parcelamento', () => {
  const documents = buildTransactionDocuments(
    {
      kind: 'credit_purchase',
      amount: 100,
      description: 'Mercado',
      categoryName: 'Alimentação',
      purchaseDate: '2026-07-21',
      installments: 3,
      card: {
        id: 'card-1',
        name: 'Nubank',
        last4: '1234',
        closingDay: 20,
        dueDay: 1,
      },
    },
    'group-1',
  )

  assert.equal(documents.length, 3)
  assert.equal(
    documents.reduce((total, item) => total + item.amount, 0),
    100,
  )
  assert.equal(documents[0].invoiceMonth, '2026-09')
})

test('respeita ciclo baseado no salário', () => {
  const period = buildPeriod(
    {
      cycleType: 'salary_cycle',
      cycleStartDay: 25,
    },
    new Date('2026-07-20T15:00:00.000Z'),
  )

  assert.equal(period.start, '2026-06-25')
  assert.equal(period.end, '2026-07-24')
})

test('resume dados sem transformar poupança em receita', () => {
  assert.deepEqual(
    summarizeTransactions([
      { type: 'income', amount: 1000 },
      { type: 'expense', amount: 200 },
      { type: 'income', amount: 300, isSavings: true },
    ]),
    {
      income: 1000,
      expenses: 200,
      savings: 300,
      balance: 800,
      count: 3,
    },
  )
})
