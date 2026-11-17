import { describe, expect, it, vi } from 'vitest'
import { activatePwaUpdate, monitorPwaUpdates } from './registerServiceWorker'

describe('activatePwaUpdate', () => {
  it('solicita ativação apenas ao worker em espera', () => {
    const postMessage = vi.fn()

    activatePwaUpdate({
      waiting: {
        postMessage,
      },
    })

    expect(postMessage).toHaveBeenCalledOnce()
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('não falha quando não existe atualização em espera', () => {
    expect(() => activatePwaUpdate(null)).not.toThrow()
    expect(() => activatePwaUpdate({ waiting: null })).not.toThrow()
  })
})

describe('monitorPwaUpdates', () => {
  function setup() {
    const windowTarget = new EventTarget()
    const documentTarget = new EventTarget()
    let visible = true
    let online = true
    let time = 1_000_000
    Object.defineProperty(documentTarget, 'visibilityState', {
      get: () => (visible ? 'visible' : 'hidden'),
    })
    const navigatorTarget = {
      get onLine() {
        return online
      },
    }
    windowTarget.setInterval = vi.fn(() => 42)
    windowTarget.clearInterval = vi.fn()
    const registration = { update: vi.fn().mockResolvedValue(undefined), waiting: null }
    const stop = monitorPwaUpdates(registration, {
      windowTarget,
      documentTarget,
      navigatorTarget,
      now: () => time,
    })

    return {
      windowTarget,
      documentTarget,
      registration,
      stop,
      nextMinutes: (minutes) => {
        time += minutes * 60 * 1000
      },
      hide: () => {
        visible = false
      },
      show: () => {
        visible = true
        documentTarget.dispatchEvent(new Event('visibilitychange'))
      },
      disconnect: () => {
        online = false
      },
      reconnect: () => {
        online = true
        windowTarget.dispatchEvent(new Event('online'))
      },
    }
  }

  it('revalida quando visível e online, com janela mínima e sem recarga forçada', async () => {
    const session = setup()
    session.show()
    expect(session.registration.update).toHaveBeenCalledOnce()

    await Promise.resolve()
    session.nextMinutes(2)
    session.show()
    expect(session.registration.update).toHaveBeenCalledOnce()

    session.hide()
    session.nextMinutes(5)
    session.documentTarget.dispatchEvent(new Event('visibilitychange'))
    expect(session.registration.update).toHaveBeenCalledOnce()

    session.show()
    expect(session.registration.update).toHaveBeenCalledTimes(2)

    await Promise.resolve()
    session.disconnect()
    session.nextMinutes(6)
    session.show()
    expect(session.registration.update).toHaveBeenCalledTimes(2)

    session.reconnect()
    expect(session.registration.update).toHaveBeenCalledTimes(3)
    session.stop()
    expect(session.windowTarget.clearInterval).toHaveBeenCalledWith(42)
    session.nextMinutes(10)
    session.show()
    expect(session.registration.update).toHaveBeenCalledTimes(3)
  })

  it('reapresenta atualização aguardando consentimento sem ativá-la automaticamente', () => {
    const session = setup()
    const notice = vi.fn()
    window.addEventListener('meu-real:pwa-update', notice)
    session.registration.waiting = { postMessage: vi.fn() }
    try {
      session.show()
      expect(notice).toHaveBeenCalledOnce()
      expect(session.registration.update).not.toHaveBeenCalled()
      expect(session.registration.waiting.postMessage).not.toHaveBeenCalled()
    } finally {
      session.stop()
      window.removeEventListener('meu-real:pwa-update', notice)
    }
  })

  it('não propaga erro transitório de verificação ou repete solicitações simultâneas', async () => {
    const session = setup()
    let finish
    session.registration.update.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    session.show()
    session.nextMinutes(6)
    session.show()
    expect(session.registration.update).toHaveBeenCalledOnce()
    finish()
    await Promise.resolve()
    session.registration.update.mockRejectedValueOnce(new Error('offline'))
    session.show()
    await Promise.resolve()
    expect(session.registration.update).toHaveBeenCalledTimes(2)
    session.stop()
  })
})
