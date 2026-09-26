import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import MoneyPrioritiesCard from './MoneyPrioritiesCard'

test('mostra prioridades ordenadas com ação direta', () => {
  render(
    <MemoryRouter>
      <MoneyPrioritiesCard
        report={{
          priorities: [
            {
              id: 'payments-overdue',
              level: 'critical',
              title: 'Regularize pagamentos atrasados',
              detail: '2 pagamentos somam R$ 350,00 em atraso.',
              actionLabel: 'Revisar pagamentos',
              to: '/transactions',
            },
            {
              id: 'leak-small-expenses',
              level: 'warning',
              title: 'Pequenos gastos estão somando',
              detail: '8 lançamentos somam R$ 200,00.',
              actionLabel: 'Ver pequenos gastos',
              to: '/transactions',
            },
          ],
        }}
      />
    </MemoryRouter>,
  )

  expect(screen.getAllByTestId('money-priority')).toHaveLength(2)
  expect(screen.getByText('Regularize pagamentos atrasados')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Revisar pagamentos/i })).toHaveAttribute(
    'href',
    '/transactions',
  )
})

test('não inventa urgência quando não há prioridade', () => {
  render(
    <MemoryRouter>
      <MoneyPrioritiesCard report={{ priorities: [] }} />
    </MemoryRouter>,
  )

  expect(screen.getByText(/Nenhuma prioridade relevante agora/i)).toBeInTheDocument()
  expect(screen.queryByTestId('money-priority')).not.toBeInTheDocument()
})
