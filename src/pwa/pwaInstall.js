let deferredInstallPrompt = null
let initialized = false

const emitStateChange = () => {
  window.dispatchEvent(new Event('meu-real:pwa-install-state'))
}

export const isPwaInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export const canPromptPwaInstall = () => Boolean(deferredInstallPrompt)

export function initializePwaInstallPrompt() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event
    emitStateChange()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    emitStateChange()
  })
}

export async function requestPwaInstall() {
  if (!deferredInstallPrompt) return 'unavailable'

  const prompt = deferredInstallPrompt
  await prompt.prompt()
  const choice = await prompt.userChoice

  deferredInstallPrompt = null
  emitStateChange()
  return choice.outcome
}
