import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchGlobal } from '../domain/globalSearch'
import { Modal } from './ui'

const storageKey = (uid) => `mr_nav_${uid}`

const readFavorites = (uid, pages) => {
  if (!uid) return []

  try {
    const allowed = pages.map(([, to]) => to)
    return JSON.parse(localStorage.getItem(storageKey(uid)) || '[]')
      .filter((path) => allowed.includes(path))
      .slice(0, 4)
  } catch {
    return []
  }
}

const orderPages = (pages, favorites) => [
  ...favorites.map((path) => pages.find(([, to]) => to === path)).filter(Boolean),
  ...pages.filter(([, to]) => !favorites.includes(to)),
]

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
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [favorites, setFavorites] = useState(() => readFavorites(userId, pages))
  const results = searchGlobal({
    query,
    pages: orderPages(pages, favorites),
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
    if (!userId) return

    const next = favorites.includes(path)
      ? favorites.filter((item) => item !== path)
      : [path, ...favorites].slice(0, 4)

    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next))
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
    <Modal isOpen onClose={onClose} title="Buscar no Meu Real" size="lg">
      <input
        autoFocus
        value={query}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
        }}
        placeholder="Transação, meta, cartão ou área..."
        aria-label="Termo da busca global"
        className="global-search-input"
      />

      <div className="global-search-results" role="listbox">
        {query.trim() && !results.length ? (
          <p className="global-search-empty">Nenhum resultado encontrado</p>
        ) : (
          results.map((item, index) => {
            const favorite = favorites.includes(item.to)

            return (
              <div className="global-search-row" key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active === index}
                  onMouseEnter={() => setActive(index)}
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
                    type="button"
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
