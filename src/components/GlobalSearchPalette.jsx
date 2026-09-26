import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { buildGlobalSearchIndex, searchGlobalIndex } from '../domain/globalSearch'

export default function GlobalSearchPalette({
  open,
  onClose,
  transactions,
  categories,
  goals,
  creditCards,
  isAdmin,
}) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const index = useMemo(
    () =>
      buildGlobalSearchIndex({
        transactions,
        categories,
        goals,
        creditCards,
        isAdmin,
      }),
    [transactions, categories, goals, creditCards, isAdmin],
  )
  const results = useMemo(() => searchGlobalIndex(index, query), [index, query])

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setQuery('')
    setActiveIndex(0)

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const selectResult = (result) => {
    if (!result?.to) return
    onClose()
    navigate(result.to)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(results.length - 1, current + 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(0, current - 1))
      return
    }

    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      selectResult(results[activeIndex])
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 px-3 pt-[max(5vh,1.5rem)] backdrop-blur-sm sm:pt-[12vh]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-[--border-default] bg-[--bg-elevated] shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-[--border-subtle] px-4">
          <Search size={18} className="flex-shrink-0 text-[--brand-600]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar transações, metas, cartões ou áreas..."
            className="min-h-14 min-w-0 flex-1 bg-transparent text-sm text-[--text-primary] outline-none placeholder:text-[--text-tertiary]"
            aria-label="Buscar no Meu Real"
          />
          <kbd className="hidden rounded-lg border border-[--border-default] bg-[--bg-subtle] px-2 py-1 text-[10px] font-bold text-[--text-tertiary] sm:inline-flex">
            Esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
            aria-label="Fechar busca global"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[min(65vh,32rem)] overflow-y-auto p-2">
          {!query.trim() && (
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
              Acesso rápido
            </p>
          )}

          {query.trim() && results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Search size={24} className="mx-auto text-[--text-tertiary]" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-[--text-primary]">
                Nenhum resultado encontrado
              </p>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Tente outra descrição, categoria, meta, cartão ou área do sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-1" role="listbox" aria-label="Resultados da busca global">
              {results.map((result, indexPosition) => {
                const active = activeIndex === indexPosition

                return (
                  <button
                    key={result.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(indexPosition)}
                    onClick={() => selectResult(result)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                      active ? 'bg-[--brand-50]' : 'hover:bg-[--bg-hover]'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? 'bg-[--brand-100] text-[--brand-700]'
                          : 'bg-[--bg-subtle] text-[--text-secondary]'
                      }`}
                    >
                      <Search size={15} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-[--text-primary]">
                        {result.label}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[--text-tertiary]">
                        {result.detail}
                      </p>
                    </div>

                    <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-[--text-tertiary]">
                      {result.group}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[--border-subtle] bg-[--bg-subtle] px-4 py-2.5">
          <p className="text-[10px] text-[--text-tertiary]">
            ↑↓ navegar · Enter abrir · Esc fechar
          </p>
          <p className="text-[10px] text-[--text-tertiary]">Somente leitura</p>
        </div>
      </section>
    </div>
  )
}
