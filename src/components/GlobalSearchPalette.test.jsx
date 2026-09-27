import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import GlobalSearchPalette from './GlobalSearchPalette'

afterEach(cleanup)

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

test('busca uma transação e navega para a lista com o termo e todos os períodos', () => {
  const onClose = vi.fn()
  const transactions = [
    {
      id: 'tx-1',
      description: 'Consulta odontológica',
      categoryName: 'Saúde',
      type: 'expense',
      amount: 180,
      date: '2026-02-10',
    },
  ]

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <GlobalSearchPalette onClose={onClose} transactions={transactions} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: 'odontologica' },
  })

  fireEvent.click(screen.getByRole('option', { name: /Consulta odontológica/i }))

  expect(onClose).toHaveBeenCalled()
  expect(decodeURIComponent(screen.getByTestId('location').textContent)).toContain(
    '/transactions?search=Consulta odontológica&scope=all',
  )
})

test('mostra tipo e contexto do resultado', () => {
  render(
    <MemoryRouter>
      <GlobalSearchPalette
        onClose={() => {}}
        creditCards={[{ id: 'nubank', name: 'Nubank', last4: '4582' }]}
      />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: '4582' },
  })

  expect(screen.getByRole('option', { name: /Nubank Cartão Final 4582/i })).toBeInTheDocument()
})

test('mostra estado vazio sem criar resultado artificial', () => {
  render(
    <MemoryRouter>
      <GlobalSearchPalette onClose={() => {}} />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: 'algo inexistente 123' },
  })

  expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument()
})

test('fecha a paleta pelo Escape', () => {
  const onClose = vi.fn()

  render(
    <MemoryRouter>
      <GlobalSearchPalette onClose={onClose} />
    </MemoryRouter>,
  )

  fireEvent.keyDown(screen.getByLabelText('Termo da busca global'), { key: 'Escape' })

  expect(onClose).toHaveBeenCalled()
})

test('navegação por setas circula entre os resultados', () => {
  render(
    <MemoryRouter>
      <GlobalSearchPalette
        onClose={() => {}}
        pages={[
          ['Dashboard', '/dashboard'],
          ['Relatórios', '/reports'],
        ]}
      />
    </MemoryRouter>,
  )

  const input = screen.getByLabelText('Termo da busca global')
  const options = screen.getAllByRole('option')

  expect(options[0]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(options[1]).toHaveAttribute('aria-selected', 'true')
})

test('oferece favorito apenas para módulos reais', () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlobalSearchPalette
        onClose={() => {}}
        userId="user-1"
        pages={[
          ['Dashboard', '/dashboard'],
          ['Relatórios', '/reports'],
        ]}
        goals={[{ id: 'g1', name: 'Viagem' }]}
      />
    </MemoryRouter>,
  )

  expect(screen.getByRole('button', { name: 'Favoritar Relatórios' })).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Termo da busca global'), {
    target: { value: 'viagem' },
  })

  expect(screen.getByRole('option', { name: /Viagem/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Favoritar Viagem/i })).not.toBeInTheDocument()
})

test('favoritar um módulo atualiza o estado da paleta', () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlobalSearchPalette
        onClose={() => {}}
        userId="user-2"
        pages={[
          ['Dashboard', '/dashboard'],
          ['Metas', '/goals'],
        ]}
      />
    </MemoryRouter>,
  )

  const favoriteButton = screen.getByRole('button', {
    name: 'Favoritar Metas',
  })

  fireEvent.click(favoriteButton)

  expect(screen.getByRole('button', { name: 'Favoritar Metas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
