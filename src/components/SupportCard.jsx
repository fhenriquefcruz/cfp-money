import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink, LifeBuoy, Send } from 'lucide-react'
import { LEGAL_IDENTITY } from '../content/legal'
import { SUPPORT_CATEGORIES, createSupportRequest, onMySupportRequests } from '../services/support'
import { Button, Card, Input } from './ui'

const STATUS_LABELS = {
  open: 'Recebida',
  in_progress: 'Em atendimento',
  answered: 'Respondida',
  closed: 'Encerrada',
}

function protocolLabel(value = '') {
  return `MR-${String(value).slice(0, 10).toUpperCase()}`
}

export default function SupportCard() {
  const [requests, setRequests] = useState([])
  const [category, setCategory] = useState('support')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(
    () =>
      onMySupportRequests(setRequests, (error) =>
        setFeedback(error?.message || 'Não foi possível carregar seus atendimentos.'),
      ),
    [],
  )

  const recent = useMemo(() => requests.slice(0, 3), [requests])

  const submit = async (event) => {
    event.preventDefault()
    setFeedback('')

    if (subject.trim().length < 4) {
      setFeedback('Descreva o assunto em pelo menos 4 caracteres.')
      return
    }
    if (message.trim().length < 10) {
      setFeedback('Descreva a solicitação em pelo menos 10 caracteres.')
      return
    }

    setSending(true)
    try {
      const result = await createSupportRequest({ category, subject, message })
      setSubject('')
      setMessage('')
      setFeedback(`Solicitação recebida. Protocolo ${protocolLabel(result.protocol)}.`)
    } catch (error) {
      setFeedback(error?.message || 'Não foi possível registrar a solicitação.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="overflow-hidden" padding={false}>
      <div className="border-b border-[--border-subtle] bg-[--bg-subtle] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
            <LifeBuoy size={17} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[--text-primary]">Suporte e atendimento</h2>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              Protocolo imediato e resposta inicial em até 5 dias.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <a
          href={`mailto:${LEGAL_IDENTITY.contactEmail}`}
          className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[--border-default] px-3 text-xs font-bold text-[--text-brand]"
        >
          <span className="break-all">{LEGAL_IDENTITY.contactEmail}</span>
          <ExternalLink size={14} className="flex-shrink-0" />
        </a>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[--text-secondary]">
              Tipo de solicitação
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary]"
            >
              {SUPPORT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Assunto"
            value={subject}
            maxLength={120}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Ex.: cobrança, acesso ou privacidade"
          />

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[--text-secondary]">Mensagem</span>
            <textarea
              value={message}
              maxLength={4000}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="Conte o que aconteceu e o que você precisa."
              className="w-full resize-y rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 py-2.5 text-sm text-[--text-primary]"
            />
          </label>

          <Button type="submit" fullWidth loading={sending} icon={<Send size={14} />}>
            Enviar solicitação
          </Button>
        </form>

        {feedback && (
          <p className="rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-secondary]">
            {feedback}
          </p>
        )}

        {recent.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black text-[--text-primary]">Atendimentos recentes</p>
            {recent.map((item) => (
              <div key={item.id} className="rounded-xl border border-[--border-default] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-[--text-brand]">
                    {protocolLabel(item.protocol || item.id)}
                  </span>
                  <span className="text-[10px] font-bold text-[--text-tertiary]">
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-[--text-primary]">{item.subject}</p>
                {item.response && (
                  <p className="mt-2 rounded-lg bg-[--bg-subtle] p-2 text-xs leading-relaxed text-[--text-secondary]">
                    {item.response}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
