import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import SpendingLeakDiagnostic from './SpendingLeakDiagnostic'

test('não cria problema quando o diagnóstico está limpo', () => {
  render(
    <MemoryRouter>
      <SpendingLeakDiagnostic
        report={{
          status: 'clear',
          findings: [],
          minimumExpenseCount: 5,
        }}
      />
    </MemoryRouter>,
  )

  expect(screen.getByText(/Nenhum padrão de gasto fora/i)).toBeInTheDocument()
  expect(screen.queryByTestId('spending-leak-findings')).not.toBeInTheDocument()
})

test('mostra somente os achados recebidos e oferece revisão das transações', () => {
  render(
    <MemoryRouter>
      <SpendingLeakDiagnostic
        report={{
          status: 'attention',
          minimumExpenseCount: 5,
          periods: { current: { end: '2026-09-20' } },
          findings: [
            {
              id: 'small-expenses',
              title: 'Pequenos gastos estão somando',
              detail: '8 lançamentos somam R$ 200,00.',
              to: '/transactions',
              actionLabel: 'Ver pequenos gastos',
            },
          ],
        }}
      />
    </MemoryRouter>,
  )

  expect(screen.getByText('1 sinal')).toBeInTheDocument()
  expect(screen.getByText('Pequenos gastos estão somando')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Ver pequenos gastos/i })).toHaveAttribute(
    'href',
    '/transactions',
  )
  expect(screen.getByRole('link', { name: /Analisar com o Money/i })).toHaveAttribute(
    'href',
    '/money?prompt=Quais+vazamentos+de+gastos+voc%C3%AA+encontrou+neste+per%C3%ADodo%3F&reference=2026-09-20',
  )
})
