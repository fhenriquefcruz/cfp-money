import React, { useEffect, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { adminRespondSupportRequest, onSupportRequestsAdmin } from '../services/support'
import { Button, Card } from './ui'

const STATUS_OPTIONS = [
  ['open', 'Recebida'],
  ['in_progress', 'Em atendimento'],
  ['answered', 'Respondida'],
  ['closed', 'Encerrada'],
]

function protocolLabel(value = '') {
  return `MR-${String(value).slice(0, 10).toUpperCase()}`
}

export default function SupportAdminCard() {
  const [requests, setRequests] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [status, setStatus] = useState('answered')
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(
    () =>
      onSupportRequestsAdmin(setRequests, (error) =>
        setFeedback(error?.message || 'Não foi possível carregar os atendimentos.'),
      ),
    [],
  )

  const selected = requests.find((item) => item.id === selectedId) || null

  const choose = (item) => {
    setSelectedId(item.id)
    setStatus(item.status === 'closed' ? 'closed' : 'answered')
    setResponse(item.response || '')
    setFeedback('')
  }

  const save = async () => {
    if (!selected) return
    if (response.trim().length < 2) {
      setFeedback('Escreva uma resposta antes de concluir o atendimento.')
      return
    }

    setSaving(true)
    setFeedback('')
    try {
      await adminRespondSupportRequest(selected.id, { status, response })
      setFeedback(`Atendimento ${protocolLabel(selected.protocol || selected.id)} atualizado.`)
    } catch (error) {
      setFeedback(error?.message || 'Não foi possível atualizar o atendimento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden" padding={false}>
      <div className="border-b border-[--border-subtle] bg-[--bg-subtle] p-4">
        <div className="flex items-center gap-2">
          <MessageSquareText size={16} className="text-[--brand-600]" />
          <h2 className="text-sm font-black text-[--text-primary]">Atendimentos</h2>
          <span className="text-xs text-[--text-tertiary]">({requests.length})</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-h-[360px] space-y-2 overflow-y-auto">
          {requests.length === 0 ? (
            <p className="text-xs text-[--text-tertiary]">Nenhuma solicitação registrada.</p>
          ) : (
            requests.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => choose(item)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedId === item.id
                    ? 'border-[--brand-400] bg-[--brand-50]'
                    : 'border-[--border-default]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black text-[--text-brand]">
                    {protocolLabel(item.protocol || item.id)}
                  </span>
                  <span className="text-[10px] text-[--text-tertiary]">{item.status}</span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-[--text-primary]">
                  {item.subject}
                </p>
                <p className="mt-1 truncate text-[10px] text-[--text-tertiary]">{item.email}</p>
              </button>
            ))
          )}
        </div>

        <div>
          {!selected ? (
            <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[--border-default] p-4 text-center text-xs text-[--text-tertiary]">
              Selecione uma solicitação para responder.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[--border-default] p-3">
                <p className="text-xs font-black text-[--text-primary]">{selected.subject}</p>
                <p className="mt-1 text-[10px] text-[--text-tertiary]">
                  {selected.email} · {selected.category}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-[--text-secondary]">
                  {selected.message}
                </p>
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary]"
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <textarea
                value={response}
                maxLength={4000}
                onChange={(event) => setResponse(event.target.value)}
                rows={5}
                placeholder="Resposta que ficará disponível ao usuário."
                className="w-full resize-y rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 py-2.5 text-sm text-[--text-primary]"
              />

              <Button fullWidth loading={saving} onClick={save}>
                Salvar resposta
              </Button>
            </div>
          )}

          {feedback && (
            <p className="mt-3 rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-secondary]">
              {feedback}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
