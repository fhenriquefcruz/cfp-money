import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Budgets from './Budgets'

const appMocks = vi.hoisted(() => ({
  saveBudget: vi.fn(),
  removeBudget: vi.fn(),
}))

vi.mock('../contexts/AppContext', () => ({
  useTransactions: () => ({
    transactions: [
      {
        id: 'uber-fuel',
        type: 'expense',
        amount: 150,
        description: 'Uber centro',
        categoryId: 'fuel',
        categoryName: 'Combustível',
        date: '2026-09-10',
      },
      {
        id: 'leisure',
        type: 'expense',
        amount: 50,
        description: 'Cinema',
        categoryId: 'leisure',
        categoryName: 'Lazer',
        date: '2026-09-11',
      },
    ],
  }),
  useBudgets: () => ({
    budgets: [{ id: 'budget-fuel', categoryId: 'fuel', amount: 100, monthKey: '2026-09' }],
    saveBudget: appMocks.saveBudget,
    removeBudget: appMocks.removeBudget,
  }),
  useCategories: () => ({
    categories: [
      { id: 'fuel', name: 'Combustível', type: 'expense', icon: '⛽', color: '#f59e0b' },
      { id: 'ride', name: 'Transporte por aplicativo', type: 'expense', icon: '🚕', color: '#3b82f6' },
      { id: 'leisure', name: 'Lazer', type: 'expense', icon: '🎬', color: '#8b5cf6' },
    ],
  }),
}))

function renderBudgets() {
  render(
    <MemoryRouter initialEntries={['/budgets?month=2026-09']}>
      <Budgets />
    </MemoryRouter>,
  )
}

describe('Budgets auditability', () => {
  it('distingue gasto orçado, gasto sem limite e excedente', () => {
    renderBudgets()

    expect(screen.getByText('Gasto orçado')).toBeInTheDocument()
    expect(screen.getAllByText('Gasto sem limite').length).toBeGreaterThan(0)
    expect(screen.getByText('Excedente total')).toBeInTheDocument()
    expect(screen.getByText(/Total no mês/i)).toBeInTheDocument()
  })

  it('permite abrir os lançamentos que compõem cada categoria', () => {
    renderBudgets()

    const links = screen.getAllByRole('link', { name: /ver lançamentos/i })
    expect(links.some((link) => link.getAttribute('href') === '/transactions?category=fuel&month=2026-09')).toBe(
      true,
    )
    expect(
      links.some((link) => link.getAttribute('href') === '/transactions?category=leisure&month=2026-09'),
    ).toBe(true)
  })

  it('avisa quando uma classificação suspeita pode distorcer o orçamento', () => {
    renderBudgets()

    expect(
      screen.getByText(/revisão de categoria/i),
    ).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Revisar lançamentos/i })).toHaveAttribute(
      'href',
      '/transactions?month=2026-09&review=categories',
    )
  })
})
