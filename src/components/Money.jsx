import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  FileText,
  ArrowRight,
  Info,
  CalendarRange,
  Tags,
  BarChart3,
  Crown,
  CreditCard,
  Settings2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useMoney } from '../contexts/MoneyContext'
import { analyzeMoney } from '../domain/money'
import { buildMoneyAssistantResponse } from '../domain/moneyAssistant'
import { buildMoneyTransactionDraft } from '../domain/moneyTransactionDraft'
import { buildMoneyCreditDraft } from '../domain/moneyCreditDraft'
import { buildCreditTransaction, buildInstallmentTransactions } from '../domain/creditCards'
import { formatCurrency } from '../utils'
import { Card, Button, Modal } from './ui'
import MoneySettingsCard from './MoneySettingsCard'
import TelegramIntegrationRouter from './TelegramIntegrationRouter'
import PremiumGate from './PremiumGate'
import MoneyTransactionAction from './MoneyTransactionAction'
import MoneyCreditTransactionAction from './MoneyCreditTransactionAction'

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  response: {
    type: 'help',
    title: 'Olá, eu sou o Money',
    text: 'Posso consultar seus dados e preparar receitas, despesas e compras no cartão. Todo lançamento aparece como rascunho editável e só é salvo após sua confirmação.',
    suggestions: [
      'Comprei 600 no Nubank em 3 vezes no mercado',
      'Paguei 180 no dentista por Pix ontem',
      'Como estão minhas finanças?',
      'Quero o relatório do mês atual',
    ],
  },
}

const MONEY_CAPABILITIES = [
  {
    icon: CreditCard,
    title: 'Cartões e parcelas',
    description: 'Calcula a primeira fatura e distribui parcelas pelos vencimentos.',
  },
  {
    icon: ShieldCheck,
    title: 'Registro com confirmação',
    description: 'Prepara um rascunho editável e só salva depois da sua autorização.',
  },
  {
    icon: BarChart3,
    title: 'Análise financeira',
    description: 'Compara períodos equivalentes e apresenta projeções de fechamento.',
  },
  {
    icon: FileText,
    title: 'Relatórios por conversa',
    description: 'Abre o mês solicitado diretamente na área de relatórios.',
  },
  {
    icon: Tags,
    title: 'Consulta por categoria',
    description: 'Responde quanto foi gasto em alimentação, transporte e outras categorias.',
  },
]

function Metric({ metric }) {
  return (
    <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[--text-tertiary]">
        {metric.label}
      </p>
      <p className="mt-1 text-sm font-black tabular-nums text-[--text-primary]">
        {metric.rawValue ?? formatCurrency(metric.value)}
      </p>
    </div>
  )
}

function AssistantResponse({
  response,
  onSuggestion,
  categories,
  creditCards,
  onConfirm,
  onCancel,
  onUndo,
  onConfirmCredit,
  onCancelCredit,
  onUndoCredit,
  busy,
}) {
  if (response.type?.startsWith('credit_')) {
    return (
      <MoneyCreditTransactionAction
        response={response}
        categories={categories}
        creditCards={creditCards}
        onConfirm={onConfirmCredit}
        onCancel={onCancelCredit}
        onUndo={onUndoCredit}
        busy={busy}
      />
    )
  }

  if (response.type?.startsWith('transaction_')) {
    return (
      <MoneyTransactionAction
        response={response}
        categories={categories}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onUndo={onUndo}
        busy={busy}
      />
    )
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-[--text-primary]">{response.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-[--text-secondary]">{response.text}</p>
        {response.secondaryText && (
          <p className="mt-2 text-xs leading-relaxed text-[--text-tertiary]">
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
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[--brand-600] px-3 text-xs font-semibold text-white transition-colors hover:bg-[--brand-700]"
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
              className="min-h-11 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-2 text-left text-xs text-[--text-secondary] transition-colors hover:border-[--brand-500] hover:text-[--text-brand]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MoneyContent() {
  const {
    transactions,
    categories,
    creditCards,
    loading,
    createTransaction,
    addTransactionBatch,
    removeTransaction,
    removeTransactionBatch,
  } = useApp()
  const { settings, isLoading: settingsLoading } = useMoney()
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const isLoading =
    loading.transactions || loading.categories || loading.creditCards || settingsLoading
  const canSend = input.trim().length > 0 && !isLoading

  const safeDataStatus = useMemo(
    () =>
      isLoading
        ? 'Carregando seus dados com segurança...'
        : `${transactions.length} lançamento${transactions.length === 1 ? '' : 's'} disponível${transactions.length === 1 ? '' : 'is'} para consulta`,
    [isLoading, transactions.length],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: 'end',
    })
  }, [messages])

  const updateAssistantMessage = (messageId, response) => {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, response } : message)),
    )
  }

  const confirmDraft = async (messageId, draft) => {
    setIsMutating(true)
    try {
      const transactionId = await createTransaction(draft)
      updateAssistantMessage(messageId, {
        type: 'transaction_created',
        transactionId,
        transaction: draft,
      })
    } catch {
      updateAssistantMessage(messageId, {
        type: 'transaction_error',
        title: 'Não foi possível salvar',
        text: 'O lançamento não foi criado. Seus dados anteriores permanecem intactos; tente novamente.',
        draft,
      })
    } finally {
      setIsMutating(false)
    }
  }

  const cancelDraft = (messageId) => {
    updateAssistantMessage(messageId, { type: 'transaction_cancelled' })
  }

  const confirmCreditDraft = async (messageId, draft) => {
    const selectedCard = creditCards.find((card) => card.id === draft.cardId)
    const selectedCategory = categories.find((category) => category.id === draft.categoryId)

    if (!selectedCard || !selectedCategory) return

    const baseData = {
      type: 'expense',
      isSavings: false,
      description: draft.description,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      categoryColor: selectedCategory.color || '',
      categoryIcon: selectedCategory.icon || '',
      paymentMethod: 'credit_card',
      notes: '',
      isRecurring: false,
      source: 'money_assistant',
    }

    setIsMutating(true)
    try {
      let transactionIds
      let createdTransactions

      if (Number(draft.installments) > 1) {
        createdTransactions = buildInstallmentTransactions({
          baseData,
          totalAmount: draft.amount,
          installments: draft.installments,
          purchaseDate: draft.purchaseDate,
          card: selectedCard,
        })
        transactionIds = await addTransactionBatch(createdTransactions)
      } else {
        const transaction = buildCreditTransaction({
          baseData,
          totalAmount: draft.amount,
          purchaseDate: draft.purchaseDate,
          card: selectedCard,
        })
        const transactionId = await createTransaction(transaction)
        transactionIds = [transactionId]
        createdTransactions = [transaction]
      }

      updateAssistantMessage(messageId, {
        type: 'credit_transaction_created',
        transactionIds,
        transactions: createdTransactions,
        originalAmount: Number(draft.amount),
      })
    } catch {
      updateAssistantMessage(messageId, {
        type: 'credit_transaction_error',
        draft,
      })
    } finally {
      setIsMutating(false)
    }
  }

  const cancelCreditDraft = (messageId) => {
    updateAssistantMessage(messageId, {
      type: 'credit_transaction_cancelled',
    })
  }

  const undoCreditPurchase = async (messageId, transactionIds) => {
    if (!transactionIds?.length) return
    setIsMutating(true)
    try {
      await removeTransactionBatch(transactionIds)
      updateAssistantMessage(messageId, {
        type: 'credit_transaction_undone',
      })
    } finally {
      setIsMutating(false)
    }
  }

  const undoTransaction = async (messageId, transactionId) => {
    if (!transactionId) return
    setIsMutating(true)
    try {
      await removeTransaction(transactionId)
      updateAssistantMessage(messageId, { type: 'transaction_undone' })
    } finally {
      setIsMutating(false)
    }
  }

  const sendMessage = (text) => {
    const normalized = text.trim()
    if (!normalized || isLoading || isMutating) return

    const creditResponse = buildMoneyCreditDraft({
      message: normalized,
      transactions,
      categories,
      creditCards,
      now: new Date(),
    })

    const transactionResponse =
      creditResponse ||
      buildMoneyTransactionDraft({
        message: normalized,
        transactions,
        categories,
        now: new Date(),
      })

    const response =
      transactionResponse ||
      buildMoneyAssistantResponse({
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-24 lg:pb-6">
      <header className="overflow-hidden rounded-3xl border border-[--brand-200] bg-gradient-to-br from-[--brand-700] via-[--brand-600] to-[--brand-500] p-4 text-white shadow-lg sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner backdrop-blur">
              <Bot size={23} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black sm:text-3xl">Money</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-900">
                  <Crown size={11} />
                  Premium
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/80">
                Seu assistente financeiro para interpretar gastos, comparar períodos e acessar
                relatórios usando linguagem natural.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[--brand-700] shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Settings2 size={14} />
              Preferências do Money
            </button>
            <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white/90 backdrop-blur">
              <ShieldCheck size={14} />
              Modo seguro
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="order-2 grid gap-4 lg:order-1 lg:max-h-[620px] lg:overflow-y-auto lg:pr-1">
          <Card className="overflow-hidden shadow-sm" padding={false}>
            <div className="border-b border-[--border-subtle] bg-[--brand-50] p-4">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[--brand-600]" />
                <h2 className="text-sm font-black text-[--text-primary]">Como funciona</h2>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-xs leading-relaxed text-[--text-secondary]">
                Escreva como falaria normalmente. O Money pode consultar seus dados ou preparar um
                lançamento simples. Antes de salvar, ele apresenta todos os campos para revisão.
              </p>
              <div className="rounded-2xl border border-[--brand-200] bg-[--brand-50] p-3">
                <p className="text-[11px] font-bold text-[--brand-700]">
                  Seus dados permanecem intactos
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[--brand-600]">
                  Consultas não alteram registros. Novas receitas e despesas só são gravadas após a
                  confirmação; depois, ainda é possível desfazer o lançamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-xs font-semibold text-[--text-primary] transition-colors hover:bg-[--bg-hover]"
              >
                <CalendarRange size={14} />
                Configurar ciclo financeiro
              </button>
            </div>
          </Card>

          <Card className="h-full overflow-hidden shadow-sm" padding={false}>
            <div className="border-b border-[--border-subtle] p-4">
              <h2 className="text-sm font-black text-[--text-primary]">O que o Money faz</h2>
              <p className="mt-1 text-[11px] text-[--text-tertiary]">
                Recursos disponíveis nesta fase
              </p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-1">
              {MONEY_CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[--text-primary]">{title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[--text-tertiary]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>

        <Card
          className="order-1 flex h-[min(620px,calc(100dvh-190px))] min-h-[480px] flex-col overflow-hidden shadow-sm lg:order-2"
          padding={false}
        >
          <div className="border-b border-[--border-subtle] bg-gradient-to-r from-[--brand-50] to-[--bg-surface] px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[--brand-600]" />
                <p className="text-xs font-semibold text-[--text-secondary]">{safeDataStatus}</p>
              </div>
              <p className="text-[10px] text-[--text-tertiary]">
                Conversa não armazenada no Firestore
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-600] text-white shadow-sm">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 sm:max-w-[78%] ${
                    message.role === 'user'
                      ? 'bg-[--brand-600] text-white shadow-sm'
                      : 'border border-[--border-default] bg-[--bg-surface] shadow-sm'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  ) : (
                    <AssistantResponse
                      response={message.response}
                      onSuggestion={sendMessage}
                      categories={categories}
                      creditCards={creditCards}
                      busy={isMutating}
                      onConfirm={(draft) => confirmDraft(message.id, draft)}
                      onCancel={() => cancelDraft(message.id)}
                      onUndo={(transactionId) => undoTransaction(message.id, transactionId)}
                      onConfirmCredit={(draft) => confirmCreditDraft(message.id, draft)}
                      onCancelCredit={() => cancelCreditDraft(message.id)}
                      onUndoCredit={(transactionIds) =>
                        undoCreditPurchase(message.id, transactionIds)
                      }
                    />
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[--bg-hover] text-[--text-secondary]">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-[--border-subtle] bg-[--bg-surface] p-3 sm:p-4"
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
                disabled={isLoading || isMutating}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    if (canSend) sendMessage(input)
                  }
                }}
                placeholder="Ex.: Comprei R$ 600 no Nubank em 3 vezes"
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
            <p className="mt-2 text-[10px] leading-relaxed text-[--text-tertiary]">
              Pressione Enter para enviar ou Shift + Enter para quebrar a linha. Receitas, despesas,
              cartões e parcelas passam por revisão antes de serem salvos.
            </p>
          </form>
        </Card>
      </div>

      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Preferências do Money"
        size="lg"
        closeOnBackdrop={false}
      >
        <div className="space-y-4">
          <MoneySettingsCard />
          <TelegramIntegrationRouter />
        </div>
      </Modal>
    </div>
  )
}

export default function Money() {
  return (
    <PremiumGate
      feature="Money — seu assistente financeiro"
      description="Converse com seus dados financeiros, consulte relatórios e receba análises personalizadas sem sair do Meu Real."
      benefits={[
        'Compras no cartão e parcelamentos',
        'Registro com confirmação',
        'Assistente financeiro conversacional',
        'Consultas por mês e categoria',
      ]}
    >
      <MoneyContent />
    </PremiumGate>
  )
}
