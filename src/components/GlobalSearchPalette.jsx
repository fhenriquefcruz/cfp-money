import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchGlobal } from '../domain/globalSearch'
import { Modal } from './ui'

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
          className="global-search-input"
        />

        <div className="global-search-results">
          {query.trim() && !results.length ? (
            <p className="global-search-empty">
              Nenhum resultado encontrado
            </p>
          ) : (
            results.map((item, position) => (
              <button
                key={`${item.to}:${item.label}`}
                type="button"
                onClick={() => openResult(item)}
                className={`global-search-result ${
                  active === position ? 'global-search-result--active' : ''
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
