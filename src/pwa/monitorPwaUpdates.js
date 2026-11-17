// Revalida a versão ao retomar a aba ou a conexão, sem ativar automaticamente
// um worker em espera e sem recarregar formulários financeiros.
export function monitorPwaUpdates(
  registration,
  {
    windowTarget = window,
    documentTarget = document,
    navigatorTarget = navigator,
    now = () => Date.now(),
    onWaiting = () => {},
  } = {},
) {
  const minCheckInterval = 5 * 60 * 1000
  let lastCheckedAt = -Infinity
  let checking = false

  const check = async () => {
    if (!navigatorTarget.onLine || documentTarget.visibilityState !== 'visible') return
    if (registration.waiting) {
      onWaiting(registration)
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
