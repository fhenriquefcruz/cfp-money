import React from 'react'
import { formatCurrency } from '../utils'

export default function MoneyValue({ value, kind = 'neutral', compact = false, className = '' }) {
  const amount = Number(value) || 0
  const formatted = formatCurrency(Math.abs(amount), { compact })
  const sign = kind === 'income' ? '+' : kind === 'expense' ? '−' : amount < 0 ? '−' : ''
  const tone =
    kind === 'income'
      ? 'text-[--success-text]'
      : kind === 'expense' || amount < 0
        ? 'text-[--danger-text]'
        : 'text-[--text-primary]'
  return (
    <span className={`tabular-nums ${tone} ${className}`}>
      {sign}
      {formatted}
    </span>
  )
}
