import React, { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from './ui'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const monthText = (value) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value || '')
  if (!match) return 'Selecionar mês'
  return `${MONTHS[Number(match[2]) - 1]} de ${match[1]}`
}

export default function MonthPicker({ value, onChange, label, className = '' }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value?.slice(0, 4)) || new Date().getFullYear())

  const openPicker = () => {
    setYear(Number(value?.slice(0, 4)) || new Date().getFullYear())
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label={`${label}: ${monthText(value)}`}
        aria-haspopup="dialog"
        className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-left text-sm font-semibold text-[--text-primary] hover:border-[--border-strong] focus:outline-none focus:ring-2 focus:ring-[--brand-500] ${className}`}
      >
        <CalendarDays size={16} className="shrink-0 text-[--text-tertiary]" aria-hidden="true" />
        <span className="truncate">{monthText(value)}</span>
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={label} size="sm">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setYear((current) => current - 1)}
            aria-label="Ano anterior"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[--border-default] text-[--text-primary] hover:bg-[--bg-hover]"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-lg font-bold tabular-nums text-[--text-primary]">{year}</span>
          <button
            type="button"
            onClick={() => setYear((current) => current + 1)}
            aria-label="Próximo ano"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[--border-default] text-[--text-primary] hover:bg-[--bg-hover]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`
            return (
              <button
                key={month}
                type="button"
                aria-pressed={monthKey === value}
                onClick={() => {
                  onChange(monthKey)
                  setOpen(false)
                }}
                className={`min-h-11 rounded-xl border px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[--brand-500] ${monthKey === value ? 'border-[--brand-500] bg-[--brand-50] text-[--text-brand]' : 'border-[--border-default] text-[--text-primary] hover:bg-[--bg-hover]'}`}
              >
                {month}
              </button>
            )
          })}
        </div>
      </Modal>
    </>
  )
}
