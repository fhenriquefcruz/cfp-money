import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchGlobal } from '../domain/globalSearch'
import { Modal } from './ui'

const FAVORITE_LIMIT = 4
const favoriteKey = (uid) => `meu_real_navigation_${uid}`

const readFavorites = (uid, allowed) => {
  if (!uid) return []

  try {
    const values = JSON.parse(localStorage.getItem(favoriteKey(uid)) || '[]')
    return [...new Set(Array.isArray(values) ? values : [])]
      .filter((path) => allowed.includes(path))
      .slice(0, FAVORITE_LIMIT)
  } catch {
    return []
  }
}

const orderPages = (pages, favorites) => {
  const map = new Map(pages.map((page) => [page[1], page]))
  return [...new Set([...favorites, ...map.keys()])].map((path) => map.get(path)).filter(Boolean)
}

export default function GlobalSearchPalette(props) {
  const navigate = useNavigate()
  const allowedPaths = (props.pages || []).map(([, to]) => to)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [favorites, setFavorites] = useState(() => readFavorites(props.userId, allowedPaths))
  const orderedPages = orderPages(props.pages || [], favorites)

  const results = searchGlobal({
    query,
    ...props,
    pages: orderedPages,
  })

  const open = (item) => {
    props.onClose()
    navigate(item.to)
  }

  const toggleFavorite = (path) => {
    if (!props.userId || !allowedPaths.includes(path)) return

    const next = favorites.includes(path)
      ? favorites.filter((item) => item !== path)
      : [path, ...favorites].slice(0, FAVORITE_LIMIT)

    try {
      localStorage.setItem(favoriteKey(props.userId), JSON.stringify(next))
    } catch {
      // Favoritos locais não podem bloquear a busca.
    }

    setFavorites(next)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      props.onClose()
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
    <Modal isOpen onClose={props.onClose} title="Buscar no Meu Real" size="lg">
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

      {!query.trim() && (
        <p className="global-search-hint">Seus módulos favoritos aparecem primeiro.</p>
      )}

      <div className="global-search-results" role="listbox">
        {query.trim() && !results.length ? (
          <p className="global-search-empty">Nenhum resultado encontrado</p>
        ) : (
          results.map((item, index) => {
            const isPage = (props.pages || []).some(
              ([label, to]) => label === item.label && to === item.to,
            )
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

                {isPage && (
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.to)}
                    className="global-search-favorite"
                    aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${item.label} ${
                      favorite ? 'dos' : 'aos'
                    } favoritos`}
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
