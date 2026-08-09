import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PaymentControlCard from './PaymentControlCard'

const summary = {
  totalAmount: 1500,
  committedAmount: 1500,
  paidAmount: 100,
  pendingAmount: 500,
  overdueAmount: 400,
  unknownAmount: 500,
  toPayAmount: 900,
  dueNext7DaysAmount: 200,

  totalCount: 5,
  paidCount: 1,
  pendingCount: 2,
  overdueCount: 1,
  unknownCount: 1,
  toPayCount: 3,
  dueNext7DaysCount: 1,

  progress: (100 / 1500) * 100,

  comparison: {
    previousCommittedAmount: 1200,
    committedDeltaAmount: 300,
    committedDeltaPercent: 25,
  },

  weekly: [],

  card: {
    totalAmount: 300,
    paidAmount: 0,
    pendingAmount: 300,
    overdueAmount: 0,
    dueNext7DaysAmount: 300,
    itemCount: 2,
    obligationCount: 1,
    paidCount: 0,
    pendingCount: 1,
    overdueCount: 0,
    dueNext7DaysCount: 1,
  },
}

function renderCard(overrides = {}) {
  render(
    <MemoryRouter>
      <PaymentControlCard
        summary={{
          ...summary,
          ...overrides,
        }}
      />
    </MemoryRouter>,
  )
}

describe('PaymentControlCard', () => {
  it('exibe as métricas centrais do controle de pagamentos', () => {
    renderCard()

    expect(screen.getByText('Comprometido')).toBeInTheDocument()
    expect(screen.getByText('Pago')).toBeInTheDocument()
    expect(screen.getByText('A pagar')).toBeInTheDocument()
    expect(screen.getByText('Atrasado')).toBeInTheDocument()

    expect(screen.getByText(/próximos 7 dias/i)).toBeInTheDocument()
    expect(screen.getByText(/a revisar/i)).toBeInTheDocument()
  })

  it('mostra a comparação com o mês anterior', () => {
    renderCard()

    expect(screen.getByText(/25%/i)).toBeInTheDocument()
    expect(screen.getByText(/mês anterior/i)).toBeInTheDocument()
  })

  it('não trata itens desconhecidos como pendência confirmada', () => {
    renderCard()

    expect(screen.getByText(/1.*revisar/i)).toBeInTheDocument()
    expect(screen.getByText(/3.*pagar/i)).toBeInTheDocument()
  })

  it('não exibe alerta de revisão quando não existem itens desconhecidos', () => {
    renderCard({
      unknownAmount: 0,
      unknownCount: 0,
    })

    expect(screen.queryByText(/item.*revisar/i)).not.toBeInTheDocument()
  })
})
