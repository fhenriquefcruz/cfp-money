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
  useGoals: () => ({
    goals: [{ id: 'goal-reserve', name: 'Reserva de emergência', emoji: '🛟' }],
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

describe('TransactionForm savings destinations', () => {
  it('exige destino e persiste movimento, instituição e meta', async () => {
    render(<TransactionForm isOpen onClose={vi.fn()} transaction={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Poupança' }))
    fireEvent.change(screen.getByLabelText(/Valor/), { target: { value: '50000' } })

    fireEvent.click(screen.getByRole('button', { name: 'Registrar aporte' }))
    expect(screen.getByText('Informe onde este dinheiro está guardado')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Onde está guardado?'), {
      target: { value: 'Caixinha Reserva' },
    })
    fireEvent.change(screen.getByLabelText('Instituição (opcional)'), {
      target: { value: 'Nubank' },
    })
    fireEvent.change(screen.getByLabelText('Vincular a uma meta (opcional)'), {
      target: { value: 'goal-reserve' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Registrar aporte' }))

    await vi.waitFor(() => expect(appMocks.createTransaction).toHaveBeenCalledTimes(1))
    expect(appMocks.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        isSavings: true,
        savingsMovement: 'deposit',
        savingsDestination: 'Caixinha Reserva',
        savingsInstitution: 'Nubank',
        goalId: 'goal-reserve',
        amount: 500,
      }),
    )
  })
})

describe('TransactionForm savings presets', () => {
  it('abre diretamente como retirada com destino, instituição e meta pré-preenchidos', () => {
    render(
      <TransactionForm
        isOpen
        onClose={vi.fn()}
        transaction={null}
        initialType="savings"
        initialSavingsMovement="withdrawal"
        initialSavingsDestination="Caixinha Reserva"
        initialSavingsInstitution="Nubank"
        initialGoalId="goal-reserve"
      />,
    )

    expect(screen.getByRole('button', { name: 'Poupança' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Retirar' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Onde está guardado?')).toHaveValue('Caixinha Reserva')
    expect(screen.getByLabelText('Instituição (opcional)')).toHaveValue('Nubank')
    expect(screen.getByLabelText('Vincular a uma meta (opcional)')).toHaveValue('goal-reserve')
    expect(screen.getByRole('button', { name: 'Registrar retirada' })).toBeInTheDocument()
  })
})
