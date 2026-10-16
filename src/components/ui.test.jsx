import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Modal } from './ui'

describe('Modal', () => {
  test('expõe semântica de diálogo e fechamento acessível', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Nova transação">
        <p>Conteúdo</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'Nova transação' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Nova transação' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('preserva o formulário quando o fechamento pelo fundo está desativado', () => {
    const onClose = vi.fn()
    render(
      <Modal
        isOpen
        onClose={onClose}
        title="Nova transação"
        closeOnBackdrop={false}
        closeOnEscape={false}
      >
        <input aria-label="Descrição" defaultValue="Rascunho" />
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Nova transação' })
    fireEvent.click(dialog.parentElement)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toHaveValue('Rascunho')
  })
})


describe('Native date picker', () => {
  it('abre o calendário pelo botão explícito sem depender de digitação', () => {
    const showPicker = vi.fn()
    const original = HTMLInputElement.prototype.showPicker
    HTMLInputElement.prototype.showPicker = showPicker
    try {
      render(<Input label="Data do lançamento" type="date" defaultValue="2026-10-16" />)
      fireEvent.click(screen.getByRole('button', { name: 'Abrir calendário: Data do lançamento' }))
      expect(showPicker).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText('Data do lançamento')).toHaveValue('2026-10-16')
    } finally {
      HTMLInputElement.prototype.showPicker = original
    }
  })
})
