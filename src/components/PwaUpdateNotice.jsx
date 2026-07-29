import React, { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { activatePwaUpdate } from '../pwa/registerServiceWorker'

export default function PwaUpdateNotice() {
  const [registration, setRegistration] = useState(null)

  useEffect(() => {
    const handleUpdate = (event) => {
      setRegistration(event.detail?.registration || null)
    }

    window.addEventListener('meu-real:pwa-update', handleUpdate)
    return () => window.removeEventListener('meu-real:pwa-update', handleUpdate)
  }, [])

  if (!registration) return null

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
          <p className="text-sm font-bold text-[--text-primary]">Nova versão disponível</p>
          <p className="text-xs text-[--text-secondary]">Atualize para receber as melhorias.</p>
        </div>
        <button
          type="button"
          onClick={() => setRegistration(null)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover]"
          aria-label="Atualizar depois"
        >
          <X size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => activatePwaUpdate(registration)}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[--brand-600] px-4 text-sm font-bold text-white transition-colors hover:bg-[--brand-700]"
      >
        Atualizar agora
      </button>
    </div>
  )
}
