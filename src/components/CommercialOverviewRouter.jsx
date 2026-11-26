import React from 'react'
import { Activity } from 'lucide-react'
import CommercialOverviewCard from './CommercialOverviewCard'
import { Card } from './ui'
import { backendEnabled } from '../config/runtimeFeatures'

export default function CommercialOverviewRouter() {
  if (backendEnabled) {
    return <CommercialOverviewCard />
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <Activity size={18} />
        <div>
          <h2 className="text-sm font-black">Operação e prontidão comercial</h2>
          <p className="mt-1 text-xs text-[--text-tertiary]">Métricas indisponíveis no momento.</p>
        </div>
      </div>
    </Card>
  )
}
