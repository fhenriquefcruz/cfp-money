import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CategoryCompositionVisual from './CategoryCompositionVisual'

const items = [
  { categoryId: 'food', categoryName: 'Alimentação', icon: '🥗', total: 600, sharePercent: 60, color: '#B47750' },
  { categoryId: 'health', categoryName: 'Saúde', icon: '💊', total: 240, sharePercent: 24, color: '#3C897B' },
  { categoryId: 'travel', categoryName: 'Transporte', icon: '🚗', total: 100, sharePercent: 10, color: '#4C8192' },
  { categoryId: 'fun', categoryName: 'Lazer', icon: '🎬', total: 60, sharePercent: 6, color: '#806AA0' },
]

describe('Visualização categórica compartilhada', () => {
  it('mostra participação e valores, mantém navegação por categoria e agrupa o resto', () => {
    render(
      <MemoryRouter>
        <CategoryCompositionVisual items={items} maxVisible={2} getHref={(row) => `/transactions?category=${row.categoryId}`} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: /Distribuição de despesas por 4 categorias/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Alimentação/ })).toHaveAttribute('href', '/transactions?category=food')
    expect(screen.queryByText(/Transporte/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ver mais 2 categorias/ }))
    expect(screen.getByRole('link', { name: /Transporte/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mostrar apenas/ })).toBeInTheDocument()
  })

  it('permite filtrar categorias sem depender somente da cor', () => {
    const select = vi.fn()
    render(
      <MemoryRouter>
        <CategoryCompositionVisual items={items.slice(0, 1)} onSelect={select} selectedCategoryId="food" />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: /Alimentação/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(select).toHaveBeenCalledWith('food')
    expect(screen.getByText(/60% dos gastos/)).toBeInTheDocument()
  })
})
