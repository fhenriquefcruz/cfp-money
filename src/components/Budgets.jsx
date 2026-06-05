// src/components/Budgets.jsx
import React, { useState } from 'react'
import { PieChart, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal, EmptyState } from './ui'
import { formatCurrency } from '../utils'

export default function Budgets() {
  const { budgets, categories, saveBudget, removeBudget, transactions } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ categoryId: '', amount: '' })
  const [loading, setLoading] = useState(false)

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const currentMonth = new Date().toLocaleDateString('en-CA').slice(0,7)

  const getSpent = (categoryId) => {
    return transactions.filter(t => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0)
  }

  const handleOpen = (budget = null) => {
    if (budget) {
      setEditing(budget)
      setForm({ categoryId: budget.categoryId, amount: budget.amount })
    } else {
      setEditing(null)
      setForm({ categoryId: '', amount: '' })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.categoryId || !form.amount) return
    setLoading(true)
    try {
      await saveBudget(form.categoryId, parseFloat(form.amount))
      setModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-[--text-primary]">Orçamentos mensais</h1>
        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => handleOpen()}>Definir orçamento</Button>
      </div>
      {expenseCategories.length === 0 ? (
        <EmptyState icon={<PieChart />} title="Nenhuma categoria" description="Crie categorias de despesa primeiro." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenseCategories.map(cat => {
            const budget = budgets.find(b => b.categoryId === cat.id)
            const spent = getSpent(cat.id)
            const hasBudget = !!budget
            const percent = hasBudget ? Math.min(100, (spent / budget.amount) * 100) : 0
            return (
              <Card key={cat.id}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-[--text-primary]">{cat.name}</span>
                  </div>
                  {hasBudget && (
                    <button onClick={() => removeBudget(cat.id)} className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--danger-text]">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {hasBudget ? (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[--text-secondary]">Gasto: {formatCurrency(spent)}</span>
                      <span className="text-[--text-tertiary]">{percent.toFixed(0)}%</span>
                      <span className="text-[--text-secondary]">Orçado: {formatCurrency(budget.amount)}</span>
                    </div>
                    <div className="h-2 bg-[--bg-hover] rounded-full overflow-hidden">
                      <div className="h-full bg-[--brand-500] rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    {percent >= 90 && <p className="text-xs text-[--warning-text] mt-1">⚠️ Próximo do limite</p>}
                  </>
                ) : (
                  <Button variant="secondary" size="sm" fullWidth onClick={() => handleOpen({ categoryId: cat.id })}>Definir orçamento</Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar orçamento' : 'Definir orçamento'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[--text-secondary]">Categoria</label>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full mt-1 bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2">
              <option value="">Selecione</option>
              {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <Input label="Valor orçado (R$)" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>Salvar</Button>
        </div>
      </Modal>
    </div>
  )
}
