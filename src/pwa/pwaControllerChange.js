let isRefreshing = false
let updateRequestedHere = false
let reloadRequired = false

export const isPwaReloadRequired = () => reloadRequired

// Uma aba que não pediu atualização pode conter lançamentos ainda não salvos.
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

export function observePwaControllerChanges(serviceWorker = navigator.serviceWorker) {
  // O primeiro claim em uma instalação limpa não é atualização.
  let previouslyControlled = Boolean(serviceWorker.controller)
  serviceWorker.addEventListener('controllerchange', () => {
    if (!previouslyControlled && !updateRequestedHere) {
      previouslyControlled = true
      return
    }
    previouslyControlled = true
    handlePwaControllerChange()
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
