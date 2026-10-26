import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import CardReconciliationModal from './CardReconciliationModal'

const mockState = vi.hoisted(() => ({
  transactions: [],
  creditCards: [],
  reconcileLegacyCard: vi.fn(),
  undoLegacyCard: vi.fn(),
}))

vi.mock('../contexts/AppContext', () => ({
  useTransactions: () => ({
    transactions: mockState.transactions,
    reconcileLegacyCard: mockState.reconcileLegacyCard,
    undoLegacyCard: mockState.undoLegacyCard,
  }),
  useCreditCards: () => ({ creditCards: mockState.creditCards }),
}))

beforeEach(() => {
  mockState.transactions = [
    {
      id: 'legacy-tx',
      type: 'expense',
      paymentMethod: 'credit_card',
      amount: 68.7,
      description: 'Compra antiga',
      date: '2026-08-12',
      categoryName: 'Outros',
    },
  ]
  mockState.creditCards = [
    { id: 'card-1', name: 'Cartão principal', last4: '1234', closingDay: 5, dueDay: 12 },
    { id: 'card-2', name: 'Cartão reserva', last4: '4321', closingDay: 10, dueDay: 20 },
  ]
  mockState.reconcileLegacyCard.mockReset()
  mockState.undoLegacyCard.mockReset()
  mockState.reconcileLegacyCard.mockResolvedValue({})
  mockState.undoLegacyCard.mockResolvedValue({})
})

test('exige escolha do cartão e confirmação dupla sem duplicar a compra', async () => {
  render(<CardReconciliationModal isOpen onClose={vi.fn()} />)
  expect(screen.getByText('1 compra para revisar')).toBeInTheDocument()
  const submit = screen.getByRole('button', { name: 'Revisar e vincular' })
  expect(submit).toBeDisabled()

  fireEvent.change(screen.getByLabelText('Cartão ao qual esta compra pertence'), {
    target: { value: 'card-1' },
  })
  expect(screen.getByText('Agosto de 2026')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Revisar e vincular' }))
  expect(mockState.reconcileLegacyCard).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar vínculo desta compra' }))
  await waitFor(() =>
    expect(mockState.reconcileLegacyCard).toHaveBeenCalledWith(
      'legacy-tx',
      mockState.creditCards[0],
      '2026-08',
    ),
  )
})

test('não escolhe automaticamente cartão por semelhança de nome', () => {
  mockState.transactions[0].cardName = 'Cartão principal'
  render(<CardReconciliationModal isOpen onClose={vi.fn()} />)
  expect(screen.getByLabelText('Cartão ao qual esta compra pertence')).toHaveValue('')
  expect(mockState.reconcileLegacyCard).not.toHaveBeenCalled()
})

test('desfazer vínculo registrado também exige confirmação dupla', async () => {
  mockState.transactions = [
    {
      ...mockState.transactions[0],
      cardId: 'card-1',
      cardName: 'Cartão principal',
      cardReconciliation: { version: 1, cardId: 'card-1' },
    },
  ]
  render(<CardReconciliationModal isOpen onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer vínculo' }))
  expect(mockState.undoLegacyCard).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar desfazer' }))
  await waitFor(() => expect(mockState.undoLegacyCard).toHaveBeenCalledWith('legacy-tx'))
})
