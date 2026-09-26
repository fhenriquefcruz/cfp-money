import React, { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { buildGlobalSearchIndex, searchGlobalIndex } from '../domain/globalSearch'

const KIND_LABELS = {
  module: 'Área',
  transaction: 'Transação',
  category: 'Categoria',
  goal: 'Meta',
  card: 'Cartão',
}

export default function GlobalSearchPalette({
  onClose,
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
  isAdmin,
}) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const index = useMemo(
    () => buildGlobalSearchIndex({ transactions, categories, goals, creditCards, isAdmin }),
    [transactions, categories, goals, creditCards, isAdmin],
  )
  const results = useMemo(() => searchGlobalIndex(index, query), [index, query])

  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => setActive(0), [query])

  const openResult = (item) => {
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') return onClose()
    if (!results.length) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => Math.max(0, Math.min(results.length - 1, current + step)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openResult(results[active])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 px-3 pt-[max(5vh,1.5rem)] backdrop-blur-sm sm:pt-[12vh]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        onKeyDown={onKeyDown}
        className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-[--border-default] bg-[--bg-elevated] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[--border-subtle] px-4">
          <span className="text-lg text-[--brand-600]" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no Meu Real..."
            aria-label="Buscar no Meu Real"
            className="min-h-14 min-w-0 flex-1 bg-transparent text-sm text-[--text-primary] outline-none placeholder:text-[--text-tertiary]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca global"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-2">
          {query.trim() && !results.length ? (
            <p className="px-4 py-10 text-center text-sm font-bold text-[--text-secondary]">
              Nenhum resultado encontrado
            </p>
          ) : (
            results.map((item, position) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActive(position)}
                onClick={() => openResult(item)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left ${
                  active === position ? 'bg-[--brand-50]' : 'hover:bg-[--bg-hover]'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[--bg-subtle] text-[--brand-600]">
                  ⌕
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-black text-[--text-primary]">
                  {item.label}
                </span>
                <span className="text-[9px] font-bold uppercase text-[--text-tertiary]">
                  {KIND_LABELS[item.kind]}
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
