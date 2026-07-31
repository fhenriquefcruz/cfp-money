import { describe, expect, it, vi } from 'vitest'
import { activatePwaUpdate } from './registerServiceWorker'

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
