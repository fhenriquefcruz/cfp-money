import React, { useState } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Search,
  Tags,
  Target,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchGlobal } from '../domain/globalSearch'
import { Modal } from './ui'

const KIND_LABELS = {
  page: 'Área',
  transaction: 'Transação',
  category: 'Categoria',
  goal: 'Meta',
  card: 'Cartão',
}

const KIND_ICONS = {
  transaction: ArrowLeftRight,
  category: Tags,
  goal: Target,
  card: CreditCard,
}

const PAGE_ICONS = {
  '/dashboard': LayoutDashboard,
  '/reports': BarChart3,
}

export default function GlobalSearchPalette({
  onClose,
  pages = [],
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const results = searchGlobal({ query, pages, transactions, categories, goals, creditCards })

  const openResult = ({ to }) => {
    onClose()
    navigate(to)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (!results.length) return

    if (event.key === 'Enter') {
      event.preventDefault()
      openResult(results[active])
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    setActive((current) => {
      const next = current + step
      if (next < 0) return results.length - 1
      if (next >= results.length) return 0
      return next
    })
  }

  return (
    <Modal isOpen onClose={onClose} title="Buscar no Meu Real" size="lg">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
        />
        <input
          autoFocus
          value={query}
          onKeyDown={onKeyDown}
          onChange={({ target }) => {
            setQuery(target.value)
            setActive(0)
          }}
          placeholder="Transação, meta, cartão ou área..."
          aria-label="Termo da busca global"
          className="min-h-12 w-full rounded-2xl border border-[--border-default] bg-[--bg-surface] pl-10 pr-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
        />
      </div>

      <div className="mt-3 max-h-[56vh] space-y-1 overflow-y-auto pr-1" role="listbox">
        {query.trim() && !results.length ? (
          <div className="rounded-2xl border border-dashed border-[--border-default] bg-[--bg-subtle] p-5 text-center">
            <p className="text-sm font-bold text-[--text-primary]">Nenhum resultado encontrado</p>
            <p className="mt-1 text-xs text-[--text-tertiary]">
              Tente outro termo ou procure diretamente pelo módulo.
            </p>
          </div>
        ) : (
          results.map((item, position) => {
            const ResultIcon =
              item.kind === 'page' ? PAGE_ICONS[item.to] || Search : KIND_ICONS[item.kind] || Search

            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={active === position}
                onMouseEnter={() => setActive(position)}
                onClick={() => openResult(item)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                  active === position
                    ? 'border-[--brand-300] bg-[--brand-50]'
                    : 'border-transparent hover:bg-[--bg-hover]'
                }`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--bg-hover] text-[--brand-600]">
                  <ResultIcon size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs font-black text-[--text-primary]">{item.label}</p>
                    <span className="rounded-full border border-[--border-subtle] bg-[--bg-surface] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[--text-tertiary]">
                      {KIND_LABELS[item.kind] || 'Resultado'}
                    </span>
                  </div>
                  {item.context && (
                    <p className="mt-0.5 truncate text-[10px] text-[--text-tertiary]">
                      {item.context}
                    </p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="mt-3 hidden items-center justify-between border-t border-[--border-subtle] pt-3 text-[10px] text-[--text-tertiary] sm:flex">
        <span>↑ ↓ navegar · Enter abrir · Esc fechar</span>
        <span>{results.length} resultado(s)</span>
      </div>
    </Modal>
  )
}
