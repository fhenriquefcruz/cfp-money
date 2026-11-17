import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import PwaUpdateNotice from './PwaUpdateNotice'

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

afterEach(() => {
  cleanup()
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
  } else {
    delete navigator.serviceWorker
  }
})

test('PWA: aviso detecta worker aguardando antes da montagem e exige ação explícita', async () => {
  const postMessage = vi.fn()
  const waiting = { postMessage }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue({ waiting }) },
  })

  render(<PwaUpdateNotice />)
  await screen.findByText('Nova versão disponível')
  expect(screen.getByText(/Conclua e salve lançamentos antes de atualizar/)).toBeInTheDocument()
  expect(postMessage).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }))
  expect(postMessage).toHaveBeenCalledOnce()
  expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
})

test('PWA: o aviso permanece dispensável e não dispara recarga por conta própria', async () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(null) },
  })

  render(<PwaUpdateNotice />)
  const waiting = { postMessage: vi.fn() }
  window.dispatchEvent(
    new CustomEvent('meu-real:pwa-update', { detail: { registration: { waiting } } }),
  )
  await screen.findByText('Nova versão disponível')
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar depois' }))
  await waitFor(() => expect(screen.queryByText('Nova versão disponível')).toBeNull())
  expect(waiting.postMessage).not.toHaveBeenCalled()
})
