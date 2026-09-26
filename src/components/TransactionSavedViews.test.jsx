import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import TransactionSavedViews from './TransactionSavedViews'

test('salva uma nova visão com nome informado pelo usuário', () => {
  const onSave = vi.fn(() => true)

  render(
    <TransactionSavedViews
      views={[]}
      canSave
      onApply={() => {}}
      onSave={onSave}
      onDelete={() => {}}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /Salvar visão/i }))
  fireEvent.change(screen.getByLabelText('Nome da visão'), {
    target: { value: 'Despesas pendentes' },
  })
  fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))

  expect(onSave).toHaveBeenCalledWith('Despesas pendentes')
})

test('aplica e exclui uma visão existente', () => {
  const onApply = vi.fn()
  const onDelete = vi.fn()
  const view = { id: 'v1', name: 'Cartão pendente', filters: {} }

  render(
    <TransactionSavedViews
      views={[view]}
      canSave
      onApply={onApply}
      onSave={() => true}
      onDelete={onDelete}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Cartão pendente' }))
  expect(onApply).toHaveBeenCalledWith(view)

  fireEvent.click(screen.getByRole('button', { name: 'Excluir visão Cartão pendente' }))
  expect(onDelete).toHaveBeenCalledWith('v1')
})
