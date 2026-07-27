import React from 'react'
import { Send } from 'lucide-react'
import TelegramIntegrationCard from './TelegramIntegrationCard'
import { Card } from './ui'
import { telegramEnabled } from '../config/runtimeFeatures'

export default function TelegramIntegrationRouter() {
  if (telegramEnabled) {
    return <TelegramIntegrationCard />
  }

  return (
    <Card className="overflow-hidden" padding={false}>
      <div className="flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
          <Send size={19} />
        </div>
        <div>
          <h2 className="text-sm font-black text-[--text-primary]">
            Money no Telegram
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
            Integração temporariamente indisponível no modo
            gratuito. O código foi preservado para futura
            ativação.
          </p>
        </div>
      </div>
    </Card>
  )
}
