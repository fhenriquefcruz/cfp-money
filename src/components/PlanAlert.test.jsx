import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PlanAlert from './PlanAlert'

const usePlanMock = vi.fn()

vi.mock('../contexts/PlanContext', () => ({
  usePlan: () => usePlanMock(),
}))

describe('PlanAlert', () => {
  beforeEach(() => {
    usePlanMock.mockReset()
  })

  it('não exibe vencimento durante o carregamento inicial', () => {
    usePlanMock.mockReturnValue({
      isLoading: true,
      status: { isExpired: true, isPremium: false, daysLeft: 0, isAdminBypass: false },
    })

    render(<PlanAlert />)

    expect(screen.queryByText(/plano expirou/i)).not.toBeInTheDocument()
  })

  it('não exibe alerta para administrador', () => {
    usePlanMock.mockReturnValue({
      isLoading: false,
      status: { isExpired: false, isPremium: true, daysLeft: 0, isAdminBypass: true },
    })

    render(<PlanAlert />)

    expect(screen.queryByText(/vence em/i)).not.toBeInTheDocument()
  })

  it('exibe alerta para Premium próximo do vencimento', () => {
    usePlanMock.mockReturnValue({
      isLoading: false,
      status: { isExpired: false, isPremium: true, daysLeft: 3, isAdminBypass: false },
    })

    render(<PlanAlert />)

    expect(screen.getByText(/vence em 3 dias/i)).toBeInTheDocument()
  })
})
