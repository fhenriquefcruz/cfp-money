import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import TransactionFilterViews from './TransactionFilterViews'

test('salva e reaplica uma visão de filtros somente após ação do usuário', () => {
  window.localStorage.clear()
  const onApply = vi.fn()

  render(
    <TransactionFilterViews
      userId="user-1"
      filters={{
        typeFilter: 'expense',
        catFilter: 'food',
        payFilter: 'all',
        paymentStatusFilter: 'pending',
        dateRange: { from: '2026-09-01', to: '2026-09-30' },
        search: '',
        sortAsc: false,
      }}
      onApply={onApply}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /Salvar visão/i }))
  fireEvent.change(screen.getByLabelText('Nome da visão de filtros'), {
    target: { value: 'Pendentes alimentação' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(screen.getByText('Pendentes alimentação')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /^Pendentes alimentação$/i }))

  expect(onApply).toHaveBeenCalledTimes(1)
  expect(onApply.mock.calls[0][0]).toMatchObject({
    typeFilter: 'expense',
    catFilter: 'food',
    paymentStatusFilter: 'pending',
  })
})

test('separa as visões por usuário no armazenamento local', () => {
  window.localStorage.clear()

  const { rerender } = render(
    <TransactionFilterViews
      userId="user-a"
      filters={{ typeFilter: 'expense' }}
      onApply={() => {}}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /Salvar visão/i }))
  fireEvent.change(screen.getByLabelText('Nome da visão de filtros'), {
    target: { value: 'Só despesas' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

  rerender(
    <TransactionFilterViews userId="user-b" filters={{ typeFilter: 'all' }} onApply={() => {}} />,
  )

  expect(screen.queryByText('Só despesas')).not.toBeInTheDocument()
  expect(screen.getByText(/Nenhuma visão salva/i)).toBeInTheDocument()
})
