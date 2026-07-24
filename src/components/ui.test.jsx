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
