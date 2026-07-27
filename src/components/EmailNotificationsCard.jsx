import React, { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Target,
  WalletCards,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlan } from '../contexts/PlanContext'
import {
  canEnableEmailNotifications,
  DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_VERSION,
  normalizeEmailNotificationSettings,
} from '../domain/emailNotifications'
import {
  getEmailNotificationSettings,
  requestEmailNotificationTest,
  saveEmailNotificationSettings,
} from '../services/notificationService'
import { emailNotificationsEnabled } from '../config/runtimeFeatures'
import PremiumGate from './PremiumGate'
import { Button, Card } from './ui'

const WEEKDAYS = [
  [1, 'Segunda-feira'],
  [2, 'Terça-feira'],
  [3, 'Quarta-feira'],
  [4, 'Quinta-feira'],
  [5, 'Sexta-feira'],
  [6, 'Sábado'],
  [7, 'Domingo'],
]

const FREQUENCIES = [
  ['weekly', 'Semanal'],
  ['fortnightly', 'Quinzenal'],
  ['monthly', 'Mensal'],
]

function CheckboxRow({
  checked,
  disabled,
  label,
  helper,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[--border-default] p-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[--brand-600]"
      />
      <span>
        <span className="block text-xs font-black text-[--text-primary]">
          {label}
        </span>
        {helper && (
          <span className="mt-1 block text-[10px] leading-relaxed text-[--text-tertiary]">
            {helper}
          </span>
        )}
      </span>
    </label>
  )
}

function EmailNotificationsContent() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(
    DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  )
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)

  const verified = Boolean(user?.emailVerified)
  const canEnable = useMemo(
    () =>
      consent ||
      canEnableEmailNotifications(settings),
    [consent, settings],
  )

  useEffect(() => {
    let active = true

    if (!user?.uid) {
      setLoading(false)
      return undefined
    }

    getEmailNotificationSettings(user.uid)
      .then((value) => {
        if (!active) return
        setSettings(value)
        setConsent(
          value.consentVersion ===
            NOTIFICATION_SETTINGS_VERSION,
        )
      })
      .catch((error) => {
        if (!active) return
        setMessage(
          error?.message ||
            'Não foi possível carregar as preferências.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.uid])

  const update = (field, value) =>
    setSettings((current) => ({
      ...current,
      [field]: value,
    }))

  const toggleArray = (field, value) => {
    setSettings((current) => {
      const values = new Set(
        Array.isArray(current[field])
          ? current[field]
          : [],
      )

      if (values.has(value)) values.delete(value)
      else values.add(value)

      return {
        ...current,
        [field]: [...values].sort(
          (a, b) => a - b,
        ),
      }
    })
  }

  const save = async () => {
    if (!user?.uid) return

    if (settings.enabled && !verified) {
      setMessage(
        'Confirme o e-mail da sua conta antes de ativar os envios.',
      )
      return
    }

    if (settings.enabled && !canEnable) {
      setMessage(
        'É necessário autorizar o recebimento dos relatórios e alertas.',
      )
      return
    }

    setAction('save')
    setMessage('')

    try {
      const payload =
        normalizeEmailNotificationSettings({
          ...settings,
          consentVersion:
            settings.enabled && canEnable
              ? NOTIFICATION_SETTINGS_VERSION
              : settings.consentVersion,
          consentAt:
            settings.enabled && canEnable
              ? settings.consentAt || new Date()
              : settings.consentAt,
        })

      await saveEmailNotificationSettings(
        user.uid,
        payload,
      )
      setSettings(payload)
      setMessage(
        payload.enabled
          ? 'Relatórios e alertas por e-mail ativados.'
          : 'Envios automáticos desativados.',
      )
    } catch (error) {
      setMessage(
        error?.message ||
          'Não foi possível salvar as preferências.',
      )
    } finally {
      setAction('')
    }
  }

  const requestTest = async () => {
    if (!user?.uid) return

    if (!verified) {
      setMessage(
        'Confirme o e-mail da sua conta antes de solicitar um teste.',
      )
      return
    }

    setAction('test')
    setMessage('')

    try {
      await requestEmailNotificationTest(user.uid)
      setMessage(
        'Relatório de teste solicitado. O processamento pode levar até 15 minutos.',
      )
    } catch (error) {
      setMessage(
        error?.message ||
          'Não foi possível solicitar o relatório de teste.',
      )
    } finally {
      setAction('')
    }
  }

  if (!emailNotificationsEnabled) {
    return (
      <Card className="overflow-hidden" padding={false}>
        <div className="flex items-start gap-3 p-5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--bg-hover] text-[--text-tertiary]">
            <Mail size={19} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[--text-primary]">
              Relatórios e alertas por e-mail
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              A interface está preparada, mas o serviço gratuito
              de notificações ainda não foi ativado neste ambiente.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden" padding={false}>
      <div className="border-b border-[--border-subtle] bg-[--bg-subtle] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-600] text-white shadow-sm">
            <Mail size={19} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-[--text-primary]">
                Relatórios e alertas por e-mail
              </h2>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-yellow-800">
                Premium
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              Receba resumos financeiros e avisos de orçamento
              ou metas no e-mail da sua conta.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {loading ? (
          <div className="flex min-h-24 items-center justify-center">
            <RefreshCw
              size={21}
              className="animate-spin text-[--brand-600]"
            />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={15}
                  className="text-[--brand-600]"
                />
                <p className="text-xs font-black text-[--text-primary]">
                  Destinatário protegido
                </p>
              </div>
              <p className="mt-1 break-all text-[11px] text-[--text-secondary]">
                {user?.email || 'E-mail não disponível'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                Os envios usam somente o e-mail autenticado.
                O assunto não exibe valores financeiros.
              </p>
            </div>

            {!verified && (
              <div className="rounded-xl border border-[--warning-border] bg-[--warning-bg] p-3 text-xs text-[--warning-text]">
                Confirme o e-mail da conta para habilitar
                os relatórios e alertas.
              </div>
            )}

            <CheckboxRow
              checked={settings.enabled}
              disabled={!verified}
              label="Ativar relatórios e alertas"
              helper="O envio é suspenso automaticamente quando o Premium ou o período de avaliação termina."
              onChange={(event) =>
                update('enabled', event.target.checked)
              }
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="flex items-center gap-2 text-xs font-black text-[--text-primary]">
                  <CalendarDays size={14} />
                  Frequência
                </span>
                <select
                  value={settings.frequency}
                  disabled={!settings.enabled}
                  onChange={(event) =>
                    update(
                      'frequency',
                      event.target.value,
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary]"
                >
                  {FREQUENCIES.map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-2 text-xs font-black text-[--text-primary]">
                  <Clock3 size={14} />
                  Horário
                </span>
                <select
                  value={settings.reportHour}
                  disabled={!settings.enabled}
                  onChange={(event) =>
                    update(
                      'reportHour',
                      Number(event.target.value),
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary]"
                >
                  {Array.from(
                    { length: 17 },
                    (_, index) => index + 6,
                  ).map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {settings.frequency === 'weekly' && (
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[--text-primary]">
                  Dia da semana
                </span>
                <select
                  value={settings.weekday}
                  disabled={!settings.enabled}
                  onChange={(event) =>
                    update(
                      'weekday',
                      Number(event.target.value),
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary]"
                >
                  {WEEKDAYS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {settings.frequency === 'fortnightly' && (
              <p className="rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-secondary]">
                O resumo quinzenal será enviado nos dias
                1 e 15 de cada mês.
              </p>
            )}

            {settings.frequency === 'monthly' && (
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[--text-primary]">
                  Dia do envio mensal
                </span>
                <select
                  value={settings.monthDay}
                  disabled={!settings.enabled}
                  onChange={(event) =>
                    update(
                      'monthDay',
                      Number(event.target.value),
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary]"
                >
                  {Array.from(
                    { length: 28 },
                    (_, index) => index + 1,
                  ).map((day) => (
                    <option key={day} value={day}>
                      Dia {day}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2">
                <WalletCards
                  size={15}
                  className="text-[--brand-600]"
                />
                <p className="text-xs font-black text-[--text-primary]">
                  Alertas de orçamento
                </p>
              </div>
              <CheckboxRow
                checked={settings.budgetAlerts}
                disabled={!settings.enabled}
                label="Avisar sobre limites de gastos"
                helper="Cada faixa é enviada somente uma vez por categoria e por mês."
                onChange={(event) =>
                  update(
                    'budgetAlerts',
                    event.target.checked,
                  )
                }
              />
              {settings.budgetAlerts && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[70, 90, 100].map((threshold) => (
                    <label
                      key={threshold}
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-[--border-default] px-3 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={settings.budgetThresholds.includes(
                          threshold,
                        )}
                        disabled={!settings.enabled}
                        onChange={() =>
                          toggleArray(
                            'budgetThresholds',
                            threshold,
                          )
                        }
                      />
                      {threshold}%
                    </label>
                  ))}
                  <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[--border-default] px-3 text-xs">
                    <input
                      type="checkbox"
                      checked={settings.budgetOverLimit}
                      disabled={!settings.enabled}
                      onChange={(event) =>
                        update(
                          'budgetOverLimit',
                          event.target.checked,
                        )
                      }
                    />
                    Excedido
                  </label>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Target
                  size={15}
                  className="text-[--brand-600]"
                />
                <p className="text-xs font-black text-[--text-primary]">
                  Alertas de metas
                </p>
              </div>
              <CheckboxRow
                checked={settings.goalAlerts}
                disabled={!settings.enabled}
                label="Acompanhar metas financeiras"
                helper="Avisa quando a meta se aproxima, é concluída ou está perto do prazo."
                onChange={(event) =>
                  update(
                    'goalAlerts',
                    event.target.checked,
                  )
                }
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[--brand-200] bg-[--brand-50] p-3">
              <input
                type="checkbox"
                checked={consent}
                disabled={!settings.enabled}
                onChange={(event) =>
                  setConsent(event.target.checked)
                }
                className="mt-1 h-4 w-4 accent-[--brand-600]"
              />
              <span className="text-[11px] leading-relaxed text-[--brand-700]">
                Autorizo o Meu Real a enviar relatórios
                financeiros e alertas transacionais ao e-mail
                da minha conta. Posso cancelar os envios a
                qualquer momento.
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                fullWidth
                loading={action === 'save'}
                disabled={
                  settings.enabled && !canEnable
                }
                icon={<CheckCircle2 size={14} />}
                onClick={save}
              >
                Salvar preferências
              </Button>
              <Button
                variant="secondary"
                fullWidth
                loading={action === 'test'}
                disabled={!settings.enabled || !verified}
                icon={<Send size={14} />}
                onClick={requestTest}
              >
                Enviar teste
              </Button>
            </div>
          </>
        )}

        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-secondary]">
            <BellRing
              size={14}
              className="mt-0.5 flex-shrink-0"
            />
            <span>{message}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function EmailNotificationsCard() {
  const { status, isLoading } = usePlan()

  if (isLoading) {
    return (
      <Card>
        <div className="flex min-h-24 items-center justify-center">
          <RefreshCw
            size={20}
            className="animate-spin text-[--brand-600]"
          />
        </div>
      </Card>
    )
  }

  if (!status.isPremium) {
    return (
      <PremiumGate
        variant="card"
        feature="Relatórios e alertas por e-mail"
        description="Receba resumos semanais, quinzenais ou mensais e avisos inteligentes sobre orçamento e metas."
        benefits={[
          'Relatórios automáticos por e-mail',
          'Alertas em 70%, 90% e 100%',
          'Avisos de metas e prazos',
          'Preferências preservadas',
        ]}
      />
    )
  }

  return <EmailNotificationsContent />
}
