import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, Share2, ShieldCheck, Smartphone, WifiOff } from 'lucide-react'
import { Button, Card } from './ui'
import { canPromptPwaInstall, isPwaInstalled, requestPwaInstall } from '../pwa/pwaInstall'

const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

export default function PwaInstallCard() {
  const [installed, setInstalled] = useState(isPwaInstalled)
  const [canInstall, setCanInstall] = useState(canPromptPwaInstall)
  const [installing, setInstalling] = useState(false)
  const [online, setOnline] = useState(window.navigator.onLine)
  const isIos = useMemo(isIosDevice, [])

  useEffect(() => {
    const updateInstallState = () => {
      setInstalled(isPwaInstalled())
      setCanInstall(canPromptPwaInstall())
    }
    const updateConnection = () => setOnline(window.navigator.onLine)

    window.addEventListener('meu-real:pwa-install-state', updateInstallState)
    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)

    return () => {
      window.removeEventListener('meu-real:pwa-install-state', updateInstallState)
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
    }
  }, [])

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const outcome = await requestPwaInstall()
      if (outcome === 'accepted') setInstalled(true)
    } finally {
      setInstalling(false)
      setCanInstall(canPromptPwaInstall())
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-100] text-[--brand-600]">
          <Smartphone size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[--text-primary]">Aplicativo Meu Real</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                online
                  ? 'bg-[--success-bg] text-[--success-text]'
                  : 'bg-[--warning-bg] text-[--warning-text]'
              }`}
            >
              {online ? 'Online' : 'Sem conexão'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">
            Instale para abrir em tela cheia e acessar a interface básica mesmo sem internet.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
        {installed ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-[--success-text]">
            <CheckCircle2 size={16} />
            Aplicativo instalado neste dispositivo
          </div>
        ) : canInstall ? (
          <Button
            variant="primary"
            fullWidth
            icon={<Download size={15} />}
            loading={installing}
            onClick={handleInstall}
          >
            Instalar aplicativo
          </Button>
        ) : isIos ? (
          <div className="flex items-start gap-2.5">
            <Share2 size={17} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
            <p className="text-xs leading-relaxed text-[--text-secondary]">
              No Safari, toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <Download size={17} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
            <p className="text-xs leading-relaxed text-[--text-secondary]">
              Abra o menu do navegador e escolha <strong>Instalar aplicativo</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
          <ShieldCheck size={14} className="text-[--brand-500]" />
          Dados financeiros não ficam no cache
        </div>
        <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
          <WifiOff size={14} className="text-[--brand-500]" />
          Modo offline seguro e limitado
        </div>
      </div>
    </Card>
  )
}
