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

  expect(screen.getByText(/Maior oportunidade: Equilíbrio do período/i)).toBeInTheDocument()
  expect(screen.queryByTestId('financial-health-breakdown')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /Entender indicador/i }))

  expect(screen.getByTestId('financial-health-breakdown')).toBeInTheDocument()
  expect(screen.getByText('Equilíbrio do período')).toBeInTheDocument()
  expect(screen.getByText('0/30 pts')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Revisar transações/i })).toHaveAttribute(
    'href',
    '/transactions',
  )
})

test('não exibe pontuação enquanto classificações suspeitas aguardam revisão', () => {
  const report = buildFinancialHealth({
    balance: 1000,
    income: 5000,
    expenses: 3000,
    savingRate: 20,
    hasBudgets: true,
    budgetsOk: true,
    overdueCount: 0,
    categoryReviewCount: 1,
  })

  render(
    <MemoryRouter>
      <FinancialHealthScore report={report} />
    </MemoryRouter>,
  )

  expect(screen.getByText('Indicador financeiro · Em revisão')).toBeInTheDocument()
  expect(screen.getByText(/Ação necessária: Revisar classificações/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Revisar categorias/i })).toHaveAttribute(
    'href',
    '/transactions?review=categories&scope=all',
  )
})
