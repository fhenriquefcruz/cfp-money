import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { getCommercialMetrics } from '../services/backend'
import { Button, Card } from './ui'

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[--brand-600]" />
        <p className="text-[10px] font-bold uppercase tracking-wide text-[--text-tertiary]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums text-[--text-primary]">{value}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">{detail}</p>
    </div>
  )
}

function CheckRow({ label, ok }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[--border-subtle] px-3 py-2">
      <span className="text-xs text-[--text-secondary]">{label}</span>
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-black ${
          ok ? 'text-[--success-text]' : 'text-[--warning-text]'
        }`}
      >
        {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
        {ok ? 'Pronto' : 'Pendente'}
      </span>
    </div>
  )
}

export default function CommercialOverviewCard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      setMetrics(await getCommercialMetrics())
    } catch (loadError) {
      setError(loadError?.message || 'Não foi possível carregar as métricas operacionais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Card className="overflow-hidden" padding={false}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[--border-subtle] bg-[--bg-subtle] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
            <Activity size={17} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[--text-primary]">
              Operação e prontidão comercial
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              Indicadores agregados, sem exposição dos dados financeiros dos usuários.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          icon={<RefreshCw size={13} />}
          onClick={load}
        >
          Atualizar
        </Button>
      </div>

      <div className="space-y-4 p-4">
        {error && (
          <div className="rounded-xl border border-[--danger-border] bg-[--danger-bg] p-3 text-xs text-[--danger-text]">
            {error}
          </div>
        )}

        {!error && loading && !metrics && (
          <div className="flex min-h-28 items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-[--brand-600]" />
          </div>
        )}

        {metrics && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric
                icon={Users}
                label="Usuários"
                value={metrics.counts.totalUsers}
                detail="Contas registradas"
              />
              <Metric
                icon={MessageCircle}
                label="Telegram"
                value={`${metrics.rates.telegramAdoption}%`}
                detail={`${metrics.counts.telegramLinked} vínculo(s) ativo(s)`}
              />
              <Metric
                icon={ShieldCheck}
                label="Aceite jurídico"
                value={`${metrics.rates.legalAcceptance}%`}
                detail={`${metrics.counts.legalAccepted} usuário(s) na versão atual`}
              />
              <Metric
                icon={Clock3}
                label="Fila de exclusão"
                value={metrics.deletionBacklog}
                detail={`${metrics.counts.deletionFailed} falha(s) exigindo análise`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="space-y-2">
                <CheckRow label="Backend privilegiado" ok={metrics.readiness.checks.backend} />
                <CheckRow label="Integração Telegram" ok={metrics.readiness.checks.telegram} />
                <CheckRow
                  label="Privacidade e portabilidade"
                  ok={metrics.readiness.checks.privacy}
                />
                <CheckRow
                  label="Índices versionados"
                  ok={metrics.readiness.checks.indexesManaged}
                />
                <CheckRow label="App Check obrigatório" ok={metrics.readiness.checks.appCheck} />
              </div>

              <div className="rounded-2xl border border-[--border-default] bg-[--bg-elevated] p-4">
                <p className="text-xs font-black text-[--text-primary]">Índice de prontidão</p>
                <p className="mt-2 text-4xl font-black tabular-nums text-[--brand-600]">
                  {metrics.readiness.percentage}%
                </p>
                <p className="mt-2 text-[10px] leading-relaxed text-[--text-tertiary]">
                  {metrics.readiness.completed} de {metrics.readiness.total} controles técnicos
                  monitorados.
                </p>
                <p className="mt-3 text-[10px] text-[--text-tertiary]">
                  Atualizado em {new Date(metrics.generatedAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {!metrics.readiness.checks.appCheck && (
              <div className="flex items-start gap-3 rounded-xl border border-[--warning-border] bg-[--warning-bg] p-3">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-[--warning-text]" />
                <p className="text-xs leading-relaxed text-[--warning-text]">
                  O App Check permanece em modo de preparação. Antes do lançamento comercial, ative
                  a exigência somente depois de validar os tokens no domínio definitivo.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
