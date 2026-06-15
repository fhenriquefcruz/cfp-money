// src/utils/index.js

import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── CURRENCY FORMATTING ──
export const formatCurrency = (value, options = {}) => {
  const { currency = 'BRL', compact = false } = options
  if (compact && Math.abs(value) >= 1000) {
    const sign = value < 0 ? '-' : ''
    if (Math.abs(value) >= 1000000) {
      return `${sign}R$ ${(Math.abs(value) / 1000000).toFixed(1)}M`
    }
    return `${sign}R$ ${(Math.abs(value) / 1000).toFixed(1)}k`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ── DATE FORMATTING ──
export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ptBR })
}

export const formatMonth = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "MMMM 'de' yyyy", { locale: ptBR })
}

export const formatRelativeDate = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  const now = new Date()
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7) return `${diff} dias atrás`
  return formatDate(d)
}

// ── NUMBER FORMATTING ──
export const formatPercent = (value, total) => {
  if (!total) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

// ── COLOR UTILITIES ──
export const hexToRgba = (hex, alpha = 1) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(99,102,241,${alpha})`
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── TRANSACTION HELPERS ──
export const groupByMonth = (transactions) => {
  const groups = {}
  transactions.forEach(tx => {
    const key = format(new Date(tx.date), 'yyyy-MM')
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return groups
}

export const getMonthlyData = (transactions, months = 6) => {
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    const year = date.getFullYear()
    const month = date.getMonth()
    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    result.push({
      month: format(date, 'MMM', { locale: ptBR }),
      fullMonth: format(date, 'MMMM/yyyy', { locale: ptBR }),
      income,
      expenses,
      balance: income - expenses,
    })
  }
  return result
}

// ── PAYMENT METHOD LABELS ──
export const PAYMENT_METHODS = [
  { id: 'pix',         label: 'Pix',                icon: '💸' },
  { id: 'credit_card', label: 'Cartão de Crédito',  icon: '💳' },
  { id: 'debit_card',  label: 'Cartão de Débito',   icon: '🏧' },
  { id: 'cash',        label: 'Dinheiro',            icon: '💵' },
  { id: 'transfer',    label: 'Transferência',       icon: '🏦' },
  { id: 'boleto',      label: 'Boleto',              icon: '📄' },
]

export const getPaymentLabel = (id) =>
  PAYMENT_METHODS.find(m => m.id === id)?.label || id

// ── CSV EXPORT ──
export const exportToCSV = (transactions, categories) => {
  const getCatName = (id) => categories.find(c => c.id === id)?.name || 'Desconhecido'

  const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Pagamento']
  const rows = transactions.map(t => [
    formatDate(t.date),
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.description || '',
    t.categoryName || getCatName(t.categoryId),
    t.amount.toFixed(2).replace('.', ','),
    getPaymentLabel(t.paymentMethod),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cfp-money-transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF EXPORT ──
export const exportToPDF = async (transactions, categories, summary) => {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const today = format(new Date(), "dd/MM/yyyy 'às' HH:mm")

  // Header
  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, 220, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('CFP Money', 14, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Extrato Financeiro', 14, 28)
  doc.text(today, 196, 28, { align: 'right' })

  // Summary Cards
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.text('Resumo do Período', 14, 50)

  const cards = [
    { label: 'Receitas', value: summary.income, color: [16, 185, 129] },
    { label: 'Despesas', value: summary.expenses, color: [239, 68, 68] },
    { label: 'Saldo', value: summary.balance, color: summary.balance >= 0 ? [79, 70, 229] : [239, 68, 68] },
  ]

  cards.forEach((card, i) => {
    const x = 14 + i * 62
    doc.setFillColor(...card.color)
    doc.roundedRect(x, 55, 58, 22, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(card.label, x + 4, 63)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(card.value), x + 4, 72)
    doc.setFont('helvetica', 'normal')
  })

  // Transactions Table
  const rows = transactions.slice(0, 200).map(t => [
    formatDate(t.date),
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.description || '-',
    t.categoryName || '-',
    formatCurrency(t.amount),
  ])

  autoTable(doc, {
    startY: 85,
    head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']],
    body: rows,
    headStyles: { fillColor: [79, 70, 229], fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 65 },
      3: { cellWidth: 40 },
      4: { cellWidth: 28, halign: 'right' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const val = data.cell.raw
        if (val === 'Receita') {
          doc.setTextColor(16, 185, 129)
        } else {
          doc.setTextColor(239, 68, 68)
        }
      }
    },
  })

  doc.save(`cfp-money-extrato-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ── IMPORT CSV ──
export const parseCSVImport = (csvText) => {
  const lines = csvText.trim().split('\n')
  const transactions = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.replace(/^"|"$/g, '').trim())
    if (cols.length < 5) continue
    const [date, type, description, category, value] = cols
    const amount = parseFloat(value.replace(',', '.'))
    if (isNaN(amount)) continue
    transactions.push({
      date: date.split('/').reverse().join('-'),
      type: type === 'Receita' ? 'income' : 'expense',
      description,
      categoryName: category,
      amount,
    })
  }
  return transactions
}

// ── CLAMP ──
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// ── DEBOUNCE ──
export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
