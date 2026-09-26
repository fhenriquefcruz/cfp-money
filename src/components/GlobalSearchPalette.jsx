import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildGlobalSearchIndex, searchGlobalIndex } from '../domain/globalSearch'
import { Modal } from './ui'

export default function GlobalSearchPalette({
  onClose,
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
  isAdmin,
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const index = useMemo(
    () => buildGlobalSearchIndex({ transactions, categories, goals, creditCards, isAdmin }),
    [transactions, categories, goals, creditCards, isAdmin],
  )
  const results = searchGlobalIndex(index, query)

  const openResult = (item) => {
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (event) => {
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
    <Modal isOpen onClose={onClose} title="Buscar no Meu Real" size="lg">
      <div onKeyDown={onKeyDown}>
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          placeholder="Transação, meta, cartão ou área..."
          aria-label="Termo da busca global"
          className="min-h-12 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary] outline-none focus:ring-2 focus:ring-[--brand-500]"
        />

        <div className="mt-2 max-h-[55vh] overflow-y-auto">
          {query.trim() && !results.length ? (
            <p className="px-3 py-8 text-center text-sm font-bold text-[--text-secondary]">
              Nenhum resultado encontrado
            </p>
          ) : (
            results.map((item, position) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openResult(item)}
                className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-xs font-bold text-[--text-primary] ${
                  active === position ? 'bg-[--brand-50]' : 'hover:bg-[--bg-hover]'
                }`}
              >
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
