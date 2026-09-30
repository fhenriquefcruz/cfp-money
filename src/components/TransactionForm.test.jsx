import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionForm from './TransactionForm'

const appMocks = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  editTransaction: vi.fn(),
  addTransactionBatch: vi.fn(),
  showNotification: vi.fn(),
}))

vi.mock('../contexts/AppContext', () => ({
  useTransactions: () => ({
    createTransaction: appMocks.createTransaction,
    editTransaction: appMocks.editTransaction,
    addTransactionBatch: appMocks.addTransactionBatch,
  }),
  useNotifications: () => ({
    showNotification: appMocks.showNotification,
  }),
  useCreditCards: () => ({
    creditCards: [],
  }),
  useCategories: () => ({
    categories: [
      {
        id: 'food',
        name: 'Alimentação',
        type: 'expense',
        icon: '🍽️',
        color: '#c49d6b',
      },
      {
        id: 'fuel',
        name: 'Combustível',
        type: 'expense',
        icon: '⛽',
        color: '#f59e0b',
      },
      {
        id: 'ride',
        name: 'Transporte por aplicativo',
        type: 'expense',
        icon: '🚕',
        color: '#3b82f6',
      },
    ],
  }),
}))

beforeEach(() => {
  Object.values(appMocks).forEach((mock) => mock.mockClear())
})

describe('TransactionForm progressive disclosure', () => {
  it('mantém opções avançadas ocultas em um novo lançamento simples', () => {
    render(<TransactionForm isOpen onClose={vi.fn()} transaction={null} />)

    const advancedButton = screen.getByRole('button', { name: /mais opções/i })

    expect(advancedButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Vencimento (opcional)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Observações')).not.toBeInTheDocument()

    fireEvent.click(advancedButton)

    expect(advancedButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Vencimento (opcional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Observações')).toBeInTheDocument()
    expect(screen.getByText('Despesa fixa — repetir mensalmente')).toBeInTheDocument()
  })

  it('abre opções avançadas automaticamente ao editar uma transação que já usa esses campos', () => {
    render(
      <TransactionForm
        isOpen
        onClose={vi.fn()}
        transaction={{
          id: 'tx-existing',
          type: 'expense',
          amount: 180,
          description: 'Conta recorrente',
          categoryId: 'food',
          categoryName: 'Alimentação',
          date: '2026-09-25',
          dueDate: '2026-09-30',
          paymentMethod: 'pix',
          notes: 'Conferir comprovante',
          isRecurring: false,
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /mais opções/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByLabelText('Vencimento (opcional)')).toHaveValue('2026-09-30')
    expect(screen.getByLabelText('Observações')).toHaveValue('Conferir comprovante')
  })
})

describe('TransactionForm category review', () => {
  it('permite aplicar uma sugestão somente com confirmação do usuário', () => {
    render(
      <TransactionForm
        isOpen
        onClose={vi.fn()}
        transaction={{
          id: 'tx-uber',
          type: 'expense',
          amount: 45,
          description: 'Uber centro',
          categoryId: 'fuel',
          categoryName: 'Combustível',
          date: '2026-09-25',
          paymentMethod: 'pix',
        }}
      />,
    )

    const suggestion = screen.getByRole('button', {
      name: /Aplicar sugestão: Transporte por aplicativo/i,
    })
    const rideCategory = screen
      .getAllByRole('button', { name: /Transporte por aplicativo/i })
      .find((button) => button.hasAttribute('aria-pressed'))

    expect(rideCategory).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(suggestion)
    expect(rideCategory).toHaveAttribute('aria-pressed', 'true')
    expect(appMocks.editTransaction).not.toHaveBeenCalled()
  })
})
