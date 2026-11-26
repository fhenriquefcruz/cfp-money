import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Categories from './Categories'

const categoryMocks = vi.hoisted(() => ({ removeCategory: vi.fn() }))

vi.mock('../contexts/AppContext', () => ({
  useCategories: () => ({
    categories: [
      { id: 'travel', name: 'Viagem', type: 'expense', icon: 'plane', color: '#56B4E9' },
    ],
    createCategory: vi.fn(),
    editCategory: vi.fn(),
    removeCategory: categoryMocks.removeCategory,
  }),
}))

describe('exclusão de categoria', () => {
  beforeEach(() => categoryMocks.removeCategory.mockReset())

  it('exige confirmação e permite cancelar sem excluir', async () => {
    categoryMocks.removeCategory.mockResolvedValue(undefined)
    render(<Categories />)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Viagem' }))
    expect(screen.getByRole('dialog', { name: 'Excluir categoria' })).toBeInTheDocument()
    expect(categoryMocks.removeCategory).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(categoryMocks.removeCategory).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Viagem' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir categoria' }))
    await waitFor(() => expect(categoryMocks.removeCategory).toHaveBeenCalledWith('travel'))
  })
})
