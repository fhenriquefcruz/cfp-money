// src/components/Goals.jsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Target, TrendingUp, Calendar, PlusCircle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal, ProgressBar, EmptyState } from './ui'
import { InfoTooltip } from './Onboarding'
import { formatCurrency } from '../utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function maskCurrency(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}
function parseCurrency(masked) {
  if (!masked) return 0
  return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0
}

function CurrencyInput({ label, value, onChange, placeholder = '0,00', tooltip }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-sm font-medium text-[--text-secondary]">{label}</label>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-secondary] pointer-events-none">R$</span>
        <input
          type="text" inputMode="numeric" placeholder={placeholder} value={value}
          onChange={e => onChange(maskCurrency(e.target.value))}
          onKeyDown={e => {
            const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight']
            if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return
            if (!/^\d$/.test(e.key)) e.preventDefault()
          }}
          className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl pl-10 pr-4 py-2.5 text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all"
        />
      </div>
    </div>
  )
}

const EMPTY_FORM = { name: '', targetAmount: '', currentAmount: '', deadline: '', emoji: '🎯', color: '#6366f1' }
const GOAL_EMOJIS = ['🎯','🏠','✈️','🚗','💻','📱','🎓','💍','🏖️','🏋️','💰','🛒','🎸','📷','⚓']
const GOAL_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#3b82f6','#14b8a6']

export default function Goals() {
  const { goals, createGoal, editGoal, removeGoal } = useApp()
  const [modalOpen, setModalOpen]   = useState(false)
  const [aporteModal, setAporteModal] = useState(null) // goal para aportar
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [aporteVal, setAporteVal]   = useState('')
  const [loading, setLoading]       = useState(false)

  const upd = (field) => (val) => setForm(f => ({ ...f, [field]: val }))

  const handleOpen = (goal = null) => {
    if (goal) {
      setEditing(goal)
      setForm({
        name: goal.name,
        targetAmount:  maskCurrency(String(Math.round((goal.targetAmount  || 0) * 100))),
        currentAmount: maskCurrency(String(Math.round((goal.currentAmount || 0) * 100))),
        deadline: goal.deadline?.slice(0, 10) || '',
        emoji: goal.emoji || '🎯',
        color: goal.color || '#6366f1',
      })
    } else {
      setEditing(null)
      setForm(EMPTY_FORM)
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.targetAmount) return
    setLoading(true)
    try {
      const data = {
        name:          form.name.trim(),
        targetAmount:  parseCurrency(form.targetAmount),
        currentAmount: parseCurrency(form.currentAmount),
        deadline:      form.deadline || null,
        emoji:         form.emoji,
        color:         form.color,
      }
      if (editing) await editGoal(editing.id, data)
      else         await createGoal(data)
      setModalOpen(false)
    } finally { setLoading(false) }
  }

  const handleAporte = async () => {
    if (!aporteModal || !aporteVal) return
    setLoading(true)
    try {
      const newAmount = (aporteModal.currentAmount || 0) + parseCurrency(aporteVal)
      await editGoal(aporteModal.id, {
        ...aporteModal,
        currentAmount: Math.min(newAmount, aporteModal.targetAmount),
      })
      setAporteModal(null)
      setAporteVal('')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[--text-primary]">Metas financeiras</h1>
            <InfoTooltip text="Defina objetivos financeiros e acompanhe quanto já juntou. Use 'Aportar' para registrar depósitos na meta." />
          </div>
          <p className="text-sm text-[--text-tertiary] mt-0.5">{goals.length} meta{goals.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => handleOpen()}>Nova meta</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={<Target />} title="Nenhuma meta"
          description="Crie metas para acompanhar seu progresso financeiro."
          action={<Button variant="primary" icon={<Plus />} onClick={() => handleOpen()}>Criar meta</Button>} />
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {goals.map(goal => {
              const pct       = Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100)
              const remaining = Math.max(0, goal.targetAmount - (goal.currentAmount || 0))
              const done      = pct >= 100

              return (
                <motion.div key={goal.id}
                  layout initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: (goal.color || '#6366f1') + '20' }}>
                          {goal.emoji || '🎯'}
                        </div>
                        <div>
                          <p className="font-bold text-[--text-primary] leading-snug">{goal.name}</p>
                          {goal.deadline && (
                            <p className="text-xs text-[--text-tertiary] flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {format(new Date(goal.deadline + 'T00:00:00'), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleOpen(goal)}
                          className="p-1.5 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] hover:text-[--text-primary] transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => removeGoal(goal.id)}
                          className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="flex justify-between items-baseline mb-1.5">
                      <div>
                        <span className="text-2xl font-black tabular-nums"
                          style={{ color: done ? '#10b981' : (goal.color || '#6366f1') }}>
                          {formatCurrency(goal.currentAmount || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[--text-tertiary]">de {formatCurrency(goal.targetAmount)}</p>
                        {!done && <p className="text-xs text-[--text-secondary] font-medium">faltam {formatCurrency(remaining)}</p>}
                        {done  && <p className="text-xs text-[--success-text] font-bold">✓ Concluída!</p>}
                      </div>
                    </div>

                    {/* Barra */}
                    <div className="h-2 bg-[--bg-hover] rounded-full overflow-hidden mb-3">
                      <motion.div className="h-full rounded-full"
                        style={{ background: done ? '#10b981' : (goal.color || '#6366f1') }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: goal.color || '#6366f1' }}>
                        {pct.toFixed(0)}% concluído
                      </span>
                      {!done && (
                        <button
                          onClick={() => { setAporteModal(goal); setAporteVal('') }}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: (goal.color || '#6366f1') + '18', color: goal.color || '#6366f1' }}>
                          <PlusCircle size={12} /> Aportar
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal criar/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar meta' : 'Nova meta'}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>
              {editing ? 'Salvar alterações' : 'Criar meta'}
            </Button>
          </div>
        }>
        <div className="space-y-4">
          {/* Emoji */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => upd('emoji')(e)}
                  className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.emoji === e ? 'ring-2 ring-[--brand-500] bg-[--brand-50]' : 'hover:bg-[--bg-hover]'
                  }`}>{e}</button>
              ))}
            </div>
          </div>

          <Input label="Nome da meta" placeholder="Ex: Viagem para Europa"
            value={form.name} onChange={e => upd('name')(e.target.value)} />

          <CurrencyInput label="Valor alvo" value={form.targetAmount}
            onChange={upd('targetAmount')}
            tooltip="Quanto você quer juntar no total para esta meta." />

          <CurrencyInput label="Valor já guardado (opcional)" value={form.currentAmount}
            onChange={upd('currentAmount')}
            tooltip="Se você já tem algum valor guardado para esta meta, informe aqui." />

          <Input label="Prazo (opcional)" type="date" value={form.deadline}
            onChange={e => upd('deadline')(e.target.value)} />

          {/* Cor */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Cor</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => upd('color')(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c ? 'border-white ring-2 ring-[--brand-500] scale-110' : 'border-transparent hover:scale-105'
                  }`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal aporte */}
      <Modal isOpen={!!aporteModal} onClose={() => setAporteModal(null)} title="Registrar aporte">
        {aporteModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[--bg-subtle] border border-[--border-subtle] flex items-center gap-3">
              <span className="text-2xl">{aporteModal.emoji || '🎯'}</span>
              <div>
                <p className="font-bold text-[--text-primary]">{aporteModal.name}</p>
                <p className="text-xs text-[--text-tertiary]">
                  {formatCurrency(aporteModal.currentAmount || 0)} de {formatCurrency(aporteModal.targetAmount)}
                </p>
              </div>
            </div>
            <CurrencyInput label="Valor do aporte" value={aporteVal}
              onChange={setAporteVal}
              tooltip="Quanto você está adicionando agora a esta meta." />
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setAporteModal(null)}>Cancelar</Button>
              <Button variant="primary" fullWidth onClick={handleAporte} loading={loading}
                icon={<TrendingUp size={14} />}>
                Confirmar aporte
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
