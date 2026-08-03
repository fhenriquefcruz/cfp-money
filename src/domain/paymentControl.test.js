import { describe, expect, test } from 'vitest'
import {
  createPaymentPersistenceChange,
  createPaymentStatusChange,
  getTransactionPaymentStatus,
  isTransactionPaid,
  summarizePaymentControl,
} from './paymentControl'

const expense = (overrides = {}) => ({
  id: 'expense-1',
  type: 'expense',
  amount: 100,
  date: '2026-08-03',
  ...overrides,
})

describe('controle de pagamentos', () => {
  test('trata despesa antiga sem status como pendente', () => {
    expect(getTransactionPaymentStatus(expense())).toBe('pending')
    expect(isTransactionPaid(expense())).toBe(false)
  })

  test('marca uma despesa como paga com data e hora', () => {
    const change = createPaymentStatusChange(true, new Date('2026-08-03T12:30:00.000Z'))

    expect(change).toEqual({
      paymentStatus: 'paid',
      paidAt: '2026-08-03T12:30:00.000Z',
    })
    expect(isTransactionPaid({ ...expense(), ...change })).toBe(true)
  })

  test('gera a alteração persistida sem duplicar a regra de status', () => {
    const timestamp = { seconds: 123 }

    expect(createPaymentPersistenceChange(true, timestamp)).toEqual({
      paymentStatus: 'paid',
      paidAt: timestamp,
    })
    expect(createPaymentPersistenceChange(false, timestamp)).toEqual({
      paymentStatus: 'pending',
      paidAt: null,
    })
  })

  test('retorna uma despesa paga para pendente e remove a data', () => {
    expect(createPaymentStatusChange(false)).toEqual({
      paymentStatus: 'pending',
      paidAt: null,
    })
    expect(getTransactionPaymentStatus({ isPaid: true, paymentStatus: 'pending' })).toBe('pending')
  })

  test('calcula totais pagos, pendentes e o progresso por valor', () => {
    const summary = summarizePaymentControl([
      expense({ id: 'paid', amount: 250, paymentStatus: 'paid' }),
      expense({ id: 'pending', amount: 150 }),
      { id: 'income', type: 'income', amount: 900, date: '2026-08-03' },
    ])

    expect(summary).toEqual({
      totalAmount: 400,
      paidAmount: 250,
      pendingAmount: 150,
      totalCount: 2,
      paidCount: 1,
      pendingCount: 1,
      progress: 62.5,
    })
  })

  test('considera cada parcela como uma unidade independente', () => {
    const summary = summarizePaymentControl([
      expense({
        id: 'installment-1',
        amount: 200,
        paymentMethod: 'credit_card',
        isInstallment: true,
        installmentNum: 1,
        paymentStatus: 'paid',
      }),
      expense({
        id: 'installment-2',
        amount: 200,
        paymentMethod: 'credit_card',
        isInstallment: true,
        installmentNum: 2,
      }),
    ])

    expect(summary.paidCount).toBe(1)
    expect(summary.pendingCount).toBe(1)
    expect(summary.paidAmount).toBe(200)
  })

  test('não propaga pagamento para ocorrências recorrentes futuras', () => {
    const summary = summarizePaymentControl(
      [
        expense({
          id: 'rent-aug',
          amount: 800,
          isRecurring: true,
          recurringNum: 1,
          paymentStatus: 'paid',
        }),
        expense({
          id: 'rent-sep',
          amount: 800,
          date: '2026-09-03',
          isRecurring: true,
          recurringNum: 2,
        }),
      ],
      { start: '2026-08-01', end: '2026-08-31' },
    )

    expect(summary.totalCount).toBe(1)
    expect(summary.paidCount).toBe(1)
    expect(getTransactionPaymentStatus(expense({ date: '2026-09-03', isRecurring: true }))).toBe(
      'pending',
    )
  })
})
