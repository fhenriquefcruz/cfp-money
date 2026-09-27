// src/components/Goals.jsx
import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Edit2,
  Trash2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useGoals } from '../contexts/AppContext'
import { Card, Button, Input, Modal, ProgressBar, EmptyState } from './ui'
import { formatCurrency, formatDate } from '../utils'
import InfoTooltip from './InfoTooltip'
import { buildGoalPlan, buildGoalsOverview } from '../domain/goalPlanning'

const EMOJI_LIST = [
  '🏠',
  '🚗',
  '✈️',
  '🎓',
  '💼',
  '🏦',
  '🎯',
  '💎',
  '🌈',
  '🔥',
  '⚡',
  '🌟',
  '🎉',
  '💰',
  '📈',
]

function GoalMenu({ goal, onContribute, onEdit, onDelete }) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="p-1.5 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] transition-colors"
        title="Ações"
      >
        ⋮
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-50 min-w-[140px] bg-[--bg-elevated] border border-[--border-default] rounded-xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onContribute(goal)
              setOpen(false)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
          >
            <TrendingUp size={14} className="text-[--brand-500]" /> Aportar
          </button>
          <button
            onClick={() => {
              onEdit(goal)
              setOpen(false)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
          >
            <Edit2 size={14} className="text-[--text-secondary]" /> Editar
          </button>
          <button
            onClick={() => {
              onDelete(goal)
              setOpen(false)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[--danger-text] hover:bg-[--danger-bg] transition-colors border-t border-[--border-subtle]"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, onEdit, onDelete, onContribute }) {
  const plan = buildGoalPlan(goal)
  const isUrgent =
    plan.daysLeft !== null && plan.daysLeft >= 0 && plan.daysLeft <= 30 && !plan.completed

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-xl">
              {goal.emoji || '🎯'}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[--text-primary]">{goal.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[--text-tertiary]">
                <span>Meta: {formatCurrency(plan.target)}</span>
                {goal.deadline && (
                  <>
                    <span>·</span>
                    <span>Até {formatDate(goal.deadline)}</span>
                  </>
                )}
                {plan.completed && (
                  <span className="font-medium text-[--success-icon]">✓ Concluída</span>
                )}
                {plan.overdue && (
                  <span className="flex items-center gap-1 font-medium text-[--danger-icon]">
                    <AlertCircle size={12} /> Prazo vencido
                  </span>
                )}
                {isUrgent && (
                  <span className="flex items-center gap-1 font-medium text-[--warning-icon]">
                    <AlertCircle size={12} /> Prazo próximo
                  </span>
                )}
              </div>
            </div>
          </div>
          <GoalMenu goal={goal} onContribute={onContribute} onEdit={onEdit} onDelete={onDelete} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-[--text-secondary]">Progresso</span>
            <span className="font-semibold text-[--text-primary]">{plan.progress.toFixed(0)}%</span>
          </div>
          <ProgressBar value={plan.current} max={plan.target} animated />
          <div className="mt-1 flex justify-between text-xs text-[--text-tertiary]">
            <span>{formatCurrency(plan.current)}</span>
            <span>{formatCurrency(plan.target)}</span>
          </div>
        </div>

        {!plan.completed && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                Falta alcançar
              </p>
              <p className="mt-1 text-sm font-black text-[--text-primary]">
                {formatCurrency(plan.remaining)}
              </p>
            </div>
            <div className="rounded-xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                {plan.suggestedMonthlyContribution ? 'Ritmo sugerido' : 'Prazo'}
              </p>
              <p className="mt-1 text-sm font-black text-[--text-primary]">
                {plan.suggestedMonthlyContribution
                  ? `${formatCurrency(plan.suggestedMonthlyContribution)}/mês`
                  : plan.daysLeft === null
                    ? 'Sem prazo'
                    : plan.overdue
                      ? 'Vencido'
                      : `${plan.daysLeft} dias`}
              </p>
            </div>
          </div>
        )}

        {plan.suggestedMonthlyContribution && !plan.completed && (
          <p className="mt-2 text-[10px] leading-relaxed text-[--text-tertiary]">
            Para chegar ao valor alvo até o prazo, seria necessário aportar aproximadamente{' '}
            <strong className="text-[--text-secondary]">
              {formatCurrency(plan.suggestedMonthlyContribution)} por mês
            </strong>
            .
          </p>
        )}

        {plan.completed && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[--success-border] bg-[--success-bg] p-2 text-xs text-[--success-text]">
            <CheckCircle size={14} />
            <span>Meta concluída! 🎉</span>
          </div>
        )}

        {!plan.completed && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            icon={<TrendingUp size={14} />}
            onClick={() => onContribute(goal)}
          >
            Registrar aporte
          </Button>
        )}
      </Card>
    </motion.div>
  )
}

function GoalsContent() {
  const { goals, createGoal, editGoal, removeGoal } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    emoji: '🎯',
  })
  const [loading, setLoading] = useState(false)
  const [contributing, setContributing] = useState(null)
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionLoading, setContributionLoading] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const overview = useMemo(() => buildGoalsOverview(goals), [goals])

  const handleOpen = (goal = null) => {
    if (goal) {
      setEditing(goal)
      setForm({
        name: goal.name,
        targetAmount: String(goal.targetAmount),
        currentAmount: String(goal.currentAmount || 0),
        deadline: goal.deadline || '',
        emoji: goal.emoji || '🎯',
      })
    } else {
      setEditing(null)
      setForm({
        name: '',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
        emoji: '🎯',
      })
    }
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.targetAmount || parseFloat(form.targetAmount) <= 0) return
    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        deadline: form.deadline || null,
        emoji: form.emoji || '🎯',
      }
      if (editing) {
        await editGoal(editing.id, data)
      } else {
        await createGoal(data)
      }
      handleClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleContribute = (goal) => {
    setContributing(goal)
    setContributionAmount('')
  }

  const handleContributionSave = async () => {
    if (!contributing) return

    const value = Number(String(contributionAmount).replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return

    setContributionLoading(true)
    try {
      await editGoal(contributing.id, {
        currentAmount: (Number(contributing.currentAmount) || 0) + value,
      })
      setContributing(null)
      setContributionAmount('')
    } finally {
      setContributionLoading(false)
    }
  }

  const handleDelete = (goal) => {
    setDeleteCandidate(goal)
  }

  const confirmDelete = async () => {
    if (!deleteCandidate) return

    setDeleteLoading(true)
    try {
      await removeGoal(deleteCandidate.id)
      setDeleteCandidate(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Ordenar: não concluídas primeiro, depois por prazo
  const sortedGoals = [...goals].sort((a, b) => {
    const aDone = (a.currentAmount || 0) >= a.targetAmount
    const bDone = (b.currentAmount || 0) >= b.targetAmount
    if (aDone && !bDone) return 1
    if (!aDone && bDone) return -1
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return 0
  })

  const hasGoals = goals.length > 0

  return (
    <div
      data-tour="goals"
      className="operational-page goals-premium mx-auto min-w-0 max-w-[1600px] space-y-5 pb-24 lg:pb-6"
    >
      <div className="operational-page__header flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[--text-primary]">Metas</h1>
            <InfoTooltip text="Defina objetivos financeiros e acompanhe seu progresso. Aportes podem ser feitos a qualquer momento." />
          </div>
          <p className="text-sm text-[--text-tertiary]">{goals.length} metas definidas</p>
        </div>
        <Button variant="primary" size="sm" icon={<span aria-hidden="true">+</span>} onClick={() => handleOpen()}>
          Nova meta
        </Button>
      </div>

      {hasGoals && (
        <div className="operational-summary-grid grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Metas ativas',
              value: String(overview.active),
              helper: `${overview.completed} concluída${overview.completed === 1 ? '' : 's'}`,
            },
            {
              label: 'Já acumulado',
              value: formatCurrency(overview.totalCurrent),
              helper: 'Somando todas as metas',
            },
            {
              label: 'Falta alcançar',
              value: formatCurrency(overview.totalRemaining),
              helper: 'Valor restante das metas ativas',
            },
            {
              label: 'Prazos vencidos',
              value: String(overview.overdue),
              helper: overview.overdue > 0 ? 'Metas que pedem revisão' : 'Nenhuma meta atrasada',
            },
          ].map((item) => (
            <Card key={item.label} className="py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-black text-[--text-primary]">{item.value}</p>
              <p className="mt-1 text-[10px] text-[--text-tertiary]">{item.helper}</p>
            </Card>
          ))}
        </div>
      )}

      {!hasGoals ? (
        <EmptyState
          icon={<Target />}
          title="Nenhuma meta definida"
          description="Crie uma meta financeira, como uma viagem, um carro ou a reserva de emergência."
          action={
            <Button variant="primary" icon={<span aria-hidden="true">+</span>} onClick={() => handleOpen()}>
              Criar primeira meta
            </Button>
          }
        />
      ) : (
        <div className="operational-card-grid goals-card-grid grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence>
            {sortedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleOpen}
                onDelete={handleDelete}
                onContribute={handleContribute}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleClose} title={editing ? 'Editar meta' : 'Nova meta'}>
        <div className="space-y-4">
          <Input
            label="Nome da meta"
            placeholder="Ex: Viagem para Europa"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <Input
              label="Valor alvo (R$)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 10000"
              value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
            />
            <Input
              label="Valor atual (R$)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 2000"
              value={form.currentAmount}
              onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
              Ícone
            </label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emoji }))}
                  className={`w-10 h-10 text-xl rounded-xl border transition-all ${
                    form.emoji === emoji
                      ? 'border-[--brand-500] bg-[--brand-50]'
                      : 'border-[--border-default] hover:bg-[--bg-hover]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Prazo (opcional)"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          />

          {form.deadline && (
            <div className="p-3 rounded-xl bg-[--brand-50] border border-[--brand-200] text-xs text-[--brand-700]">
              ⏳ Prazo: {formatDate(form.deadline)} — restam{' '}
              {Math.max(
                0,
                Math.ceil((new Date(form.deadline) - new Date()) / (1000 * 60 * 60 * 24)),
              )}{' '}
              dias.
            </div>
          )}

          <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>
            {editing ? 'Salvar alterações' : 'Criar meta'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(contributing)}
        onClose={() => {
          setContributing(null)
          setContributionAmount('')
        }}
        title={contributing ? `Aporte em ${contributing.name}` : 'Registrar aporte'}
      >
        {contributing && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-4">
              <p className="text-xs text-[--text-tertiary]">Situação atual</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                    Acumulado
                  </p>
                  <p className="mt-1 text-sm font-black text-[--text-primary]">
                    {formatCurrency(buildGoalPlan(contributing).current)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
                    Falta
                  </p>
                  <p className="mt-1 text-sm font-black text-[--text-primary]">
                    {formatCurrency(buildGoalPlan(contributing).remaining)}
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Valor do aporte (R$)"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ex: 500,00"
              value={contributionAmount}
              onChange={(event) => setContributionAmount(event.target.value)}
            />

            {Number(contributionAmount) > 0 && (
              <div className="rounded-xl border border-[--brand-200] bg-[--brand-50] p-3 text-xs text-[--brand-700]">
                Novo acumulado:{' '}
                <strong>
                  {formatCurrency(
                    (Number(contributing.currentAmount) || 0) + Number(contributionAmount),
                  )}
                </strong>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={handleContributionSave}
              loading={contributionLoading}
            >
              Confirmar aporte
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        title="Excluir meta"
      >
        {deleteCandidate && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-4">
              <p className="text-sm font-bold text-[--danger-text]">
                Excluir “{deleteCandidate.name}”?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[--danger-text]">
                O progresso desta meta será removido. Nenhuma transação financeira será alterada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" fullWidth onClick={() => setDeleteCandidate(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                className="bg-[--danger-icon] hover:opacity-90"
                onClick={confirmDelete}
                loading={deleteLoading}
              >
                Excluir meta
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function Goals() {
  // Metas é um recurso free, mas se quiser restringir, descomente:
  // return <PremiumGate feature="Metas">{/* <GoalsContent /> */}</PremiumGate>
  // Por enquanto, liberado para todos
  return <GoalsContent />
}
