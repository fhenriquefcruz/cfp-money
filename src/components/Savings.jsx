import React, { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  Landmark,
  PiggyBank,
  Target,
  Trash2,
} from 'lucide-react'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useGoals, useTransactions } from '../contexts/AppContext'
import { Button, Card, EmptyState, Modal, ProgressBar } from './ui'
import TransactionForm from './TransactionForm'
import {
  buildSavingsOverview,
  getSavingsDestinationLabel,
  getUnclassifiedSavingsTransactions,
  getSavingsSignedAmount,
  UNCLASSIFIED_SAVINGS_DESTINATION,
} from '../domain/savings'
import { buildSavingsInsights } from '../domain/savingsInsights'
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

const transactionDate = (transaction) =>
  transaction.purchaseDate ||
  transaction.originalPurchaseDate ||
  transaction.date ||
  transaction.dueDate ||
  ''

export default function Savings() {
  const { transactions, removeTransaction } = useTransactions()
  const { goals } = useGoals()
  const [movementPreset, setMovementPreset] = useState(null)
  const [editingMovement, setEditingMovement] = useState(null)
  const [deleteMovement, setDeleteMovement] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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

  const movements = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.isSavings && getSavingsSignedAmount(transaction) !== 0)
        .sort((first, second) => transactionDate(second).localeCompare(transactionDate(first))),
    [transactions],
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
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[--brand-200] bg-[--brand-50] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[--brand-700]">
            <PiggyBank size={13} />
            Poupança e Reservas
          </div>
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
              <div className="rounded-xl bg-[--bg-surface] p-2 text-[--brand-700]">
                <Landmark size={16} />
              </div>
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

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card variant="elevated">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History size={17} className="text-[--brand-600]" />
                <h2 className="text-base font-black text-[--text-primary]">
                  Evolução do patrimônio reservado
                </h2>
              </div>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Saldo acumulado das reservas ao fim de cada mês, considerando aportes e retiradas.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-[--text-tertiary]">Variação em 6 meses</p>
              <p className={`mt-1 text-lg font-black tabular-nums ${patrimonyChange >= 0 ? 'text-[--success-text]' : 'text-[--danger-text]'}`}>
                {patrimonyChange >= 0 ? '+' : '−'}{formatCurrency(Math.abs(patrimonyChange))}
              </p>
              <p className="text-[10px] text-[--text-tertiary]">
                Ritmo do mês: {savingsRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </p>
            </div>
          </div>

          {historyMax > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6" role="img" aria-label="Evolução do patrimônio reservado nos últimos seis meses">
              {balanceHistory.map((point) => (
                <div key={point.monthKey} className="min-w-0 text-center">
                  <div className="flex h-24 items-end overflow-hidden rounded-xl bg-[--bg-subtle]" title={formatCurrency(point.balance)}>
                    <div
                      className="w-full rounded-xl bg-[--brand-500]"
                      style={{ height: `${Math.max(6, (point.balance / historyMax) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-[--text-tertiary]">{point.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-[--border-subtle] bg-[--bg-subtle] px-4 py-8 text-center text-xs text-[--text-tertiary]">
              Os primeiros aportes vão formar automaticamente esta evolução.
            </p>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[--text-primary]">Patrimônio por instituição</h2>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Onde o dinheiro reservado está concentrado hoje.
              </p>
            </div>
            <Landmark size={18} className="flex-shrink-0 text-[--brand-600]" />
          </div>

          {institutionOverview.length === 0 ? (
            <p className="py-10 text-center text-sm text-[--text-tertiary]">
              Informe a instituição ao guardar dinheiro para ver a consolidação.
            </p>
          ) : (
            <div className="space-y-4">
              {institutionOverview.slice(0, 6).map((institution) => (
                <article key={institution.institution}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[--text-primary]">
                        {institution.institution}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                        {institution.destinationCount} destino
                        {institution.destinationCount === 1 ? '' : 's'} vinculado
                        {institution.destinationCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums text-[--text-primary]">
                        {formatCurrency(institution.balance)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                        {institution.share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[--bg-hover]">
                    <div
                      className="h-full rounded-full bg-[--brand-500]"
                      style={{ width: `${Math.min(100, Math.max(0, institution.share))}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target size={17} className="text-[--brand-600]" />
              <h2 className="text-base font-black text-[--text-primary]">Projeção das metas</h2>
            </div>
            <p className="mt-1 text-xs text-[--text-tertiary]">
              Ritmo líquido real dos últimos três meses. É uma estimativa, não uma promessa.
            </p>
          </div>
        </div>

        {activeGoalProjections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[--border-subtle] bg-[--bg-subtle] px-4 py-8 text-center text-xs text-[--text-tertiary]">
            {goals.length > 0 ? 'Todas as metas estão concluídas.' : 'Vincule aportes a metas para gerar projeções.'}
          </p>
        ) : (
          <div className="divide-y divide-[--border-subtle]">
            {activeGoalProjections.map((projection) => (
              <article key={projection.goalId} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-[--text-primary]">
                      {projection.emoji} {projection.name}
                    </p>
                    <span className={`text-[10px] font-bold ${projection.status === 'behind' ? 'text-[--warning-icon]' : projection.status === 'on-track' ? 'text-[--success-text]' : 'text-[--text-tertiary]'}`}>
                      {projection.status === 'behind' ? 'Abaixo do prazo' : projection.status === 'on-track' ? 'No ritmo' : projection.status === 'no-pace' ? 'Sem ritmo recente' : 'Ritmo atual'}
                    </span>
                  </div>
                  <div className="mt-2"><ProgressBar value={projection.current} max={projection.target} /></div>
                  <p className="mt-1 text-[10px] text-[--text-tertiary]">
                    {formatCurrency(projection.current)} de {formatCurrency(projection.target)}
                  </p>
                </div>
                <div className="text-left sm:min-w-40 sm:text-right">
                  <p className="text-xs font-black text-[--text-primary]">
                    {projection.monthlyPace > 0 ? `${formatCurrency(projection.monthlyPace)}/mês` : 'Sem aporte líquido'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                    {projection.projectedMonths ? `Chegada em ~${projection.projectedMonths} meses` : 'Ainda sem projeção'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[--text-primary]">Onde estou poupando</h2>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Distribuição atual por reserva e instituição.
              </p>
            </div>
            <Landmark size={18} className="flex-shrink-0 text-[--brand-600]" />
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
            <div className="space-y-3">
              {overview.destinations.map((destination) => {
                const share =
                  overview.totalBalance > 0
                    ? (destination.balance / overview.totalBalance) * 100
                    : 0
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
                        <p className="text-[10px] text-[--text-tertiary]">
                          {share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das
                          reservas
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[--bg-hover]">
                      <div
                        className="h-full rounded-full bg-[--brand-500]"
                        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                      />
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
          <div className="mb-4 flex items-center gap-2">
            <History size={17} className="text-[--brand-600]" />
            <div>
              <h2 className="text-base font-black text-[--text-primary]">Movimentos recentes</h2>
              <p className="mt-0.5 text-xs text-[--text-tertiary]">
                Histórico de aportes e retiradas das reservas.
              </p>
            </div>
          </div>

          {movements.length === 0 ? (
            <p className="py-10 text-center text-sm text-[--text-tertiary]">
              Nenhum movimento de poupança registrado.
            </p>
          ) : (
            <div className="divide-y divide-[--border-subtle]">
              {movements.slice(0, 12).map((movement) => {
                const signedAmount = getSavingsSignedAmount(movement)
                const linkedGoal = movement.goalId ? goalById.get(movement.goalId) : null
                return (
                  <div
                    key={movement.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className={`mt-0.5 rounded-xl p-2 ${
                        signedAmount >= 0
                          ? 'bg-[--success-bg] text-[--success-text]'
                          : 'bg-[--danger-bg] text-[--danger-text]'
                      }`}
                    >
                      {signedAmount >= 0 ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[--text-primary]">
                        {getSavingsDestinationLabel(movement)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[--text-tertiary]">
                        {movement.description || (signedAmount >= 0 ? 'Aporte' : 'Retirada')}
                        {linkedGoal ? ` · ${linkedGoal.emoji || '🎯'} ${linkedGoal.name}` : ''}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                        {formatDate(transactionDate(movement))}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span
                        className={`text-xs font-black tabular-nums ${
                          signedAmount >= 0 ? 'text-[--success-text]' : 'text-[--danger-text]'
                        }`}
                      >
                        {signedAmount >= 0 ? '+' : '−'}
                        {formatCurrency(Math.abs(signedAmount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingMovement(movement)}
                        className="min-h-9 rounded-xl px-2 text-[10px] font-bold text-[--text-tertiary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
                        aria-label={`Editar movimento ${
                          movement.description || getSavingsDestinationLabel(movement)
                        }`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteMovement(movement)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[--text-tertiary] transition-colors hover:bg-[--danger-bg] hover:text-[--danger-text]"
                        aria-label={`Excluir movimento ${
                          movement.description || getSavingsDestinationLabel(movement)
                        }`}
                        title="Excluir movimento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
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
