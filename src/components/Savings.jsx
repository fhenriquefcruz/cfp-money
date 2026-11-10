import React, { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Paperclip, Search, Trash2 } from 'lucide-react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useGoals, useTransactions } from '../contexts/AppContext'
import { Button, Card, EmptyState, Modal } from './ui'
import TransactionForm from './TransactionForm'
import TransactionAttachmentManager from './TransactionAttachmentManager'
import {
  buildSavingsOverview,
  getSavingsDestinationLabel,
  getUnclassifiedSavingsTransactions,
  getSavingsSignedAmount,
  UNCLASSIFIED_SAVINGS_DESTINATION,
} from '../domain/savings'
import { buildSavingsInsights } from '../domain/savingsInsights'
import {
  buildSavingsHistory,
  getSavingsHistoryDestinations,
  savingsMovementDate,
  SAVINGS_HISTORY_PAGE_SIZE,
} from '../domain/savingsHistory'
import {
  getFinancialActivityDate,
  isFinanciallyEffectiveTransaction,
  summarizeTransactions,
} from '../domain/finance'
import { formatCurrency, formatDate } from '../utils'

const currentMonthBounds = () => {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

const historyMonthLabel = (month) => {
  if (!month) return 'Data não informada'
  const [year, number] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(year, number - 1, 1),
  )
}

export default function Savings() {
  const { transactions, removeTransaction } = useTransactions()
  const { goals } = useGoals()
  const [movementPreset, setMovementPreset] = useState(null)
  const [editingMovement, setEditingMovement] = useState(null)
  const [deleteMovement, setDeleteMovement] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [attachmentMovement, setAttachmentMovement] = useState(null)
  const [historyType, setHistoryType] = useState('all')
  const [historyDestination, setHistoryDestination] = useState('all')
  const [historySearch, setHistorySearch] = useState('')
  const [historyWithAttachments, setHistoryWithAttachments] = useState(false)
  const [historyLimit, setHistoryLimit] = useState(SAVINGS_HISTORY_PAGE_SIZE)

  const monthBounds = useMemo(currentMonthBounds, [])

  const overview = useMemo(
    () => buildSavingsOverview(transactions, monthBounds),
    [transactions, monthBounds],
  )

  const monthSummary = useMemo(() => {
    const periodTransactions = transactions.filter((transaction) => {
      if (!isFinanciallyEffectiveTransaction(transaction)) return false
      const date = getFinancialActivityDate(transaction)
      return date >= monthBounds.start && date <= monthBounds.end
    })
    return summarizeTransactions(periodTransactions)
  }, [transactions, monthBounds])

  const savingsRate = monthSummary.income > 0 ? (overview.periodNet / monthSummary.income) * 100 : 0

  const savingsInsights = useMemo(
    () => buildSavingsInsights(transactions, goals),
    [transactions, goals],
  )
  const institutionOverview = savingsInsights.institutions
  const balanceHistory = savingsInsights.history
  const activeGoalProjections = savingsInsights.projections
  const historyMax = Math.max(0, ...balanceHistory.map((point) => point.balance))
  const patrimonyChange =
    (balanceHistory[balanceHistory.length - 1]?.balance || 0) - (balanceHistory[0]?.balance || 0)

  const historyDestinations = useMemo(
    () => getSavingsHistoryDestinations(transactions),
    [transactions],
  )
  const savingsHistory = useMemo(
    () =>
      buildSavingsHistory(transactions, {
        type: historyType,
        destination: historyDestination,
        search: historySearch,
        attachmentsOnly: historyWithAttachments,
        limit: historyLimit,
      }),
    [
      transactions,
      historyType,
      historyDestination,
      historySearch,
      historyWithAttachments,
      historyLimit,
    ],
  )

  const legacyUnclassified = useMemo(
    () => getUnclassifiedSavingsTransactions(transactions),
    [transactions],
  )
  const legacyUnclassifiedCount = legacyUnclassified.length

  const goalById = useMemo(() => new Map(goals.map((goal) => [goal.id, goal])), [goals])

  const openMovement = (movement, destination = null) => {
    setMovementPreset({
      movement,
      destination: destination?.destination || '',
      institution: destination?.institution || '',
      goalId: destination?.goalIds?.length === 1 ? destination.goalIds[0] : '',
    })
  }

  return (
    <div className="savings-premium mx-auto w-full max-w-7xl space-y-5 pb-24 lg:pb-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[--text-primary] sm:text-3xl">
            Seu dinheiro guardado, em um só lugar
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[--text-tertiary]">
            Acompanhe quanto está reservado, onde o dinheiro está e quais metas cada reserva ajuda a
            financiar.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          <Button
            variant="secondary"
            icon={<ArrowDownRight size={15} />}
            onClick={() => openMovement('withdrawal')}
          >
            Registrar retirada
          </Button>
          <Button
            variant="primary"
            icon={<ArrowUpRight size={15} />}
            onClick={() => openMovement('deposit')}
          >
            Guardar dinheiro
          </Button>
        </div>
      </header>

      {legacyUnclassifiedCount > 0 && (
        <Card className="border border-[--brand-200] bg-[--brand-50]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm font-bold text-[--text-primary]">
                  {legacyUnclassifiedCount} movimento{legacyUnclassifiedCount === 1 ? '' : 's'}{' '}
                  antigo
                  {legacyUnclassifiedCount === 1 ? '' : 's'} sem destino
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">
                  Nada foi perdido. Esses valores aparecem como “{UNCLASSIFIED_SAVINGS_DESTINATION}”
                  até serem classificados.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setEditingMovement(legacyUnclassified[0])}
            >
              Classificar agora
            </Button>
          </div>
        </Card>
      )}

      <section className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total reservado', overview.totalBalance, 'Saldo atual de todas as reservas.'],
          ['Poupado no mês', overview.periodNet, 'Aportes menos retiradas no mês atual.'],
          ['Aportes no mês', overview.periodDeposits, 'Valores guardados no mês atual.'],
          ['Retiradas no mês', overview.periodWithdrawals, 'Valores retirados no mês atual.'],
        ].map(([label, value, helper]) => (
          <Card key={label} variant={label === 'Total reservado' ? 'elevated' : 'default'}>
            <p className="text-xs font-semibold text-[--text-tertiary]">{label}</p>
            <p className="mt-2 text-xl font-black tabular-nums text-[--text-primary] sm:text-2xl">
              {formatCurrency(value)}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">{helper}</p>
          </Card>
        ))}
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <Card variant="elevated">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[--text-primary]">
                Evolução do patrimônio reservado
              </h2>
            </div>
            <p
              className={`text-sm font-black tabular-nums ${patrimonyChange >= 0 ? 'text-[--success-text]' : 'text-[--danger-text]'}`}
            >
              {patrimonyChange >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(patrimonyChange))}
            </p>
          </div>
          {historyMax > 0 ? (
            <div className="mt-4 grid grid-cols-6 gap-2">
              {balanceHistory.map((point) => (
                <div key={point.monthKey} className="text-center">
                  <div className="flex h-20 items-end rounded-lg bg-[--bg-subtle]">
                    <div
                      className="w-full rounded-lg bg-[--brand-500]"
                      style={{ height: `${Math.max(6, (point.balance / historyMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[--text-tertiary]">{point.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-[--text-tertiary]">
              Os primeiros aportes formarão esta evolução.
            </p>
          )}
          <p className="mt-3 text-[10px] text-[--text-tertiary]">
            Ritmo de poupança do mês:{' '}
            {savingsRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </p>
        </Card>

        <Card>
          <h2 className="text-base font-black text-[--text-primary]">Patrimônio por instituição</h2>
          {institutionOverview.length === 0 ? (
            <p className="py-8 text-sm text-[--text-tertiary]">Nenhuma instituição informada.</p>
          ) : (
            <div className="mt-4 divide-y divide-[--border-subtle]">
              {institutionOverview.slice(0, 5).map((institution) => (
                <div
                  key={institution.institution}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="truncate text-xs font-bold text-[--text-primary]">
                    {institution.institution}
                  </span>
                  <span className="flex-shrink-0 text-xs font-black tabular-nums text-[--text-primary]">
                    {formatCurrency(institution.balance)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card>
        <h2 className="text-base font-black text-[--text-primary]">Projeção das metas</h2>
        <p className="mt-1 text-xs text-[--text-tertiary]">
          Estimativa pelo ritmo líquido dos últimos 3 meses.
        </p>
        {activeGoalProjections.length === 0 ? (
          <p className="mt-4 text-xs text-[--text-tertiary]">
            {goals.length
              ? 'Todas as metas estão concluídas.'
              : 'Vincule aportes a metas para gerar projeções.'}
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[--border-subtle]">
            {activeGoalProjections.map((projection) => (
              <div
                key={projection.goalId}
                className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="truncate text-xs font-bold text-[--text-primary]">
                  {projection.emoji} {projection.name}
                </span>
                <span className="text-[10px] text-[--text-tertiary] sm:text-right">
                  {projection.monthlyPace > 0
                    ? `${formatCurrency(projection.monthlyPace)}/mês · ~${projection.projectedMonths} meses`
                    : 'Sem ritmo recente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section className="grid min-w-0 grid-cols-1 gap-5">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[--text-primary]">Onde estou poupando</h2>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Distribuição atual por reserva e instituição.
              </p>
            </div>
          </div>

          {overview.destinations.length === 0 ? (
            <EmptyState
              icon="🐷"
              title="Nenhuma reserva registrada"
              description="Guarde seu primeiro valor e informe onde esse dinheiro ficará."
              action={
                <Button onClick={() => openMovement('deposit')} size="sm">
                  Guardar dinheiro
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overview.destinations.map((destination) => {
                return (
                  <article
                    key={destination.label}
                    className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[--text-primary]">
                          {destination.destination}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[--text-tertiary]">
                          {destination.institution || 'Instituição não informada'}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-black tabular-nums text-[--text-primary]">
                          {formatCurrency(destination.balance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Retirar de ${destination.destination}`}
                        onClick={() => openMovement('withdrawal', destination)}
                      >
                        Retirar
                      </Button>
                      <Button
                        size="sm"
                        aria-label={`Guardar em ${destination.destination}`}
                        onClick={() => openMovement('deposit', destination)}
                      >
                        Guardar
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-black text-[--text-primary]">Histórico das reservas</h2>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Consulte aportes, retiradas, destino, instituição e comprovantes do lançamento.
              </p>
            </div>
            <span className="text-xs font-bold tabular-nums text-[--text-secondary]">
              {savingsHistory.total} {savingsHistory.total === 1 ? 'movimento' : 'movimentos'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_minmax(190px,0.85fr)]">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-[--text-secondary]">Buscar</span>
              <span className="flex min-h-11 items-center gap-2 rounded-xl border border-[--border-default] bg-[--bg-subtle] px-3 focus-within:border-[--brand-500]">
                <Search size={15} className="shrink-0 text-[--text-tertiary]" aria-hidden="true" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(event) => {
                    setHistorySearch(event.target.value)
                    setHistoryLimit(SAVINGS_HISTORY_PAGE_SIZE)
                  }}
                  placeholder="Descrição, reserva ou banco"
                  className="w-full min-w-0 bg-transparent text-sm text-[--text-primary] outline-none placeholder:text-[--text-tertiary]"
                />
              </span>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-[--text-secondary]">Tipo</span>
              <select
                value={historyType}
                onChange={(event) => {
                  setHistoryType(event.target.value)
                  setHistoryLimit(SAVINGS_HISTORY_PAGE_SIZE)
                }}
                className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-subtle] px-3 text-sm text-[--text-primary] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--brand-500]"
              >
                <option value="all">Todos os tipos</option>
                <option value="deposit">Aportes</option>
                <option value="withdrawal">Retiradas</option>
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-semibold text-[--text-secondary]">Reserva / instituição</span>
              <select
                value={historyDestination}
                onChange={(event) => {
                  setHistoryDestination(event.target.value)
                  setHistoryLimit(SAVINGS_HISTORY_PAGE_SIZE)
                }}
                className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-subtle] px-3 text-sm text-[--text-primary] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--brand-500]"
              >
                <option value="all">Todas as reservas</option>
                {historyDestinations.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-xs font-medium text-[--text-secondary]">
              <input
                type="checkbox"
                checked={historyWithAttachments}
                onChange={(event) => {
                  setHistoryWithAttachments(event.target.checked)
                  setHistoryLimit(SAVINGS_HISTORY_PAGE_SIZE)
                }}
                className="h-4 w-4 accent-[--brand-500]"
              />
              <Paperclip size={14} aria-hidden="true" />
              Somente com comprovante
            </label>
            <span className="text-xs tabular-nums text-[--text-tertiary]">
              Exibindo {savingsHistory.shown} de {savingsHistory.total}
            </span>
          </div>

          {savingsHistory.total === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[--border-default] px-4 py-10 text-center">
              <p className="text-sm text-[--text-tertiary]">
                Nenhum movimento encontrado para os filtros selecionados.
              </p>
              <button
                type="button"
                className="mt-3 min-h-10 rounded-xl px-3 text-xs font-bold text-[--text-brand] hover:bg-[--bg-hover]"
                onClick={() => {
                  setHistoryType('all')
                  setHistoryDestination('all')
                  setHistorySearch('')
                  setHistoryWithAttachments(false)
                  setHistoryLimit(SAVINGS_HISTORY_PAGE_SIZE)
                }}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {savingsHistory.groups.map((group) => (
                <section key={group.month || 'no-date'} aria-label={historyMonthLabel(group.month)}>
                  <h3 className="border-b border-[--border-default] pb-2 text-xs font-black capitalize text-[--text-secondary]">
                    {historyMonthLabel(group.month)}
                  </h3>
                  <div className="divide-y divide-[--border-subtle]">
                    {group.movements.map((movement) => {
                      const amount = getSavingsSignedAmount(movement)
                      const deposit = amount > 0
                      const goal = movement.goalId ? goalById.get(movement.goalId) : null
                      const files = Array.isArray(movement.attachments)
                        ? movement.attachments.length
                        : 0
                      const name =
                        movement.description ||
                        getSavingsDestinationLabel(movement)
                      const date = savingsMovementDate(movement)
                      const unclassified = !String(movement.savingsDestination || '').trim()
                      return (
                        <article key={movement.id} className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span
                              className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${deposit ? 'bg-[--success-bg] text-[--success-text]' : 'bg-[--danger-bg] text-[--danger-text]'}`}
                              aria-hidden="true"
                            >
                              {deposit ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                            </span>
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold text-[--text-primary]">{name}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[--text-tertiary]">
                                <span className={deposit ? 'font-semibold text-[--success-text]' : 'font-semibold text-[--danger-text]'}>
                                  {deposit ? 'Aporte' : 'Retirada'}
                                </span>
                                <span className={unclassified ? 'text-[--warning-text]' : ''}>
                                  {getSavingsDestinationLabel(movement)}
                                </span>
                                {goal && <span>Meta: {goal.name}</span>}
                                <time>{date ? formatDate(date) : 'Data não informada'}</time>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
                            <span className={`mr-auto text-sm font-black tabular-nums sm:mr-2 ${deposit ? 'text-[--success-text]' : 'text-[--danger-text]'}`}>
                              {deposit ? '+' : '−'}{formatCurrency(Math.abs(amount))}
                            </span>
                            {files > 0 && (
                              <button
                                type="button"
                                onClick={() => setAttachmentMovement(movement)}
                                className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[--border-default] bg-[--bg-subtle] px-3 text-xs font-bold text-[--text-brand] hover:bg-[--bg-hover] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--brand-500]"
                                aria-label={`Ver ${files} ${files === 1 ? 'comprovante' : 'comprovantes'} de ${name}`}
                                title="Visualizar comprovantes"
                              >
                                <Paperclip size={15} aria-hidden="true" />
                                {files}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingMovement(movement)}
                              className="min-h-10 rounded-xl px-3 text-xs font-bold text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
                              aria-label={`${unclassified ? 'Classificar' : 'Editar'} movimento ${name}`}
                            >
                              {unclassified ? 'Classificar' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteMovement(movement)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--danger-bg] hover:text-[--danger-text]"
                              aria-label={`Excluir movimento ${name}`}
                              title="Excluir movimento"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
              {savingsHistory.shown < savingsHistory.total && (
                <div className="text-center">
                  <Button
                    variant="secondary"
                    onClick={() => setHistoryLimit((current) => current + SAVINGS_HISTORY_PAGE_SIZE)}
                  >
                    Mostrar mais movimentos
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {movementPreset && (
        <TransactionForm
          isOpen
          transaction={null}
          onClose={() => setMovementPreset(null)}
          initialType="savings"
          initialSavingsMovement={movementPreset.movement}
          initialSavingsDestination={movementPreset.destination}
          initialSavingsInstitution={movementPreset.institution}
          initialGoalId={movementPreset.goalId}
        />
      )}

      {attachmentMovement && (
        <TransactionAttachmentManager
          transaction={attachmentMovement}
          isOpen
          readOnly
          title="Comprovantes da reserva"
          onClose={() => setAttachmentMovement(null)}
        />
      )}

      {editingMovement && (
        <TransactionForm
          isOpen
          transaction={editingMovement}
          onClose={() => setEditingMovement(null)}
        />
      )}

      <Modal
        isOpen={Boolean(deleteMovement)}
        onClose={() => setDeleteMovement(null)}
        title="Excluir movimento da reserva"
      >
        {deleteMovement && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-4">
              <p className="text-sm font-bold text-[--danger-text]">
                Excluir “{deleteMovement.description || getSavingsDestinationLabel(deleteMovement)}
                ”?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[--danger-text]">
                Este lançamento será removido do histórico e o saldo da reserva será recalculado.
                Outros aportes e retiradas permanecem preservados.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" fullWidth onClick={() => setDeleteMovement(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                className="bg-[--danger-icon] hover:opacity-90"
                loading={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true)
                  try {
                    await removeTransaction(deleteMovement.id)
                    setDeleteMovement(null)
                  } finally {
                    setDeleteLoading(false)
                  }
                }}
              >
                Excluir movimento
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
