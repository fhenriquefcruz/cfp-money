import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

const MONTHS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2026, month, 1)),
)
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function calendarMonth(value) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value || '')
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

export default function CalendarDateField({
  label,
  error,
  icon,
  className,
  id,
  value = '',
  onChange,
  min,
  max,
  disabled,
  required,
  name,
  ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = `${inputId}-error`
  const calendarId = `${inputId}-calendar`
  const anchorRef = useRef(null)
  const popupRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [month, setMonth] = useState(() => calendarMonth(value))
  const [position, setPosition] = useState({ top: 0, left: 8 })

  const openCalendar = () => {
    if (disabled) return
    setMonth(calendarMonth(value))
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    const reposition = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const popupWidth = Math.min(320, window.innerWidth - 16)
      const popupHeight = 365
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8)),
        top:
          rect.bottom + popupHeight + 12 <= window.innerHeight
            ? rect.bottom + 6
            : Math.max(8, rect.top - popupHeight - 6),
      })
    }
    const outside = (event) => {
      if (
        !anchorRef.current?.contains(event.target) &&
        !popupRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setIsOpen(false)
        anchorRef.current?.querySelector('input')?.focus()
      }
    }
    reposition()
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [isOpen])

  const select = (isoDate) => {
    if (isoDate && ((min && isoDate < min) || (max && isoDate > max))) return
    // Compatible with the native input onChange handlers already used by the forms.
    onChange?.({ target: { value: isoDate, name: name || '' } })
    setIsOpen(false)
  }

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const slots = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) =>
    index < offset || index >= offset + days ? null : index - offset + 1,
  )
  const today = toIsoDate(new Date())
  const years = Array.from({ length: 19 }, (_, index) => year - 9 + index)

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[--text-secondary]">
          {label}
        </label>
      )}
      <div ref={anchorRef} className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]">
            {icon}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          name={name}
          type="date"
          value={value || ''}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          onChange={onChange}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            openCalendar()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
              event.preventDefault()
              openCalendar()
            }
          }}
          aria-expanded={isOpen}
          aria-controls={isOpen ? calendarId : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : props['aria-describedby']}
          className={clsx(
            'meu-real-date-input w-full min-w-0 rounded-xl border bg-[--bg-surface] px-4 py-2.5 pr-11 text-sm text-[--text-primary] transition-colors focus:outline-none focus:ring-2 focus:ring-[--brand-500]',
            icon && 'pl-10',
            error ? 'border-[--danger-border]' : 'border-[--border-default]',
            disabled && 'cursor-not-allowed opacity-60',
            !disabled && 'cursor-pointer',
            className,
          )}
        />
        <button
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
          disabled={disabled}
          aria-label={`Abrir calendário${label ? ` de ${label}` : ''}`}
          aria-expanded={isOpen}
          aria-controls={isOpen ? calendarId : undefined}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[--brand-700] transition-colors hover:bg-[--brand-100] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand-500] disabled:opacity-50"
        >
          <CalendarDays size={17} />
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-[--danger-text]">
          {error}
        </p>
      )}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={calendarId}
            ref={popupRef}
            role="dialog"
            aria-label={`Selecionar data${label ? `: ${label}` : ''}`}
            className="meu-real-calendar fixed z-[1100] w-[min(320px,calc(100vw-16px))] max-h-[calc(100dvh-16px)] overflow-y-auto rounded-2xl border border-[--border-default] bg-[--bg-elevated] p-3 text-[--text-primary] shadow-2xl"
            style={{ top: position.top, left: position.left }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
                aria-label="Mês anterior"
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[--bg-hover]"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex min-w-0 items-center gap-1">
                <select
                  aria-label="Mês"
                  value={monthIndex}
                  onChange={(event) => setMonth(new Date(year, Number(event.target.value), 1))}
                  className="min-w-0 rounded-lg bg-[--bg-subtle] px-1 py-2 text-xs font-bold capitalize"
                >
                  {MONTHS.map((item, index) => (
                    <option key={item} value={index}>{item}</option>
                  ))}
                </select>
                <select
                  aria-label="Ano"
                  value={year}
                  onChange={(event) => setMonth(new Date(Number(event.target.value), monthIndex, 1))}
                  className="rounded-lg bg-[--bg-subtle] px-1 py-2 text-xs font-bold"
                >
                  {years.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
                aria-label="Próximo mês"
                className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[--bg-hover]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1 text-[10px] font-bold text-[--text-tertiary]">
                  {day}
                </span>
              ))}
              {slots.map((day, index) => {
                const iso = day ? toIsoDate(new Date(year, monthIndex, day)) : ''
                const blocked = !day || Boolean((min && iso < min) || (max && iso > max))
                return day ? (
                  <button
                    key={iso}
                    type="button"
                    disabled={blocked}
                    aria-label={new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
                      new Date(year, monthIndex, day),
                    )}
                    aria-pressed={iso === value}
                    onClick={() => select(iso)}
                    className={clsx(
                      'flex aspect-square min-h-9 items-center justify-center rounded-xl text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[--brand-500]',
                      iso === value
                        ? 'bg-[--brand-600] text-white'
                        : iso === today
                          ? 'border border-[--brand-400] text-[--brand-700]'
                          : 'hover:bg-[--brand-100]',
                      blocked && 'cursor-not-allowed opacity-30',
                    )}
                  >
                    {day}
                  </button>
                ) : <span key={`empty-${index}`} aria-hidden="true" />
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[--border-subtle] pt-3">
              <button
                type="button"
                onClick={() => select(today)}
                disabled={Boolean((min && today < min) || (max && today > max))}
                className="min-h-9 rounded-lg px-3 text-xs font-bold text-[--text-brand] hover:bg-[--bg-hover] disabled:opacity-40"
              >
                Hoje
              </button>
              {!required && (
                <button
                  type="button"
                  onClick={() => select('')}
                  className="min-h-9 rounded-lg px-3 text-xs text-[--text-secondary] hover:bg-[--bg-hover]"
                >
                  Limpar data
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
