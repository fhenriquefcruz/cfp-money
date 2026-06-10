// src/components/PremiumGate.jsx
// Bloqueia acesso a recursos Premium mostrando tela de upgrade
import React from 'react'
import { Star, Lock, CheckCircle, QrCode } from 'lucide-react'
import { usePlan } from '../contexts/PlanContext'
import { Card, Button, Badge } from './ui'

// Chave Pix — troque pela sua antes de publicar
const PIX_KEY = 'fhenriquefcruz@gmail.com'
const PIX_AMOUNT = 'R$ 19,90'

export default function PremiumGate({ children, feature = 'este recurso' }) {
  const { status } = usePlan()

  if (status.isPremium) return children

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-4 shadow-lg">
        <Lock size={24} className="text-white" />
      </div>

      <Badge variant="warning" className="mb-3">Recurso Premium</Badge>

      <h2 className="text-2xl font-black text-[--text-primary] mb-2">
        Acesse {feature}
      </h2>
      <p className="text-sm text-[--text-secondary] mb-6 leading-relaxed">
        {status.isExpired && status.isTrial
          ? 'Seu período de 7 dias grátis encerrou. Assine o Premium para continuar.'
          : 'Este recurso está disponível apenas no plano Premium.'}
      </p>

      <Card className="w-full text-left mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-bold text-[--text-primary]">Plano Premium</span>
          <span className="ml-auto text-lg font-black text-[--text-primary]">{PIX_AMOUNT}<span className="text-xs font-normal text-[--text-tertiary]">/mês</span></span>
        </div>
        <div className="space-y-2">
          {[
            'Dashboard avançado com previsões',
            'Relatórios completos + exportação PDF',
            'Histórico ilimitado de transações',
            'Alertas inteligentes de orçamento',
          ].map(f => (
            <div key={f} className="flex items-center gap-2">
              <CheckCircle size={13} className="text-[--success-icon] flex-shrink-0" />
              <span className="text-xs text-[--text-secondary]">{f}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Instruções de pagamento Pix */}
      <Card className="w-full text-left bg-[--brand-50] border-[--brand-200]">
        <div className="flex items-start gap-3">
          <QrCode size={18} className="text-[--brand-600] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[--brand-700] mb-1">Como assinar via Pix</p>
            <p className="text-xs text-[--brand-600] leading-relaxed">
              1. Faça um Pix de <strong>{PIX_AMOUNT}</strong> para a chave:<br />
              <code className="font-mono bg-[--brand-100] px-1 rounded text-[--brand-700]">{PIX_KEY}</code>
            </p>
            <p className="text-xs text-[--brand-600] mt-1">
              2. Envie o comprovante para ativar seu acesso.
            </p>
            <p className="text-xs text-[--brand-500] mt-1">O plano vigora por 30 dias após confirmação.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
