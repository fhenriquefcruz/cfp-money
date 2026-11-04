import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import PwaUpdateNotice from './PwaUpdateNotice'

function announceUpdate(registration) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('meu-real:pwa-update', { detail: { registration } }),
    )
  })
}

function waitingRegistration() {
  return { waiting: { postMessage: vi.fn() } }
}

describe('Aviso de atualização PWA — compatibilidade de clientes', () => {
  test('não força troca de versão nem exibe aviso antes de detectar atualização', () => {
    render(<PwaUpdateNotice />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('exige confirmação para ativar a versão aguardando', () => {
    const registration = waitingRegistration()
    render(<PwaUpdateNotice />)
    announceUpdate(registration)

    expect(screen.getByRole('status')).toHaveTextContent('Nova versão disponível')
    expect(registration.waiting.postMessage).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }))
    expect(registration.waiting.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'SKIP_WAITING',
    })
  })

  test('permite adiar sem ativar e mostra nova atualização recebida depois', () => {
    const first = waitingRegistration()
    const next = waitingRegistration()
    render(<PwaUpdateNotice />)
    announceUpdate(first)

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar depois' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(first.waiting.postMessage).not.toHaveBeenCalled()

    announceUpdate(next)
    expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }))

    expect(first.waiting.postMessage).not.toHaveBeenCalled()
    expect(next.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  test('ativa somente a última versão anunciada, sem trocar a anterior', () => {
    const oldRegistration = waitingRegistration()
    const latestRegistration = waitingRegistration()
    render(<PwaUpdateNotice />)
    announceUpdate(oldRegistration)
    announceUpdate(latestRegistration)

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }))
    expect(oldRegistration.waiting.postMessage).not.toHaveBeenCalled()
    expect(latestRegistration.waiting.postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    })
  })
})
