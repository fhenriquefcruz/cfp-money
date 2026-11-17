import React, { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { activatePwaUpdate, isPwaReloadRequired } from '../pwa/pwaControllerChange'

export default function PwaUpdateNotice() {
  const [registration, setRegistration] = useState(null)
  const [reloadRequired, setReloadRequired] = useState(isPwaReloadRequired)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleUpdate = (event) => {
      setRegistration(event.detail?.registration || null)
    }

    const handleReloadRequired = () => {
      setReloadRequired(true)
      setDismissed(false)
    }
    window.addEventListener('meu-real:pwa-update', handleUpdate)
    window.addEventListener('meu-real:pwa-reload-required', handleReloadRequired)

    let mounted = true
    // O aviso pode ter sido emitido antes do componente lazy ser montado.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((current) => {
          if (mounted && current?.waiting) setRegistration(current)
        })
        .catch(() => {})
    }

    return () => {
      mounted = false
      window.removeEventListener('meu-real:pwa-update', handleUpdate)
      window.removeEventListener('meu-real:pwa-reload-required', handleReloadRequired)
    }
  }, [])

  if (dismissed || (!registration && !reloadRequired)) return null

  return (
    <div
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[70] mx-auto max-w-md rounded-2xl border border-[--border-default] bg-[--bg-elevated] p-3 shadow-2xl lg:bottom-6 lg:left-auto lg:right-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
          <RefreshCw size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[--text-primary]">
            {reloadRequired ? 'Atualização ativada em outra aba' : 'Nova versão disponível'}
          </p>
          <p className="text-xs text-[--text-secondary]">
            Conclua e salve lançamentos antes de recarregar. Seus rascunhos não são salvos
            automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRegistration(null)
            setDismissed(true)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover]"
          aria-label="Atualizar depois"
        >
          <X size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={() =>
          reloadRequired ? window.location.reload() : activatePwaUpdate(registration)
        }
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[--brand-600] px-4 text-sm font-bold text-white transition-colors hover:bg-[--brand-700]"
      >
        {reloadRequired ? 'Recarregar quando estiver pronto' : 'Atualizar agora'}
      </button>
    </div>
  )
}
