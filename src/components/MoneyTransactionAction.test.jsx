import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MoneyTransactionAction from './MoneyTransactionAction'

const categories = [
  {
    id: 'food',
    name: 'Alimentação',
    type: 'expense',
    color: '#f97316',
    icon: '🍔',
  },
  {
    id: 'health',
    name: 'Saúde',
    type: 'expense',
    color: '#10b981',
    icon: '❤️',
  },
]

const response = {
  type: 'transaction_draft',
  title: 'Revise a despesa',
  text: 'Confira o rascunho antes de confirmar.',
  draft: {
    type: 'expense',
    isSavings: false,
    amount: 90,
    description: 'Despesa',
    categoryId: '',
    categoryName: '',
    categoryColor: '',
    categoryIcon: '',
    paymentMethod: 'pix',
    date: '2026-10-01',
    notes: '',
    isRecurring: false,
    source: 'money_assistant',
  },
  missingFields: ['categoryId'],
  warnings: [],
  categorySuggestion: {
    categoryId: 'food',
    categoryName: 'Alimentação',
    confidence: 'medium',
    reason: 'Baseada no seu histórico recente. Nada será aplicado sem sua escolha.',
  },
}

describe('MoneyTransactionAction category suggestion', () => {
  it('mantém categoria vazia até o usuário aceitar a sugestão', async () => {
    const user = userEvent.setup()

    render(
      <MoneyTransactionAction
        response={response}
        categories={categories}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onUndo={vi.fn()}
      />,
    )

    const category = screen.getByLabelText('Categoria')
    expect(category).toHaveValue('')
    expect(screen.getByText(/Seu histórico sugere Alimentação/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Usar sugestão/i }))

    expect(category).toHaveValue('food')
    expect(screen.queryByRole('button', { name: /Usar sugestão/i })).not.toBeInTheDocument()
  })
})
