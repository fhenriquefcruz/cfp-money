import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchGlobal } from '../domain/globalSearch'
import { Modal } from './ui'

export default function GlobalSearchPalette({
  onClose,
  userId,
  pages = [],
  transactions = [],
  categories = [],
  goals = [],
  creditCards = [],
}) {
  const navigate = useNavigate()
  const storageKey = `m:${userId}`
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [favorites, setFavorites] = useState(() => {
    try {
      return (localStorage.getItem(storageKey) || '')
        .split(',')
        .filter((path) => pages.some(([, to]) => to === path))
        .slice(0, 4)
    } catch {
      return []
    }
  })

  const orderedPages = [
    ...favorites.map((path) => pages.find(([, to]) => to === path)).filter(Boolean),
    ...pages.filter(([, to]) => !favorites.includes(to)),
  ]
  const results = searchGlobal({
    query,
    pages: orderedPages,
    transactions,
    categories,
    goals,
    creditCards,
  })

  const open = (item) => {
    onClose()
    navigate(item.to)
  }

  const toggleFavorite = (path) => {
    const next = favorites.includes(path)
      ? favorites.filter((item) => item !== path)
      : [path, ...favorites].slice(0, 4)

    try {
      localStorage.setItem(storageKey, next)
    } catch {}

    setFavorites(next)
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
      open(results[active])
      return
    }

    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (!step) return

    event.preventDefault()
    setActive((current) => (current + step + results.length) % results.length)
  }

  return (
    <Modal isOpen onClose={onClose} title="Busca global" size="lg">
      <input
        autoFocus
        value={query}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        placeholder="Buscar..."
        aria-label="Pesquisar"
        className="global-search-input"
      />

      <div className="global-search-results" role="listbox">
        {query && !results.length ? (
          <p className="global-search-empty">Nada encontrado</p>
        ) : (
          results.map((item, index) => {
            const favorite = favorites.includes(item.to)

            return (
              <div className="global-search-row" key={item.id}>
                <button
                  role="option"
                  aria-selected={active === index}
                  onClick={() => open(item)}
                  className={`global-search-result ${
                    active === index ? 'global-search-result--active' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <strong className="block truncate">{item.label}</strong>
                    {item.context && (
                      <small className="block truncate font-normal text-[--text-tertiary]">
                        {item.context}
                      </small>
                    )}
                  </span>
                </button>

                {item.kind === 'page' && (
                  <button
                    onClick={() => toggleFavorite(item.to)}
                    className="global-search-favorite"
                    aria-label={`Favoritar ${item.label}`}
                    aria-pressed={favorite}
                  >
                    {favorite ? '★' : '☆'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </Modal>
  )
}
