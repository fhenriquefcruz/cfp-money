let isRefreshing = false
let updateRequestedHere = false
let reloadRequired = false

export const isPwaReloadRequired = () => reloadRequired

// Outra aba pode ativar a nova versão enquanto há formulários abertos aqui.
// Só recarregar automaticamente na aba que aceitou a atualização.
export function handlePwaControllerChange({
  reload = () => window.location.reload(),
  notify = () => window.dispatchEvent(new Event('meu-real:pwa-reload-required')),
} = {}) {
  if (isRefreshing) return
  if (updateRequestedHere) {
    updateRequestedHere = false
    isRefreshing = true
    reload()
    return
  }

  reloadRequired = true
  notify()
}


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
      // Carregamento tardio preserva o orçamento de JS inicial da fintech.
      void import('./monitorPwaUpdates')
        .then(({ monitorPwaUpdates }) =>
          monitorPwaUpdates(registration, { onWaiting: notifyUpdate }),
        )
        .catch(() => {})

      // Um primeiro controller pode assumir o controle após instalação limpa.
      // Não é atualização de uma sessão antiga e não deve disparar aviso.
      let previouslyControlled = Boolean(navigator.serviceWorker.controller)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!previouslyControlled && !updateRequestedHere) {
          previouslyControlled = true
          return
        }
        previouslyControlled = true
        handlePwaControllerChange()
      })
    } catch (error) {
      console.warn('Não foi possível ativar os recursos offline.', error)
    }
  })
}

export function activatePwaUpdate(registration) {
  if (!registration?.waiting) return
  updateRequestedHere = true
  try {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  } catch (error) {
    updateRequestedHere = false
    throw error
  }
}
