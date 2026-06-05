// src/components/Goals.jsx
import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Target } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal, ProgressBar, EmptyState } from './ui'
import { formatCurrency } from '../utils'

export default function Goals() {
  const { goals, createGoal, editGoal, removeGoal } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '' })
  const [loading, setLoading] = useState(false)

  const handleOpen = (goal = null) => {
    if (goal) {
      setEditing(goal)
      setForm({ name: goal.name, targetAmount: goal.targetAmount, deadline: goal.deadline?.slice(0,10) || '' })
    } else {
      setEditing(null)
      setForm({ name: '', targetAmount: '', deadline: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.targetAmount) return
    setLoading(true)
    try {
      const data = { name: form.name, targetAmount: parseFloat(form.targetAmount), deadline: form.deadline }
      if (editing) {
        await editGoal(editing.id, data)
      } else {
        await createGoal(data)
      }
      setModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-[--text-primary]">Metas financeiras</h1>
        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => handleOpen()}>Nova meta</Button>
      </div>
      {goals.length === 0 ? (
        <EmptyState icon={<Target />} title="Nenhuma meta" description="Crie metas para acompanhar seu progresso." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
            return (
              <Card key={goal.id}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[--text-primary]">{goal.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpen(goal)} className="p-1.5 rounded-lg hover:bg-[--bg-hover]"><Edit2 size={14} /></button>
                    <button onClick={() => removeGoal(goal.id)} className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--danger-text]"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[--text-secondary]">{formatCurrency(goal.currentAmount)}</span>
                  <span className="text-[--text-tertiary]">{percent.toFixed(0)}%</span>
                  <span className="text-[--text-secondary]">{formatCurrency(goal.targetAmount)}</span>
                </div>
                <ProgressBar value={goal.currentAmount} max={goal.targetAmount} animated />
                {goal.deadline && <p className="text-xs text-[--text-tertiary] mt-2">Prazo: {new Date(goal.deadline).toLocaleDateString()}</p>}
              </Card>
            )
          })}
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar meta' : 'Nova meta'}>
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Valor alvo" type="number" step="0.01" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
          <Input label="Prazo (opcional)" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>Salvar</Button>
        </div>
      </Modal>
    </div>
  )
}
