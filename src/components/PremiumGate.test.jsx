import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import PremiumGate from './PremiumGate'

const mockUsePlan = vi.hoisted(() => vi.fn())

vi.mock('../contexts/PlanContext', () => ({
  usePlan: () => mockUsePlan(),
}))

describe('PremiumGate', () => {
  test('renderiza o conteúdo para usuário Premium', () => {
    mockUsePlan.mockReturnValue({
      isLoading: false,
      status: { isPremium: true },
    })

    render(
      <MemoryRouter>
        <PremiumGate feature="Money">
          <div>Conteúdo protegido</div>
        </PremiumGate>
      </MemoryRouter>,
    )

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })

  test('exibe apresentação compacta sem remover dados do usuário gratuito', () => {
    mockUsePlan.mockReturnValue({
      isLoading: false,
      status: { isPremium: false, isExpired: false },
    })

    render(
      <MemoryRouter>
        <PremiumGate variant="card" feature="Análise do Money">
          <div>Conteúdo protegido</div>
        </PremiumGate>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
    expect(screen.getByText('Análise do Money')).toBeInTheDocument()
    expect(
      screen.getByText('Seus dados e preferências permanecem preservados.'),
    ).toBeInTheDocument()
  })
})
