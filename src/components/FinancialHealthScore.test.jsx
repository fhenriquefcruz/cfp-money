import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import FinancialHealthScore from './FinancialHealthScore'
import { buildFinancialHealth } from '../domain/financialHealth'

test('mantém o detalhamento oculto até o usuário pedir para entender o score', () => {
  const report = buildFinancialHealth({
    balance: -500,
    income: 4000,
    expenses: 3600,
    savingRate: 10,
    hasBudgets: false,
    budgetsOk: false,
    overdueCount: 1,
  })

  render(
    <MemoryRouter>
      <FinancialHealthScore report={report} />
    </MemoryRouter>,
  )

  expect(screen.getByText(/Maior oportunidade: Equilíbrio do mês/i)).toBeInTheDocument()
  expect(screen.queryByTestId('financial-health-breakdown')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Entender indicador/i }))

  expect(screen.getByTestId('financial-health-breakdown')).toBeInTheDocument()
  expect(screen.getByText('Equilíbrio do mês')).toBeInTheDocument()
  expect(screen.getByText('0/30 pts')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Revisar transações/i })).toHaveAttribute(
    'href',
    '/transactions',
  )
})
