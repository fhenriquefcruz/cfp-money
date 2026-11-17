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
      // Monitoramento e consentimento carregados somente após registrar o PWA.
      void import('./monitorPwaUpdates')
        .then(({ monitorPwaUpdates }) =>
          monitorPwaUpdates(registration, { onWaiting: notifyUpdate }),
        )
        .catch(() => {})
      void import('./pwaControllerChange')
        .then(({ observePwaControllerChanges }) => observePwaControllerChanges())
        .catch(() => {})
    } catch (error) {
      console.warn('Não foi possível ativar os recursos offline.', error)
    }
  })
}
