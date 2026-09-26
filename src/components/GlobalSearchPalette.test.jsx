import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import GlobalSearchPalette from './GlobalSearchPalette'

afterEach(cleanup)

test('busca uma transação e navega para a lista com o termo preenchido', () => {
  const onClose = vi.fn()
  const transactions = [
    {
      id: 'tx-1',
      description: 'Consulta odontológica',
      categoryName: 'Saúde',
      type: 'expense',
      amount: 180,
    },
  ]

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="*"
          element={<GlobalSearchPalette open onClose={onClose} transactions={transactions} />}
        />
      </Routes>
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: 'odontologica' },
  })

  fireEvent.click(screen.getByRole('button', { name: /Consulta odontológica/i }))

  expect(onClose).toHaveBeenCalled()
})

test('mostra estado vazio sem criar resultado artificial', () => {
  render(
    <MemoryRouter>
      <GlobalSearchPalette open onClose={() => {}} />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: 'algo inexistente 123' },
  })

  expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument()
})

test('fecha pelo Escape', () => {
  const onClose = vi.fn()

  render(
    <MemoryRouter>
      <GlobalSearchPalette open onClose={onClose} />
    </MemoryRouter>,
  )

  fireEvent.keyDown(screen.getByLabelText('Termo da busca global'), { key: 'Escape' })

  expect(onClose).toHaveBeenCalled()
})

test('oferece favorito apenas para módulos reais', () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlobalSearchPalette
        open
        onClose={() => {}}
        pages={[
          ['Dashboard', '/dashboard'],
          ['Relatórios', '/reports'],
        ]}
        goals={[{ id: 'g1', name: 'Viagem' }]}
      />
    </MemoryRouter>,
  )

  expect(
    screen.getByRole('button', { name: 'Adicionar Relatórios aos favoritos' }),
  ).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: 'viagem' },
  })

  expect(screen.getByRole('button', { name: 'Viagem' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Viagem.*favoritos/i })).not.toBeInTheDocument()
})
