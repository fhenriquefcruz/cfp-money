let isRefreshing = false

const notifyUpdate = (registration) => {
  window.dispatchEvent(
    new CustomEvent('meu-real:pwa-update', {
      detail: { registration },
    }),
  )
}

const observeInstallingWorker = (registration) => {
  const worker = registration.installing
  if (!worker) return

  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      notifyUpdate(registration)
    }
  })
}

// Revalida a versão ao retomar a aba ou a conexão, sem ativar automaticamente
// um worker em espera e sem recarregar formulários financeiros.
export function monitorPwaUpdates(
  registration,
  {
    windowTarget = window,
    documentTarget = document,
    navigatorTarget = navigator,
    now = () => Date.now(),
  } = {},
) {
  const minCheckInterval = 5 * 60 * 1000
  let lastCheckedAt = -Infinity
  let checking = false

  const check = async () => {
    if (!navigatorTarget.onLine || documentTarget.visibilityState !== 'visible') return
    if (registration.waiting) {
      notifyUpdate(registration)
      return
    }
    if (checking || now() - lastCheckedAt < minCheckInterval) return
    checking = true
    lastCheckedAt = now()
    try {
      await registration.update()
    } catch {
      // Atualização indisponível: manter versão atual e tentar no próximo ciclo.
    } finally {
      checking = false
    }
  }

  const handleResume = () => {
    void check()
  }
  const interval = windowTarget.setInterval(handleResume, 30 * 60 * 1000)
  documentTarget.addEventListener('visibilitychange', handleResume)
  windowTarget.addEventListener('online', handleResume)

  return () => {
    windowTarget.clearInterval(interval)
    documentTarget.removeEventListener('visibilitychange', handleResume)
    windowTarget.removeEventListener('online', handleResume)
  }
}

export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
        { scope: import.meta.env.BASE_URL },
      )

      if (registration.waiting) notifyUpdate(registration)

      registration.addEventListener('updatefound', () => {
        observeInstallingWorker(registration)
      })
      monitorPwaUpdates(registration)

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isRefreshing) return
        isRefreshing = true
        window.location.reload()
      })
    } catch (error) {
      console.warn('Não foi possível ativar os recursos offline.', error)
    }
  })
}

export function activatePwaUpdate(registration) {
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
}
