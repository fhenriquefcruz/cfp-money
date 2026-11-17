import { beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  // Cada teste precisa iniciar sem consentimento nem recarga de outra sessão.
  vi.resetModules()
})

test('PWA: controller ativado por outra aba não recarrega o rascunho desta aba', async () => {
  const { handlePwaControllerChange, isPwaReloadRequired } = await import(
    './pwaControllerChange'
  )
  const reload = vi.fn()
  const notify = vi.fn()

  expect(isPwaReloadRequired()).toBe(false)
  handlePwaControllerChange({ reload, notify })
  expect(reload).not.toHaveBeenCalled()
  expect(notify).toHaveBeenCalledOnce()
  expect(isPwaReloadRequired()).toBe(true)
})

test('PWA: só a aba que confirmou a atualização recarrega automaticamente', async () => {
  const { activatePwaUpdate, handlePwaControllerChange } = await import(
    './pwaControllerChange'
  )
  const postMessage = vi.fn()
  const reload = vi.fn()
  const notify = vi.fn()

  activatePwaUpdate({ waiting: { postMessage } })
  expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  handlePwaControllerChange({ reload, notify })
  expect(reload).toHaveBeenCalledOnce()
  expect(notify).not.toHaveBeenCalled()

  handlePwaControllerChange({ reload, notify })
  expect(reload).toHaveBeenCalledOnce()
})

test('PWA: não considera atualização confirmada se não há worker aguardando', async () => {
  const { activatePwaUpdate, handlePwaControllerChange } = await import(
    './pwaControllerChange'
  )
  const reload = vi.fn()
  const notify = vi.fn()
  activatePwaUpdate({ waiting: null })
  handlePwaControllerChange({ reload, notify })
  expect(reload).not.toHaveBeenCalled()
  expect(notify).toHaveBeenCalledOnce()
})

test('PWA: erro ao solicitar ativação não autoriza recarga posterior', async () => {
  const { activatePwaUpdate, handlePwaControllerChange } = await import(
    './pwaControllerChange'
  )
  const reload = vi.fn()
  const notify = vi.fn()
  const worker = { postMessage: vi.fn(() => { throw new Error('Worker indisponível') }) }
  expect(() => activatePwaUpdate({ waiting: worker })).toThrow('Worker indisponível')
  handlePwaControllerChange({ reload, notify })
  expect(reload).not.toHaveBeenCalled()
  expect(notify).toHaveBeenCalledOnce()
})
