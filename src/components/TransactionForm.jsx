// src/components/TransactionForm.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, FileText, Tag, CreditCard, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Modal, Button, Input, Select } from './ui'
import { PAYMENT_METHODS } from '../utils'
import { format } from 'date-fns'

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  description: '',
  categoryId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: 'pix',
  notes: '',
}

export default function TransactionForm({ isOpen, onClose, transaction }) {
  const { categories, createTransaction, editTransaction } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const isEditing = !!transaction

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        categoryId: transaction.categoryId || '',
        date: transaction.date,
        paymentMethod: transaction.paymentMethod || 'pix',
        notes: transaction.notes || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [transaction, isOpen])

  const filteredCategories = categories.filter(c =>
    c.type === form.type || c.type === 'both'
  )

  const update = (field) => (e) => {
    const value = e.target.value
    setForm(f => {
      const next = { ...f, [field]: value }
      // Reset category when type changes
      if (field === 'type') next.categoryId = ''
      return next
    })
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.amount || isNaN(amount) || amount <= 0) errs.amount = 'Valor inválido'
    if (!form.categoryId) errs.categoryId = 'Selecione uma categoria'
    if (!form.date) errs.date = 'Data obrigatória'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const cat = categories.find(c => c.id === form.categoryId)
    const data = {
      type: form.type,
      amount: parseFloat(form.amount.replace(',', '.')),
      description: form.description.trim(),
      categoryId: form.categoryId,
      categoryName: cat?.name || '',
      categoryColor: cat?.color || '',
      categoryIcon: cat?.icon || '',
      date: form.date,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim(),
    }

    try {
      if (isEditing) {
        await editTransaction(transaction.id, data)
      } else {
        await createTransaction(data)
      }
      onClose()
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar transação' : 'Nova transação'}
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth loading={loading} onClick={handleSubmit}>
            {isEditing ? 'Salvar alterações' : 'Adicionar'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[--bg-hover] rounded-xl">
          {['expense', 'income'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => update('type')({ target: { value: type } })}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 ${
                form.type === type
                  ? type === 'expense'
                    ? 'bg-[--danger-bg] text-[--danger-text] border border-[--danger-border] shadow-sm'
                    : 'bg-[--success-bg] text-[--success-text] border border-[--success-border] shadow-sm'
                  : 'text-[--text-tertiary] hover:text-[--text-secondary]'
              }`}
            >
              {type === 'expense' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
              {type === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="relative">
          <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
            Valor <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-secondary]">R$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              onChange={update('amount')}
              className={`w-full bg-[--bg-surface] border rounded-xl pl-10 pr-4 py-3 text-xl font-black text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all ${
                errors.amount ? 'border-[--danger-border]' : 'border-[--border-default]'
              }`}
            />
          </div>
          {errors.amount && <p className="text-xs text-[--danger-text] mt-1">{errors.amount}</p>}
        </div>

        {/* Description */}
        <Input
          label="Descrição"
          placeholder="Ex: Almoço no restaurante"
          value={form.description}
          onChange={update('description')}
          icon={<FileText />}
        />

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
            Categoria <span className="text-red-500">*</span>
          </label>
          {errors.categoryId && <p className="text-xs text-[--danger-text] mb-1">{errors.categoryId}</p>}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => update('categoryId')({ target: { value: cat.id } })}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all duration-150 ${
                  form.categoryId === cat.id
                    ? 'border-[--brand-500] bg-[--brand-50] shadow-sm'
                    : 'border-[--border-default] hover:border-[--border-strong] hover:bg-[--bg-hover]'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px] font-medium text-[--text-secondary] leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data"
            type="date"
            value={form.date}
            onChange={update('date')}
            icon={<Calendar />}
            error={errors.date}
            required
          />
          <Select
            label="Pagamento"
            value={form.paymentMethod}
            onChange={update('paymentMethod')}
          >
            {PAYMENT_METHODS.map(m => (
              <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
            ))}
          </Select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Observações</label>
          <textarea
            placeholder="Notas adicionais (opcional)..."
            value={form.notes}
            onChange={update('notes')}
            rows={2}
            className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] resize-none hover:border-[--border-strong] transition-all"
          />
        </div>
      </form>
    </Modal>
  )
}
