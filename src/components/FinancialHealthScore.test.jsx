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
    savingRate: 10,
    hasBudgets: false,
    budgetsOk: false,
    goalsActive: false,
  })

  render(
    <MemoryRouter>
      <FinancialHealthScore report={report} referenceDate={new Date(2026, 7, 15)} />
    </MemoryRouter>,
  )

  expect(screen.getByText(/Maior oportunidade: Equilíbrio do mês/i)).toBeInTheDocument()
  expect(screen.queryByTestId('financial-health-breakdown')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Conversar com o Money/i })).toHaveAttribute(
    'href',
    '/money?prompt=Como+est%C3%A3o+minhas+finan%C3%A7as%3F&reference=2026-08-15',
  )

  fireEvent.click(screen.getByRole('button', { name: /Entender meu score/i }))

  expect(screen.getByTestId('financial-health-breakdown')).toBeInTheDocument()
  expect(screen.getByText('Equilíbrio do mês')).toBeInTheDocument()
  expect(screen.getByText('0/30 pts')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Revisar transações/i })).toHaveAttribute(
    'href',
    '/transactions',
  )
})
