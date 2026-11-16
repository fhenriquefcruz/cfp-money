import { summarizeExpenseCategories } from './expenseCategories'
import { summarizeTransactions } from './finance'

const transactions = [
  {
    id: 'food-one',
    type: 'expense',
    categoryId: 'food',
    categoryName: 'Alimentação',
    categoryColor: '#22aa33',
    amount: '0.10',
  },
  { id: 'food-two', type: 'expense', categoryId: 'food', amount: '0.20' },
  { id: 'food-three', type: 'expense', categoryId: 'food', amount: 1.01 },
  { id: 'home-one', type: 'expense', categoryId: 'home', amount: '2.03' },
  { id: 'legacy-invalid', type: 'expense', categoryId: 'food', amount: 'invalid' },
  { id: 'cancelled', type: 'expense', categoryId: 'home', amount: '999.00', paymentStatus: 'cancelled' },
  { id: 'transfer', type: 'expense', categoryId: 'home', amount: 100, flowType: 'transfer' },
  { id: 'reserve', type: 'expense', isSavings: true, categoryId: 'food', amount: '500.00' },
  { id: 'income', type: 'income', categoryId: 'home', amount: '600.00' },
]

test('soma strings legadas em centavos, sem concatenação nem deriva decimal', () => {
  const groups = summarizeExpenseCategories(transactions)
  expect(groups).toHaveLength(2)
  expect(groups).toEqual([
    {
      categoryId: 'home',
      categoryName: 'Sem categoria',
      categoryColor: '',
      categoryIcon: '',
      total: 2.03,
      count: 1,
    },
    {
      categoryId: 'food',
      categoryName: 'Alimentação',
      categoryColor: '#22aa33',
      categoryIcon: '',
      total: 1.31,
      count: 4,
    },
  ])
  expect(groups.reduce((cents, group) => cents + Math.round(group.total * 100), 0)).toBe(334)
  expect(summarizeTransactions(transactions).expenses).toBe(3.34)
})

test('preserva entrada e não modifica valores legados ou metadados', () => {
  const original = structuredClone(transactions)
  const result = summarizeExpenseCategories(transactions)
  expect(transactions).toEqual(original)
  expect(result[0].categoryName).toBe('Sem categoria')
})

test('agrupa sem categoria e protege nomes de chave reservados', () => {
  const results = summarizeExpenseCategories([
    { type: 'expense', categoryId: '__proto__', amount: '4.21' },
    { type: 'expense', amount: '2.00' },
    { type: 'expense', categoryId: '__proto__', amount: 0.79 },
  ])
  expect(results).toEqual([
    {
      categoryId: '__proto__',
      categoryName: 'Sem categoria',
      categoryColor: '',
      categoryIcon: '',
      total: 5,
      count: 2,
    },
    {
      categoryId: 'without-category',
      categoryName: 'Sem categoria',
      categoryColor: '',
      categoryIcon: '',
      total: 2,
      count: 1,
    },
  ])
})
