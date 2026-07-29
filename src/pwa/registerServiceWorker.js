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
