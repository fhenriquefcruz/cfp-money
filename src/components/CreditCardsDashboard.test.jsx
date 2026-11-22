import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import CreditCardsDashboard from './CreditCardsDashboard'

const fixture = vi.hoisted(() => {
  const today = new Date()
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  return {
    transactions: [
      {
        id: 'purchase-one',
        date: `${month}-12`,
        purchaseDate: `${month}-01`,
        invoiceMonth: month,
        type: 'expense',
        paymentMethod: 'credit_card',
        cardId: 'card-a',
        amount: 100,
      },
    ],
    creditCards: [{ id: 'card-a', name: 'Cartão A', closingDay: 5, dueDay: 12 }],
    invoiceEvents: [
      {
        id: 'payment-other',
        type: 'payment',
        cardId: 'card-b',
        invoiceMonth: month,
        invoiceKey: `card-b:${month}`,
        amount: 50,
      },
      {
        id: 'reversal-cross',
        type: 'reversal',
        cardId: 'card-a',
        invoiceMonth: month,
        invoiceKey: `card-a:${month}`,
        reversesEventId: 'payment-other',
        amount: 5,
      },
    ],
  }
})

vi.mock('../contexts/AppContext', () => ({
  useTransactions: () => ({ transactions: fixture.transactions, loading: false }),
  useCreditCards: () => ({ creditCards: fixture.creditCards, loading: false }),
  useInvoiceEvents: () => ({
    invoiceEvents: fixture.invoiceEvents,
    loading: false,
    createInvoiceEvent: vi.fn(),
  }),
}))

vi.mock('./PremiumGate', () => ({
  default: ({ children }) => children,
}))

vi.mock('./InvoiceLifecycleModal', () => ({
  default: () => null,
}))

test('exibe alerta de estorno de outra fatura apenas após auditoria solicitada', () => {
  render(
    <MemoryRouter>
      <CreditCardsDashboard />
    </MemoryRouter>,
  )

  expect(screen.queryByText('Estorno vinculado a outra fatura')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Auditar valores' }))
  const panel = screen.getByRole('region', { name: 'Resultado da auditoria financeira' })

  expect(within(panel).getByText('Estorno vinculado a outra fatura')).toBeInTheDocument()
  expect(within(panel).getByText('Crítico')).toBeInTheDocument()
  expect(within(panel).getByText(/Cartão A · Fatura/)).toBeInTheDocument()
  expect(within(panel).getByRole('button', { name: 'Selecionar cartão' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Ocultar auditoria' }))
  expect(screen.queryByRole('region', { name: 'Resultado da auditoria financeira' })).toBeNull()
})
