import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import PublicLegalLinks from './PublicLegalLinks'

vi.mock('../content/commercial', () => ({
  SUPPORT_POLICY: {
    contactEmail: 'suporte@example.com',
    responseTarget: 'até 2 dias úteis',
    responseDeadline: 'até 5 dias corridos',
  },
}))

vi.mock('./LegalDocument', () => ({
  default: () => <div>Documento legal</div>,
}))

test('modal público de suporte não exibe bloco de identidade pessoal do fornecedor', () => {
  render(<PublicLegalLinks />)

  fireEvent.click(screen.getByRole('button', { name: /suporte/i }))

  expect(screen.getByRole('dialog', { name: 'Suporte' })).toBeInTheDocument()
  expect(screen.getByText('suporte@example.com')).toBeInTheDocument()
  expect(screen.getByText(/meta de resposta/i)).toBeInTheDocument()

  expect(screen.queryByText(/cadastro fiscal/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/endereço físico/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/fornecedor e suporte/i)).not.toBeInTheDocument()
})
