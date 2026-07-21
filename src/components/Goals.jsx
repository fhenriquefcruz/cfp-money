// src/components/Goals.jsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  MoreVertical,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal, ProgressBar, EmptyState } from './ui'
import { formatCurrency, formatDate } from '../utils'
import { usePlan } from '../contexts/PlanContext'
import PremiumGate from './PremiumGate'
import InfoTooltip from './InfoTooltip'

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
        <MoreVertical size={16} />
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
              onDelete(goal.id)
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
  const progress =
    goal.targetAmount > 0 ? Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0

  const isCompleted = progress >= 100
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const isUrgent = daysLeft !== null && daysLeft <= 30 && !isCompleted

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[--brand-100] flex items-center justify-center text-xl flex-shrink-0">
              {goal.emoji || '🎯'}
            </div>
            <div>
              <p className="font-semibold text-[--text-primary]">{goal.name}</p>
              <div className="flex items-center gap-2 text-xs text-[--text-tertiary] mt-0.5">
                <span>Meta: {formatCurrency(goal.targetAmount)}</span>
                {goal.deadline && (
                  <>
                    <span>·</span>
                    <span>Até {formatDate(goal.deadline)}</span>
                  </>
                )}
                {isCompleted && (
                  <span className="text-[--success-icon] font-medium">✓ Concluída</span>
                )}
                {isUrgent && (
                  <span className="text-[--danger-icon] font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> Urgente
                  </span>
                )}
              </div>
            </div>
          </div>
          <GoalMenu goal={goal} onContribute={onContribute} onEdit={onEdit} onDelete={onDelete} />
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[--text-secondary]">Progresso</span>
            <span className="font-semibold text-[--text-primary]">{progress.toFixed(0)}%</span>
          </div>
          <ProgressBar value={goal.currentAmount || 0} max={goal.targetAmount} animated />
          <div className="flex justify-between text-xs mt-1 text-[--text-tertiary]">
            <span>{formatCurrency(goal.currentAmount || 0)}</span>
            <span>{formatCurrency(goal.targetAmount)}</span>
          </div>
        </div>

        {isCompleted && (
          <div className="mt-3 p-2 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-xs flex items-center gap-2">
            <CheckCircle size={14} />
            <span>Meta concluída! 🎉</span>
          </div>
        )}

        {daysLeft !== null && !isCompleted && daysLeft <= 7 && (
          <div className="mt-3 p-2 rounded-xl bg-[--danger-bg] border border-[--danger-border] text-[--danger-text] text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>Prazo final se aproxima! Faltam {daysLeft} dias.</span>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function GoalsContent() {
  const { goals, createGoal, editGoal, removeGoal } = useApp()
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
    const amount = window.prompt(`Quanto você quer aportar na meta "${goal.name}"?`, '0')
    if (amount === null) return
    const value = parseFloat(amount.replace(',', '.'))
    if (isNaN(value) || value <= 0) return
    const newAmount = (goal.currentAmount || 0) + value
    editGoal(goal.id, { ...goal, currentAmount: newAmount })
  }

  const handleDelete = async (id) => {
    if (window.confirm('Excluir esta meta?')) {
      await removeGoal(id)
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
    <div className="space-y-5 pb-24 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[--text-primary]">Metas</h1>
            <InfoTooltip text="Defina objetivos financeiros e acompanhe seu progresso. Aportes podem ser feitos a qualquer momento." />
          </div>
          <p className="text-sm text-[--text-tertiary]">{goals.length} metas definidas</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => handleOpen()}>
          Nova meta
        </Button>
      </div>

      {!hasGoals ? (
        <EmptyState
          icon={<Target />}
          title="Nenhuma meta definida"
          description="Crie uma meta financeira, como uma viagem, um carro ou a reserva de emergência."
          action={
            <Button variant="primary" icon={<Plus />} onClick={() => handleOpen()}>
              Criar primeira meta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-3">
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
    </div>
  )
}

export default function Goals() {
  const { status } = usePlan()
  // Metas é um recurso free, mas se quiser restringir, descomente:
  // return <PremiumGate feature="Metas">{/* <GoalsContent /> */}</PremiumGate>
  // Por enquanto, liberado para todos
  return <GoalsContent />
}
