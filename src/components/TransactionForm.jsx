// src/components/TransactionForm.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Calendar, CreditCard,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Layers, PiggyBank
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Modal, Button, Input } from './ui'
import { PAYMENT_METHODS } from '../utils'
import { format, addMonths } from 'date-fns'

// ── Máscara monetária ──
function maskCurrency(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}
function parseCurrency(masked) {
  if (!masked) return 0
  return parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0
}

function CurrencyInput({ label, value, onChange, error, placeholder = '0,00', required }) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
          {label}{required && <span className="text-[--danger-text] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[--text-secondary] pointer-events-none">R$</span>
        <input
          type="text" inputMode="numeric" placeholder={placeholder} value={value}
          onChange={e => onChange(maskCurrency(e.target.value))}
          onKeyDown={e => {
            const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']
            if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return
            if (!/^\d$/.test(e.key)) e.preventDefault()
          }}
          className={`w-full bg-[--bg-surface] border rounded-xl pl-10 pr-4 py-3 text-xl font-black
            text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none
            focus:ring-2 focus:ring-[--brand-500] transition-all
            ${error ? 'border-[--danger-border]' : 'border-[--border-default]'}`}
        />
      </div>
      {error && <p className="text-xs text-[--danger-text] mt-1">{error}</p>}
    </div>
  )
}

// Tipos de lançamento
const TX_TYPES = [
  { id: 'expense', label: 'Despesa',  icon: <ArrowDownCircle size={15} />, color: 'danger'  },
  { id: 'income',  label: 'Receita',  icon: <ArrowUpCircle   size={15} />, color: 'success' },
  { id: 'savings', label: 'Poupança', icon: <PiggyBank        size={15} />, color: 'brand'   },
]

const EMPTY_FORM = {
  txType:         'expense', // 'expense' | 'income' | 'savings'
  amount:         '',
  description:    '',
  categoryId:     '',
  date:           format(new Date(), 'yyyy-MM-dd'),
  paymentMethod:  'pix',
  notes:          '',
  // Cartão
  isCredit:       false,
  closingDay:     '',
  isInstallment:  false,
  installments:   '2',
  // Recorrente (receita E despesa)
  isRecurring:    false,
  recurringMonths:'12',
}

function getEffectiveDate(baseDate, closingDay) {
  if (!closingDay) return baseDate
  const d = new Date(baseDate + 'T00:00:00')
  if (d.getDate() > parseInt(closingDay)) {
    return format(addMonths(d, 1), 'yyyy-MM-dd')
  }
  return baseDate
}

export default function TransactionForm({ isOpen, onClose, transaction }) {
  const { categories, createTransaction, editTransaction, addTransactionBatch } = useApp()
  const [form, setForm]     = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const isEditing = !!transaction

  useEffect(() => {
    if (transaction) {
      let txType = transaction.type === 'income' ? 'income' : 'expense'
      if (transaction.isSavings) txType = 'savings'
      setForm({
        ...EMPTY_FORM,
        txType,
        amount:        maskCurrency(String(Math.round(transaction.amount * 100))),
        description:   transaction.description || '',
        categoryId:    transaction.categoryId  || '',
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
      if (field === 'txType') {
        next.categoryId    = ''
        next.isRecurring   = false
        next.isInstallment = false
        next.isCredit      = false
      }
      if (field === 'paymentMethod') {
        next.isCredit      = value === 'credit_card'
        next.isInstallment = false
      }
      return next
    })
    setErrors(e => ({ ...e, [field]: '' }))
  }, [])

  const isSavings  = form.txType === 'savings'
  const isIncome   = form.txType === 'income'
  const isExpense  = form.txType === 'expense'

  const filteredCategories = isSavings ? [] :
    categories.filter(c => c.type === form.txType || c.type === 'both')

  const validate = () => {
    const errs = {}
    if (!form.amount || parseCurrency(form.amount) <= 0) errs.amount = 'Informe um valor válido'
    if (!isSavings && !form.categoryId) errs.categoryId = 'Selecione uma categoria'
    if (!form.date) errs.date = 'Data obrigatória'
    if (form.isInstallment && parseInt(form.installments) < 2) errs.installments = 'Mínimo 2 parcelas'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!validate()) return
    setLoading(true)

    const cat = categories.find(c => c.id === form.categoryId)
    const baseAmount = parseCurrency(form.amount)

    // Dados base da transação
    const baseData = {
      type:          isSavings ? 'income' : form.txType,
      isSavings,
      description:   form.description.trim() || (isSavings ? 'Depósito em Poupança' : ''),
      categoryId:    isSavings ? '_savings' : form.categoryId,
      categoryName:  isSavings ? 'Poupança' : cat?.name  || '',
      categoryColor: isSavings ? '#6366f1'  : cat?.color || '',
      categoryIcon:  isSavings ? '🐷'       : cat?.icon  || '',
      paymentMethod: form.paymentMethod,
      notes:         form.notes.trim(),
      isRecurring:   form.isRecurring,
    }

    try {
      if (isEditing) {
        await editTransaction(transaction.id, { ...baseData, amount: baseAmount, date: form.date })
      } else if (form.isInstallment && isExpense) {
        // Parcelamento no cartão
        const n       = parseInt(form.installments)
        const parcela = parseFloat((baseAmount / n).toFixed(2))
        const groupId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
        const items   = Array.from({ length: n }, (_, i) => {
          const d = format(addMonths(new Date(form.date + 'T00:00:00'), i), 'yyyy-MM-dd')
          return {
            ...baseData,
            amount:           parcela,
            date:             getEffectiveDate(d, form.closingDay),
            isInstallment:    true,
            installmentNum:   i + 1,
            installmentOf:    n,
            installmentGroupId: groupId,
          }
        })
        await addTransactionBatch(items)
      } else if (form.isRecurring) {
        // Recorrente (receita OU despesa)
        const months  = parseInt(form.recurringMonths) || 12
        const groupId = `${Date.now()}_${Math.random().toString(36).slice(2)}`
        const items   = Array.from({ length: months }, (_, i) => ({
          ...baseData,
          amount:           baseAmount,
          date:             format(addMonths(new Date(form.date + 'T00:00:00'), i), 'yyyy-MM-dd'),
          recurringGroupId: groupId,
        }))
        await addTransactionBatch(items)
      } else {
        const effDate = (isExpense && form.isCredit)
          ? getEffectiveDate(form.date, form.closingDay)
          : form.date
        await createTransaction({ ...baseData, amount: baseAmount, date: effDate })
      }
      onClose()
    } catch (_) {}
    finally { setLoading(false) }
  }

  const showCreditFields  = isExpense && form.paymentMethod === 'credit_card'
  const showRecurringField = (isIncome || isExpense) && !isEditing

  const btnLabel = () => {
    if (isEditing)           return 'Salvar alterações'
    if (form.isInstallment)  return `Criar ${form.installments} parcelas`
    if (form.isRecurring)    return `Criar ${form.recurringMonths} meses`
    if (isSavings)           return 'Depositar na poupança'
    return 'Adicionar'
  }

  return (
    <Modal
      isOpen={isOpen} onClose={onClose}
      title={isEditing ? 'Editar transação' : 'Nova transação'}
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancelar</Button>
          <Button variant="primary" fullWidth loading={loading} onClick={handleSubmit}>
            {btnLabel()}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Tipo */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[--bg-hover] rounded-xl">
          {TX_TYPES.map(({ id, label, icon, color }) => (
            <button key={id} type="button" onClick={() => update('txType')(id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150
                ${form.txType === id
                  ? color === 'danger'  ? 'bg-[--danger-bg]  text-[--danger-text]  border border-[--danger-border]  shadow-sm'
                  : color === 'success' ? 'bg-[--success-bg] text-[--success-text] border border-[--success-border] shadow-sm'
                  :                       'bg-[--brand-50]   text-[--brand-700]    border border-[--brand-200]     shadow-sm'
                  : 'text-[--text-tertiary] hover:text-[--text-secondary]'
                }`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Valor */}
        <CurrencyInput label="Valor" required
          value={form.amount} onChange={update('amount')} error={errors.amount} />

        {/* Poupança — só descrição */}
        {isSavings && (
          <div className="p-3 rounded-xl bg-[--brand-50] border border-[--brand-200]">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank size={14} className="text-[--brand-600]" />
              <p className="text-xs font-bold text-[--brand-700]">Depósito em Poupança</p>
            </div>
            <p className="text-xs text-[--brand-600] leading-relaxed">
              Este valor será registrado separadamente como poupança e não entra no saldo corrente do mês.
              Você pode acompanhá-la no Dashboard.
            </p>
          </div>
        )}

        {/* Descrição */}
        <Input label="Descrição" placeholder={isSavings ? 'Ex: Reserva de emergência' : 'Ex: Almoço no restaurante'}
          value={form.description} onChange={update('description')} icon={<FileText size={15} />} />

        {/* Categorias (não poupança) */}
        {!isSavings && (
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
              Categoria <span className="text-[--danger-text]">*</span>
            </label>
            {errors.categoryId && <p className="text-xs text-[--danger-text] mb-1">{errors.categoryId}</p>}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1
              scrollbar-thin scrollbar-thumb-[--border-default] scrollbar-track-transparent">
              {filteredCategories.map(cat => (
                <button key={cat.id} type="button" onClick={() => update('categoryId')(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all duration-150
                    ${form.categoryId === cat.id
                      ? 'border-[--brand-500] bg-[--brand-50] shadow-sm'
                      : 'border-[--border-default] hover:border-[--border-strong] hover:bg-[--bg-hover]'
                    }`}>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] font-medium text-[--text-secondary] leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Data + Pagamento */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={form.date}
            onChange={update('date')} icon={<Calendar size={15} />} error={errors.date} required />
          {!isSavings && (
            <div>
              <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Pagamento</label>
              <select value={form.paymentMethod} onChange={update('paymentMethod')}
                className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-3 py-3
                  text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] text-sm">
                {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Campos de cartão de crédito */}
        <AnimatePresence>
          {showCreditFields && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-3 rounded-xl bg-[--brand-50] border border-[--brand-200] space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={13} className="text-[--brand-600]" />
                  <span className="text-xs font-bold text-[--brand-700]">Cartão de Crédito</span>
                </div>
                <Input label="Dia de fechamento da fatura" type="number" min="1" max="31"
                  placeholder="Ex: 5" value={form.closingDay} onChange={update('closingDay')}
                  error={errors.closingDay} />
                {form.closingDay && (
                  <p className="text-xs text-[--brand-600]">
                    💡 Compras após dia {form.closingDay} serão lançadas no mês seguinte.
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isInstallment}
                    onChange={e => update('isInstallment')(e.target.checked)}
                    className="w-4 h-4 rounded accent-[--brand-600]" />
                  <Layers size={13} className="text-[--brand-500]" />
                  <span className="text-sm font-medium text-[--brand-700]">Parcelado</span>
                </label>
                <AnimatePresence>
                  {form.isInstallment && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                      <Input label="Número de parcelas" type="number" min="2" max="48"
                        placeholder="Ex: 12" value={form.installments}
                        onChange={update('installments')} error={errors.installments} />
                      {form.amount && form.installments && (
                        <div className="p-2 rounded-lg bg-white/60 text-xs text-[--brand-700]">
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

        {/* Recorrente — receita OU despesa */}
        <AnimatePresence>
          {showRecurringField && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={`p-3 rounded-xl border space-y-3 ${
                isIncome
                  ? 'bg-[--success-bg] border-[--success-border]'
                  : 'bg-[--warning-bg] border-[--warning-border]'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isRecurring}
                    onChange={e => update('isRecurring')(e.target.checked)}
                    className={`w-4 h-4 rounded ${isIncome ? 'accent-green-600' : 'accent-orange-500'}`} />
                  <RefreshCw size={13} className={isIncome ? 'text-[--success-icon]' : 'text-orange-500'} />
                  <span className={`text-sm font-medium ${isIncome ? 'text-[--success-text]' : 'text-orange-700'}`}>
                    {isIncome ? 'Receita fixa — repetir mensalmente' : 'Despesa fixa — repetir mensalmente'}
                  </span>
                </label>
                <AnimatePresence>
                  {form.isRecurring && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
                      <Input label="Repetir por quantos meses" type="number" min="2" max="120"
                        placeholder="Ex: 12" value={form.recurringMonths}
                        onChange={update('recurringMonths')} />
                      <p className={`text-xs ${isIncome ? 'text-[--success-text]' : 'text-orange-600'}`}>
                        {form.recurringMonths || 0} lançamentos serão criados automaticamente.
                        {isExpense && ' Ex: aluguel, academia, streaming.'}
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
            className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5
              text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none
              focus:ring-2 focus:ring-[--brand-500] resize-none hover:border-[--border-strong] transition-all" />
        </div>
      </div>
    </Modal>
  )
}
