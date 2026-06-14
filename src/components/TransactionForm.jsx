// src/components/TransactionForm.jsx
// Inclui: máscara monetária, cartão de crédito+parcelas, receita recorrente, filtros
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Calendar, FileText, CreditCard,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Layers
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Modal, Button, Input, Select } from './ui'
import { PAYMENT_METHODS } from '../utils'
import { format, addMonths } from 'date-fns'

// ── Máscara monetária BR ──
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

function CurrencyInput({ label, value, onChange, error, placeholder = '0,00', required }) {
  const handleChange = (e) => {
    const masked = maskCurrency(e.target.value)
    onChange(masked)
  }
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-secondary] pointer-events-none">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => {
            // Permite: backspace, delete, tab, setas, ctrl+a/c/v/x
            const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']
            if (allowed.includes(e.key)) return
            if (e.ctrlKey || e.metaKey) return
            // Bloqueia qualquer tecla não numérica
            if (!/^\d$/.test(e.key)) e.preventDefault()
          }}
          className={`w-full bg-[--bg-surface] border rounded-xl pl-10 pr-4 py-3 text-xl font-black text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all ${
            error ? 'border-[--danger-border]' : 'border-[--border-default]'
          }`}
        />
      </div>
      {error && <p className="text-xs text-[--danger-text] mt-1">{error}</p>}
    </div>
  )
}

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  description: '',
  categoryId: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: 'pix',
  notes: '',
  // Cartão
  isCredit: false,
  closingDay: '',
  isInstallment: false,
  installments: '2',
  // Recorrente
  isRecurring: false,
  recurringMonths: '12',
}

export default function TransactionForm({ isOpen, onClose, transaction }) {
  const { categories, createTransaction, editTransaction, addTransactionBatch } = useApp()
  const [form, setForm]       = useState(EMPTY_FORM)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const isEditing = !!transaction

  useEffect(() => {
    if (transaction) {
      setForm({
        ...EMPTY_FORM,
        type:          transaction.type,
        amount:        maskCurrency(String(Math.round(transaction.amount * 100))),
        description:   transaction.description || '',
        categoryId:    transaction.categoryId || '',
        date:          transaction.date,
        paymentMethod: transaction.paymentMethod || 'pix',
        notes:         transaction.notes || '',
        isRecurring:   transaction.isRecurring || false,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
  }, [transaction, isOpen])

  const update = useCallback((field) => (val) => {
    const value = typeof val === 'object' && val?.target ? val.target.value : val
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'type') { next.categoryId = ''; next.isRecurring = false }
      if (field === 'paymentMethod') { next.isCredit = value === 'credit_card'; next.isInstallment = false }
      return next
    })
    setErrors(e => ({ ...e, [field]: '' }))
  }, [])

  const filteredCategories = categories.filter(c => c.type === form.type || c.type === 'both')

  const validate = () => {
    const errs = {}
    if (!form.amount || parseCurrency(form.amount) <= 0) errs.amount = 'Valor inválido'
    if (!form.categoryId) errs.categoryId = 'Selecione uma categoria'
    if (!form.date) errs.date = 'Data obrigatória'
    if (form.isInstallment && (!form.installments || parseInt(form.installments) < 2)) errs.installments = 'Mínimo 2 parcelas'
    if (form.isCredit && form.closingDay && (parseInt(form.closingDay) < 1 || parseInt(form.closingDay) > 31)) errs.closingDay = 'Dia inválido (1–31)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Calcula data efetiva considerando fechamento da fatura
  const getEffectiveDate = (baseDate, closingDay) => {
    if (!closingDay) return baseDate
    const d = new Date(baseDate + 'T00:00:00')
    const closing = parseInt(closingDay)
    if (d.getDate() > closing) {
      // Compra depois do fechamento → vai para o próximo mês
      return format(addMonths(d, 1), 'yyyy-MM-dd')
    }
    return baseDate
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    const cat = categories.find(c => c.id === form.categoryId)
    const baseAmount = parseCurrency(form.amount)

    const baseData = {
      type:          form.type,
      description:   form.description.trim(),
      categoryId:    form.categoryId,
      categoryName:  cat?.name  || '',
      categoryColor: cat?.color || '',
      categoryIcon:  cat?.icon  || '',
      paymentMethod: form.paymentMethod,
      notes:         form.notes.trim(),
      isRecurring:   form.isRecurring,
    }

    try {
      if (isEditing) {
        await editTransaction(transaction.id, {
          ...baseData,
          amount: baseAmount,
          date: form.date,
        })
      } else if (form.isInstallment && form.isCredit) {
        // Parcelas: gera N transações em meses consecutivos
        const n       = parseInt(form.installments)
        const parcela = parseFloat((baseAmount / n).toFixed(2))
        const items   = []
        for (let i = 0; i < n; i++) {
          const baseDate = format(addMonths(new Date(form.date + 'T00:00:00'), i), 'yyyy-MM-dd')
          const effDate  = getEffectiveDate(baseDate, form.closingDay)
          items.push({
            ...baseData,
            amount:         parcela,
            date:           effDate,
            isInstallment:  true,
            installmentNum: i + 1,
            installmentOf:  n,
            installmentGroupId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          })
        }
        await addTransactionBatch(items)
      } else if (form.isRecurring && form.type === 'income') {
        // Receita recorrente: replica N meses
        const months = parseInt(form.recurringMonths) || 12
        const items  = []
        for (let i = 0; i < months; i++) {
          const d = format(addMonths(new Date(form.date + 'T00:00:00'), i), 'yyyy-MM-dd')
          items.push({
            ...baseData,
            amount:           baseAmount,
            date:             d,
            recurringGroupId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          })
        }
        await addTransactionBatch(items)
      } else {
        const effDate = form.isCredit ? getEffectiveDate(form.date, form.closingDay) : form.date
        await createTransaction({ ...baseData, amount: baseAmount, date: effDate })
      }
      onClose()
    } catch (_) {}
    finally { setLoading(false) }
  }

  const showCreditFields   = form.paymentMethod === 'credit_card' && form.type === 'expense'
  const showRecurringFields = form.type === 'income'

  return (
    <Modal
      isOpen={isOpen} onClose={onClose}
      title={isEditing ? 'Editar transação' : 'Nova transação'}
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth loading={loading} onClick={handleSubmit}>
            {isEditing ? 'Salvar' : form.isInstallment ? `Criar ${form.installments}x` : form.isRecurring ? 'Criar recorrente' : 'Adicionar'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[--bg-hover] rounded-xl">
          {['expense', 'income'].map(type => (
            <button key={type} type="button"
              onClick={() => update('type')(type)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 ${
                form.type === type
                  ? type === 'expense'
                    ? 'bg-[--danger-bg] text-[--danger-text] border border-[--danger-border] shadow-sm'
                    : 'bg-[--success-bg] text-[--success-text] border border-[--success-border] shadow-sm'
                  : 'text-[--text-tertiary] hover:text-[--text-secondary]'
              }`}>
              {type === 'expense' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
              {type === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        {/* Valor com máscara */}
        <CurrencyInput
          label="Valor" required
          value={form.amount}
          onChange={update('amount')}
          error={errors.amount}
        />

        {/* Descrição */}
        <Input label="Descrição" placeholder="Ex: Almoço no restaurante"
          value={form.description} onChange={update('description')} icon={<FileText />} />

        {/* Categorias */}
        <div>
          <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
            Categoria <span className="text-red-500">*</span>
          </label>
          {errors.categoryId && <p className="text-xs text-[--danger-text] mb-1">{errors.categoryId}</p>}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
            {filteredCategories.map(cat => (
              <button key={cat.id} type="button"
                onClick={() => update('categoryId')(cat.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all duration-150 ${
                  form.categoryId === cat.id
                    ? 'border-[--brand-500] bg-[--brand-50] shadow-sm'
                    : 'border-[--border-default] hover:border-[--border-strong] hover:bg-[--bg-hover]'
                }`}>
                <span className="text-xl">{cat.icon}</span>
                <span className="text-[10px] font-medium text-[--text-secondary] leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data + Pagamento */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={form.date}
            onChange={update('date')} icon={<Calendar />} error={errors.date} required />
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Pagamento</label>
            <select value={form.paymentMethod} onChange={update('paymentMethod')}
              className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-3 text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]">
              {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Campos de Cartão de Crédito ── */}
        <AnimatePresence>
          {showCreditFields && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
              <div className="p-3 rounded-xl bg-[--brand-50] border border-[--brand-200]">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-[--brand-600]" />
                  <span className="text-xs font-bold text-[--brand-700]">Cartão de Crédito</span>
                </div>

                {/* Dia de fechamento */}
                <Input label="Dia de fechamento da fatura" type="number" min="1" max="31"
                  placeholder="Ex: 5"
                  value={form.closingDay} onChange={update('closingDay')}
                  error={errors.closingDay} />
                {form.closingDay && (
                  <p className="text-xs text-[--brand-600] mt-1">
                    💡 Compras após dia {form.closingDay} serão contabilizadas no mês seguinte.
                  </p>
                )}

                {/* Parcelado */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={form.isInstallment}
                    onChange={e => update('isInstallment')(e.target.checked)}
                    className="w-4 h-4 rounded accent-[--brand-600]" />
                  <span className="text-sm font-medium text-[--brand-700]">Parcelado</span>
                  <Layers size={13} className="text-[--brand-500]" />
                </label>

                <AnimatePresence>
                  {form.isInstallment && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2 overflow-hidden">
                      <Input label="Número de parcelas" type="number" min="2" max="48"
                        placeholder="Ex: 12" value={form.installments}
                        onChange={update('installments')} error={errors.installments} />
                      {form.amount && form.installments && (
                        <div className="p-2 rounded-lg bg-white/50 text-xs text-[--brand-700]">
                          Parcela: <strong>R$ {maskCurrency(String(Math.round(parseCurrency(form.amount) / parseInt(form.installments || 1) * 100)))}</strong>
                          {' '}× {form.installments}x
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Receita Recorrente ── */}
        <AnimatePresence>
          {showRecurringFields && !isEditing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isRecurring}
                    onChange={e => update('isRecurring')(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-600" />
                  <RefreshCw size={13} className="text-[--success-icon]" />
                  <span className="text-sm font-medium text-[--success-text]">Repetir mensalmente (receita fixa)</span>
                </label>
                <AnimatePresence>
                  {form.isRecurring && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <Input label="Repetir por quantos meses" type="number" min="2" max="120"
                        placeholder="Ex: 12" value={form.recurringMonths}
                        onChange={update('recurringMonths')} />
                      <p className="text-xs text-[--success-text] mt-1">
                        Serão criadas {form.recurringMonths || 0} entradas automáticas mensais.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notas */}
        <div>
          <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Observações</label>
          <textarea placeholder="Notas adicionais (opcional)..." value={form.notes}
            onChange={update('notes')} rows={2}
            className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] resize-none hover:border-[--border-strong] transition-all" />
        </div>
      </form>
    </Modal>
  )
}
