import React, { useMemo, useRef, useState } from 'react'
import { Bot, Send, ShieldCheck, Sparkles, User, FileText, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useMoney } from '../contexts/MoneyContext'
import { analyzeMoney } from '../domain/money'
import { buildMoneyAssistantResponse } from '../domain/moneyAssistant'
import { formatCurrency } from '../utils'
import { Card, Button } from './ui'

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  response: {
    type: 'help',
    title: 'Olá, eu sou o Money',
    text:
      'Posso analisar seu período financeiro, consultar gastos por categoria e preparar relatórios mensais. Nesta fase, apenas leio seus dados: nenhum lançamento será alterado.',
    suggestions: [
      'Como estão minhas finanças?',
      'Quero o relatório do mês atual',
      'Quero o relatório do mês passado',
      'Quanto gastei com alimentação este mês?',
    ],
  },
}

function Metric({ metric }) {
  return (
    <div className="rounded-xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[--text-tertiary]">{metric.label}</p>
      <p className="text-sm font-black text-[--text-primary] mt-0.5">
        {metric.rawValue ?? formatCurrency(metric.value)}
      </p>
    </div>
  )
}

function AssistantResponse({ response, onSuggestion }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-[--text-primary]">{response.title}</p>
        <p className="text-sm leading-relaxed text-[--text-secondary] mt-1">{response.text}</p>
        {response.secondaryText && (
          <p className="text-xs leading-relaxed text-[--text-tertiary] mt-2">
            {response.secondaryText}
          </p>
        )}
      </div>

      {response.metrics?.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {response.metrics.map((metric) => (
            <Metric key={metric.label} metric={metric} />
          ))}
        </div>
      )}

      {response.periodLabel && (
        <p className="text-[11px] text-[--text-tertiary]">Período: {response.periodLabel}</p>
      )}

      {response.reportMonth && (
        <Link
          to={`/reports?month=${response.reportMonth}`}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[--brand-600] px-3 text-xs font-semibold text-white hover:bg-[--brand-700]"
        >
          <FileText size={14} />
          Abrir relatório completo
          <ArrowRight size={13} />
        </Link>
      )}

      {response.suggestions?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {response.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="min-h-11 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-2 text-left text-xs text-[--text-secondary] hover:border-[--brand-500] hover:text-[--text-brand]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Money() {
  const { transactions, categories, loading } = useApp()
  const { settings, isLoading: settingsLoading } = useMoney()
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const isLoading = loading.transactions || loading.categories || settingsLoading
  const canSend = input.trim().length > 0 && !isLoading

  const safeDataStatus = useMemo(
    () =>
      isLoading
        ? 'Carregando seus dados com segurança...'
        : `${transactions.length} lançamento${transactions.length === 1 ? '' : 's'} disponível${transactions.length === 1 ? '' : 'is'} para consulta`,
    [isLoading, transactions.length],
  )

  const sendMessage = (text) => {
    const normalized = text.trim()
    if (!normalized || isLoading) return

    const response = buildMoneyAssistantResponse({
      message: normalized,
      transactions,
      categories,
      settings,
      now: new Date(),
      analyze: analyzeMoney,
    })

    const timestamp = Date.now()
    setMessages((current) => [
      ...current,
      { id: `user-${timestamp}`, role: 'user', text: normalized },
      { id: `assistant-${timestamp}`, role: 'assistant', response },
    ])
    setInput('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-24 lg:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[--brand-600] text-white">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[--text-primary]">Money</h1>
            <p className="text-xs text-[--text-tertiary]">
              Seu assistente financeiro dentro do Meu Real
            </p>
          </div>
        </div>
        <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[--success-border] bg-[--success-bg] px-3 text-xs text-[--success-text]">
          <ShieldCheck size={14} />
          Modo seguro: somente consulta
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[--border-subtle] bg-[--bg-subtle] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[--brand-600]" />
              <p className="text-xs font-semibold text-[--text-secondary]">{safeDataStatus}</p>
            </div>
            <Link to="/profile" className="text-xs text-[--text-brand] hover:underline">
              Configurar ciclo
            </Link>
          </div>
        </div>

        <div className="min-h-[420px] space-y-4 p-4 sm:p-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-3 sm:max-w-[78%] ${
                  message.role === 'user'
                    ? 'bg-[--brand-600] text-white'
                    : 'border border-[--border-default] bg-[--bg-surface]'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm leading-relaxed">{message.text}</p>
                ) : (
                  <AssistantResponse response={message.response} onSuggestion={sendMessage} />
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[--bg-hover] text-[--text-secondary]">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-[--border-subtle] bg-[--bg-surface] p-3 sm:p-4"
        >
          <div className="flex items-end gap-2">
            <label htmlFor="money-message" className="sr-only">
              Fale com o Money
            </label>
            <textarea
              ref={inputRef}
              id="money-message"
              rows="1"
              value={input}
              disabled={isLoading}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (canSend) sendMessage(input)
                }
              }}
              placeholder="Ex.: Money, quero o relatório de abril"
              className="min-h-12 max-h-32 flex-1 resize-y rounded-2xl border border-[--border-default] bg-[--bg-elevated] px-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] disabled:opacity-60"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!canSend}
              aria-label="Enviar mensagem ao Money"
              className="h-12 w-12 flex-shrink-0 p-0"
            >
              <Send size={17} />
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-[--text-tertiary]">
            O histórico desta conversa permanece apenas nesta tela e não altera seus registros.
          </p>
        </form>
      </Card>
    </div>
  )
}
