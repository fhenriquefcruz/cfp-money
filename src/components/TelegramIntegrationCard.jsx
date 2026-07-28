import React, { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Unlink,
} from 'lucide-react'
import {
  createTelegramLinkCode,
  getTelegramIntegrationStatus,
  unlinkTelegramIntegration,
  updateTelegramPreferences,
} from '../services/backend'
import { Button, Card } from './ui'

const DEFAULT_PREFERENCES = {
  dailySummary: false,
  weeklySummary: false,
  invoiceAlerts: true,
}

export default function TelegramIntegrationCard() {
  const [status, setStatus] = useState({
    linked: false,
    preferences: DEFAULT_PREFERENCES,
  })
  const [codeData, setCodeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [message, setMessage] = useState('')
  const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '')
    .trim()
    .replace(/^@/, '')

  const botUrl = botUsername ? `https://t.me/${botUsername}` : ''

  const integrationLabel = useMemo(() => {
    if (!status.linked) return 'Não vinculado'
    if (status.username) return `@${status.username}`
    if (status.firstName) return status.firstName
    return 'Telegram vinculado'
  }, [status])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const data = await getTelegramIntegrationStatus()
      setStatus({
        ...data,
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...(data.preferences || {}),
        },
      })
    } catch (error) {
      setMessage(error?.message || 'Não foi possível consultar a integração.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const generateCode = async () => {
    setAction('code')
    setMessage('')

    try {
      const data = await createTelegramLinkCode()
      setCodeData(data)
    } catch (error) {
      setMessage(error?.message || 'Não foi possível gerar o código.')
    } finally {
      setAction('')
    }
  }

  const copyCode = async () => {
    if (!codeData?.code) return
    await navigator.clipboard.writeText(codeData.code)
    setMessage('Código copiado.')
  }

  const savePreferences = async (preferences) => {
    setAction('preferences')
    setMessage('')

    try {
      const result = await updateTelegramPreferences(preferences)
      setStatus((current) => ({
        ...current,
        preferences: result.preferences,
      }))
      setMessage('Preferências do Telegram salvas.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível salvar as preferências.')
    } finally {
      setAction('')
    }
  }

  const togglePreference = (field) => {
    const preferences = {
      ...status.preferences,
      [field]: !status.preferences[field],
    }

    setStatus((current) => ({
      ...current,
      preferences,
    }))
    savePreferences(preferences)
  }

  const unlink = async () => {
    setAction('unlink')
    setMessage('')

    try {
      await unlinkTelegramIntegration()
      setStatus({
        linked: false,
        preferences: DEFAULT_PREFERENCES,
      })
      setCodeData(null)
      setMessage('Telegram desvinculado.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível desvincular.')
    } finally {
      setAction('')
    }
  }

  return (
    <Card className="overflow-hidden shadow-sm" padding={false}>
      <div className="border-b border-[--border-subtle] bg-gradient-to-r from-sky-50 to-[--bg-surface] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
            <Send size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-[--text-primary]">Money no Telegram</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  status.linked
                    ? 'bg-[--success-bg] text-[--success-text]'
                    : 'bg-[--bg-hover] text-[--text-tertiary]'
                }`}
              >
                {integrationLabel}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              Consulte saldos e registre lançamentos por mensagem, sempre com confirmação antes de
              salvar.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center">
            <Loader2 size={22} className="animate-spin text-[--brand-600]" />
          </div>
        ) : status.linked ? (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-[--success-border] bg-[--success-bg] p-4">
              <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-[--success-icon]" />
              <div>
                <p className="text-xs font-black text-[--success-text]">Integração ativa</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[--text-secondary]">
                  O bot está autorizado a consultar e criar dados apenas para a sua conta vinculada.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <BellRing size={15} className="text-[--brand-600]" />
                <p className="text-xs font-black text-[--text-primary]">Resumos e alertas</p>
              </div>

              <div className="space-y-2">
                {[
                  [
                    'dailySummary',
                    'Resumo diário',
                    'Enviado às 8h com receitas, despesas e saldo do ciclo.',
                  ],
                  ['weeklySummary', 'Resumo semanal', 'Enviado nas manhãs de segunda-feira.'],
                  [
                    'invoiceAlerts',
                    'Alertas de fatura',
                    'Avisa sobre faturas pendentes próximas do vencimento.',
                  ],
                ].map(([field, label, helper]) => (
                  <label
                    key={field}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[--border-default] p-3"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(status.preferences[field])}
                      disabled={action === 'preferences'}
                      onChange={() => togglePreference(field)}
                      className="mt-1 h-4 w-4 accent-[--brand-600]"
                    />
                    <span>
                      <span className="block text-xs font-black text-[--text-primary]">
                        {label}
                      </span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-[--text-tertiary]">
                        {helper}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {botUrl && (
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 text-xs font-black text-white hover:bg-sky-600"
                >
                  <MessageCircle size={14} />
                  Abrir Telegram
                </a>
              )}
              <Button
                variant="danger"
                fullWidth
                loading={action === 'unlink'}
                icon={<Unlink size={14} />}
                onClick={unlink}
              >
                Desvincular
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-[--brand-200] bg-[--brand-50] p-4">
              <ShieldCheck size={17} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
              <div>
                <p className="text-xs font-black text-[--brand-700]">Vinculação segura</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[--brand-600]">
                  O código expira em dez minutos e pode ser usado somente uma vez.
                </p>
              </div>
            </div>

            {!codeData ? (
              <Button
                variant="primary"
                fullWidth
                loading={action === 'code'}
                icon={<Link2 size={15} />}
                onClick={generateCode}
              >
                Gerar código de vinculação
              </Button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[--text-tertiary]">
                  Código temporário
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-3 text-center text-xl font-black tracking-[0.22em] text-[--brand-700]">
                    {codeData.code}
                  </code>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[--border-default] bg-[--bg-surface] text-[--text-secondary]"
                    aria-label="Copiar código"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                <ol className="space-y-1 text-[11px] leading-relaxed text-[--text-secondary]">
                  <li>1. Abra o bot no Telegram.</li>
                  <li>
                    2. Envie <code className="font-bold">/vincular {codeData.code}</code>
                  </li>
                  <li>3. Volte aqui e reabra as preferências.</li>
                </ol>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {botUrl && (
                    <a
                      href={botUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 text-xs font-black text-white hover:bg-sky-600"
                    >
                      <Send size={14} />
                      Abrir bot
                    </a>
                  )}
                  <Button variant="secondary" fullWidth onClick={loadStatus}>
                    Verificar vínculo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {message && (
          <p className="rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-secondary]">
            {message}
          </p>
        )}
      </div>
    </Card>
  )
}
