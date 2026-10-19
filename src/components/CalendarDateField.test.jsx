import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import CalendarDateField from './CalendarDateField'

describe('CalendarDateField', () => {
  test('abre um calendário clicável e emite a data no formato esperado pelos formulários', () => {
    const onChange = vi.fn()
    render(<CalendarDateField label="Data da compra" value="2026-10-10" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário de Data da compra' }))
    expect(
      screen.getByRole('dialog', { name: 'Selecionar data: Data da compra' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '20 de outubro de 2026' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2026-10-20', name: '' } })
    expect(
      screen.queryByRole('dialog', { name: 'Selecionar data: Data da compra' }),
    ).not.toBeInTheDocument()
  })

  test('associa expansão do calendário ao botão e não ao input de data', () => {
    render(<CalendarDateField label="Vencimento" value="2026-10-16" onChange={vi.fn()} />)
    const input = screen.getByLabelText('Vencimento')
    const trigger = screen.getByRole('button', { name: 'Abrir calendário de Vencimento' })
    expect(input).not.toHaveAttribute('aria-expanded')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('respeita o mínimo e permite limpar uma data opcional', () => {
    const onChange = vi.fn()
    render(
      <CalendarDateField label="Até" value="2026-10-16" min="2026-10-14" onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário de Até' }))
    expect(screen.getByRole('button', { name: '13 de outubro de 2026' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar data' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: '', name: '' } })
  })

  test('não permite abertura se estiver desabilitado', () => {
    render(<CalendarDateField label="Vencimento" value="2026-10-16" onChange={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: 'Abrir calendário de Vencimento' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
