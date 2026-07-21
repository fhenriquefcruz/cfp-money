// src/utils/index.jsx
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── CAPITALIZE ──
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ── CURRENCY ──
export const formatCurrency = (value, options = {}) => {
  const { compact = false } = options
  if (compact && Math.abs(value) >= 1000) {
    const sign = value < 0 ? '-' : ''
    if (Math.abs(value) >= 1000000) return `${sign}R$ ${(Math.abs(value) / 1000000).toFixed(1)}M`
    return `${sign}R$ ${(Math.abs(value) / 1000).toFixed(1)}k`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ── DATE ──
export const formatDate = (date, fmt = 'dd/MM/yyyy') => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ptBR })
}

export const formatMonth = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return capitalize(format(d, "MMMM 'de' yyyy", { locale: ptBR }))
}

export const formatRelativeDate = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7) return `${diff} dias atrás`
  return formatDate(d)
}

export const formatPercent = (value, total) => {
  if (!total) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

export const hexToRgba = (hex, alpha = 1) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return `rgba(99,102,241,${alpha})`
  return `rgba(${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)},${alpha})`
}

// ── TRANSACTION HELPERS ──
export const groupByMonth = (transactions) => {
  const groups = {}
  transactions.forEach((tx) => {
    const key = format(new Date(tx.date + 'T00:00:00'), 'yyyy-MM')
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return groups
}

export const getMonthlyData = (transactions, months = 6, baseDate = new Date()) => {
  const result = []
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(baseDate, i)
    const year = date.getFullYear()
    const month = date.getMonth()
    const txs = transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
    const income = txs
      .filter((t) => t.type === 'income' && !t.isSavings)
      .reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savings = txs.filter((t) => t.isSavings).reduce((s, t) => s + t.amount, 0)
    result.push({
      month: capitalize(format(date, 'MMM', { locale: ptBR })),
      fullMonth: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      income,
      expenses,
      savings,
      balance: income - expenses,
    })
  }
  return result
}

// ── PAYMENT METHODS ──
export const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', icon: '💸' },
  { id: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
  { id: 'debit_card', label: 'Cartão de Débito', icon: '🏧' },
  { id: 'cash', label: 'Dinheiro', icon: '💵' },
  { id: 'transfer', label: 'Transferência', icon: '🏦' },
  { id: 'boleto', label: 'Boleto', icon: '📄' },
]

export const getPaymentLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label || id

// ── CSV EXPORT ──
export const exportToCSV = (transactions, categories) => {
  const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Pagamento', 'Poupança']
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.isSavings ? 'Poupança' : t.type === 'income' ? 'Receita' : 'Despesa',
    t.description || '',
    t.categoryName || '',
    t.amount.toFixed(2).replace('.', ','),
    getPaymentLabel(t.paymentMethod),
    t.isSavings ? 'Sim' : 'Não',
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `meu-real-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
}

// ── PDF EXPORT ──
export const exportToPDF = async (transactions, categories, summary = {}) => {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const today = format(new Date(), "dd/MM/yyyy 'às' HH:mm")
  const W = 210 // largura A4

  // ── Cabeçalho ──
  // Fundo gradiente simulado
  doc.setFillColor(67, 56, 202) // indigo-700
  doc.rect(0, 0, W, 40, 'F')
  doc.setFillColor(99, 102, 241) // indigo-500
  doc.rect(100, 0, W, 40, 'F')

  // Logo / nome
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Meu Real', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 255)
  doc.text('Controle Financeiro Pessoal', 14, 25)
  doc.text(`Gerado em ${today}`, 14, 31)

  // Período no canto direito
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('EXTRATO FINANCEIRO', W - 14, 18, { align: 'right' })

  // ── Cards de resumo ──
  const cards = [
    { label: 'Receitas', value: summary.income || 0, r: 16, g: 185, b: 129 }, // green
    { label: 'Despesas', value: summary.expenses || 0, r: 239, g: 68, b: 68 }, // red
    {
      label: 'Saldo',
      value: summary.balance || 0,
      r: (summary.balance || 0) >= 0 ? 79 : 239,
      g: (summary.balance || 0) >= 0 ? 70 : 68,
      b: (summary.balance || 0) >= 0 ? 229 : 68,
    },
    { label: 'Poupança', value: summary.savings || 0, r: 79, g: 70, b: 229 }, // indigo
  ]

  const cw = (W - 28 - 9) / 4 // largura de cada card
  cards.forEach((card, i) => {
    const x = 14 + i * (cw + 3)
    // Sombra leve
    doc.setFillColor(230, 230, 240)
    doc.roundedRect(x + 0.5, 45.5, cw, 22, 3, 3, 'F')
    // Card
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, 45, cw, 22, 3, 3, 'F')
    // Barra colorida no topo do card
    doc.setFillColor(card.r, card.g, card.b)
    doc.roundedRect(x, 45, cw, 4, 1.5, 1.5, 'F')
    doc.rect(x, 47, cw, 2, 'F') // corrige canto inferior da barra
    // Texto
    doc.setTextColor(120, 120, 140)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(card.label.toUpperCase(), x + 3, 54)
    doc.setTextColor(card.r, card.g, card.b)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(card.value), x + 3, 62)
  })

  // ── Taxa de poupança ──
  const savingRate =
    (summary.income || 0) > 0
      ? (((summary.income || 0) - (summary.expenses || 0)) / (summary.income || 0)) * 100
      : 0
  const rateColor =
    savingRate >= 20 ? [16, 185, 129] : savingRate >= 10 ? [245, 158, 11] : [239, 68, 68]
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 100)
  doc.text(`Taxa de poupança: `, 14, 76)
  doc.setTextColor(...rateColor)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `${savingRate.toFixed(1)}% ${savingRate >= 20 ? '✓ Ótimo' : savingRate >= 10 ? '! Razoável' : '⚠ Atenção'}`,
    50,
    76,
  )

  // ── Tabela de transações ──
  const rows = transactions
    .slice(0, 300)
    .map((t) => [
      formatDate(t.date),
      t.isSavings ? 'Poupança' : t.type === 'income' ? 'Receita' : 'Despesa',
      t.description || (t.isSavings ? 'Depósito em Poupança' : '-'),
      t.categoryName || '-',
      formatCurrency(t.amount),
      getPaymentLabel(t.paymentMethod) || '-',
    ])

  autoTable(doc, {
    startY: 82,
    head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Pagamento']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [67, 56, 202],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 40, 60],
    },
    alternateRowStyles: { fillColor: [247, 248, 255] },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 62 },
      3: { cellWidth: 38 },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 26, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const v = data.cell.raw
        data.cell.styles.textColor =
          v === 'Receita' ? [16, 185, 129] : v === 'Poupança' ? [79, 70, 229] : [239, 68, 68]
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.section === 'body' && data.column.index === 4) {
        const tx = transactions[data.row.index]
        if (tx) {
          data.cell.styles.textColor = tx.isSavings
            ? [79, 70, 229]
            : tx.type === 'income'
              ? [16, 185, 129]
              : [239, 68, 68]
        }
      }
    },
    // Rodapé com totais
    foot: [
      ['', '', '', 'TOTAIS', formatCurrency((summary.income || 0) - (summary.expenses || 0)), ''],
    ],
    footStyles: {
      fillColor: [240, 240, 255],
      textColor: [67, 56, 202],
      fontStyle: 'bold',
      fontSize: 8,
    },
    margin: { left: 14, right: 14 },
  })

  // ── Rodapé de página ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 180)
    doc.setFont('helvetica', 'normal')
    doc.text('Meu Real — Controle Financeiro Pessoal', 14, 292)
    doc.text(`Página ${i} de ${pageCount}`, W - 14, 292, { align: 'right' })
    // Linha separadora
    doc.setDrawColor(220, 220, 235)
    doc.setLineWidth(0.3)
    doc.line(14, 288, W - 14, 288)
  }

  doc.save(`meu-real-extrato-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ── IMPORT CSV ──
export const parseCSVImport = (csvText) => {
  const lines = csvText.trim().split('\n')
  const txs = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.replace(/^"|"$/g, '').trim())
    if (cols.length < 5) continue
    const [date, type, description, category, value] = cols
    const amount = parseFloat(value.replace(',', '.'))
    if (isNaN(amount)) continue
    txs.push({
      date: date.split('/').reverse().join('-'),
      type: type === 'Receita' ? 'income' : 'expense',
      isSavings: type === 'Poupança',
      description,
      categoryName: category,
      amount,
    })
  }
  return txs
}

// ── CLAMP & DEBOUNCE ──
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
