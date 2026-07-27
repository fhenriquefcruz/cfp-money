// src/components/PremiumGate.jsx
// Protege recursos Premium sem remover ou alterar dados já cadastrados.
import React from 'react'
import { Link } from 'react-router-dom'
import { Star, Lock, CheckCircle, QrCode, Crown, ArrowRight } from 'lucide-react'
import { usePlan } from '../contexts/PlanContext'
import { Card } from './ui'

const PIX_KEY = 'fhenriquefcruz@gmail.com'
const PIX_AMOUNT = 'R$ 19,90'

const DEFAULT_BENEFITS = [
  'Money, seu assistente financeiro pessoal',
  'Dashboard avançado com previsões',
  'Relatórios completos e exportação em PDF',
  'Alertas inteligentes de orçamento',
]

function PremiumLoadingCard() {
  return (
    <Card className="h-full overflow-hidden" padding={false}>
      <div className="animate-pulse space-y-3 p-5">
        <div className="h-10 w-10 rounded-2xl bg-[--bg-hover]" />
        <div className="h-4 w-36 rounded bg-[--bg-hover]" />
        <div className="h-3 w-full rounded bg-[--bg-hover]" />
        <div className="h-3 w-3/4 rounded bg-[--bg-hover]" />
      </div>
    </Card>
  )
}

function CompactPremiumGate({ feature, description, benefits }) {
  return (
    <Card
      className="group relative h-full overflow-hidden border-yellow-300/60 shadow-sm transition-shadow hover:shadow-md"
      padding={false}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm">
              <Crown size={19} />
            </div>
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                <Star size={10} className="fill-current" />
                Premium
              </div>
              <h2 className="text-sm font-black text-[--text-primary]">{feature}</h2>
            </div>
          </div>
          <Lock size={16} className="flex-shrink-0 text-yellow-600" />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[--text-secondary]">
          {description || 'Este benefício está disponível exclusivamente para assinantes Premium.'}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(benefits || DEFAULT_BENEFITS).slice(0, 4).map((benefit) => (
            <div key={benefit} className="flex items-start gap-2">
              <CheckCircle
                size={13}
                className="mt-0.5 flex-shrink-0 text-[--success-icon]"
              />
              <span className="text-[11px] leading-relaxed text-[--text-secondary]">
                {benefit}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-yellow-200/70 pt-4">
          <p className="text-[11px] text-[--text-tertiary]">
            Seus dados e preferências permanecem preservados.
          </p>
          <Link
            to="/profile"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[--brand-600] px-3 text-xs font-semibold text-white transition-colors hover:bg-[--brand-700]"
          >
            Ver Premium
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default function PremiumGate({
  children,
  feature = 'este recurso',
  description,
  benefits,
  variant = 'page',
}) {
  const { status, isLoading } = usePlan()

  if (isLoading) return variant === 'card' ? <PremiumLoadingCard /> : null
  if (status.isPremium) return children

  if (variant === 'card') {
    return (
      <CompactPremiumGate
        feature={feature}
        description={description}
        benefits={benefits}
      />
    )
  }

  const resolvedBenefits = benefits || DEFAULT_BENEFITS

  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-4xl items-center justify-center p-4 sm:p-6">
      <div className="grid w-full overflow-hidden rounded-3xl border border-yellow-300/60 bg-[--bg-surface] shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-6 text-white sm:p-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-black/5" />

          <div className="relative">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur">
              <Lock size={24} />
            </div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <Crown size={13} />
              Benefício Premium
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">Acesse {feature}</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
              {description ||
                (status.isExpired && status.isTrial
                  ? 'Seu período gratuito encerrou. Assine o Premium para continuar usando este benefício.'
                  : 'Este recurso foi desenvolvido para assinantes Premium do Meu Real.')}
            </p>

            <div className="mt-6 space-y-3">
              {resolvedBenefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/90">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[--text-tertiary]">
              Plano Premium
            </p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-3xl font-black text-[--text-primary]">{PIX_AMOUNT}</span>
              <span className="pb-1 text-xs text-[--text-tertiary]">por mês</span>
            </div>
          </div>

          <Card className="border-[--brand-200] bg-[--brand-50]" padding={false}>
            <div className="flex items-start gap-3 p-4">
              <QrCode size={19} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
              <div>
                <p className="text-sm font-bold text-[--brand-700]">Assinatura via Pix</p>
                <p className="mt-1 text-xs leading-relaxed text-[--brand-600]">
                  Faça um Pix de <strong>{PIX_AMOUNT}</strong> para:
                </p>
                <code className="mt-2 block break-all rounded-lg bg-[--brand-100] px-2 py-1.5 font-mono text-xs text-[--brand-700]">
                  {PIX_KEY}
                </code>
                <p className="mt-2 text-[11px] leading-relaxed text-[--brand-600]">
                  Envie o comprovante para ativação. O acesso vigora por 30 dias após a confirmação.
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-5 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-4">
            <p className="text-xs font-semibold text-[--text-primary]">
              Seus dados continuam seguros
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[--text-tertiary]">
              O bloqueio Premium limita apenas o acesso ao benefício. Nenhuma transação,
              categoria, meta, orçamento ou preferência já salva é removida.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
