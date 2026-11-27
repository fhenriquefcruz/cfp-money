import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MonthPicker from './MonthPicker'

describe('MonthPicker', () => {
  it('mostra o mês em português e devolve a competência selecionada', () => {
    const onChange = vi.fn()
    render(<MonthPicker value="2026-09" onChange={onChange} label="Mês final do relatório" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Mês final do relatório: Setembro de 2026' }),
    )
    expect(screen.getByRole('dialog', { name: 'Mês final do relatório' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Outubro' }))
    expect(onChange).toHaveBeenCalledWith('2026-10')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
