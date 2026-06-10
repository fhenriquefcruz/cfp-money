// src/components/PlanAlert.jsx
// Banner flutuante de alerta de vencimento do plano
import React, { useState } from 'react'
import { AlertTriangle, X, Star } from 'lucide-react'
import { usePlan } from '../contexts/PlanContext'

export default function PlanAlert() {
  const { status } = usePlan()
  const [dismissed, setDismissed] = useState(false)

  // Mostra apenas se: expirou OU faltam ≤5 dias
  if (dismissed) return null
  if (!status.isExpired && !(status.isPremium && status.daysLeft <= 5)) return null
  if (!status.isPremium && !status.isExpired) return null

  const isExpired = status.isExpired

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border max-w-sm w-[90vw]
      ${isExpired
        ? 'bg-[--danger-bg] border-[--danger-border] text-[--danger-text]'
        : 'bg-[--warning-bg] border-[--warning-border] text-[--warning-text]'}`}>
      {isExpired
        ? <AlertTriangle size={16} className="flex-shrink-0" />
        : <Star size={16} className="flex-shrink-0 fill-current" />}
      <p className="text-xs font-medium flex-1">
        {isExpired
          ? 'Seu plano expirou. Renove via Pix para continuar usando os recursos Premium.'
          : `Seu plano vence em ${status.daysLeft} dia${status.daysLeft !== 1 ? 's' : ''}. Renove via Pix para não perder o acesso.`}
      </p>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}
