import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { searchGlobal } from '../domain/globalSearch'
import {
  prioritizeNavigationPages,
  readNavigationPreferences,
  registerRecentNavigation,
  toggleFavoriteNavigation,
} from '../domain/navigationPreferences'
import { Modal } from './ui'

export default function GlobalSearchPalette(props) {
  const navigate = useNavigate()
  const location = useLocation()
  const allowedPaths = useMemo(() => (props.pages || []).map(([, to]) => to), [props.pages])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [preferences, setPreferences] = useState(() =>
    readNavigationPreferences(props.userId, allowedPaths),
  )

  useEffect(() => {
    setPreferences(
      registerRecentNavigation(props.userId, location.pathname, allowedPaths),
    )
  }, [allowedPaths, location.pathname, props.userId])

  const orderedPages = prioritizeNavigationPages(
    props.pages || [],
    preferences.favorites,
    preferences.recents,
    location.pathname,
  )

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
    setPreferences(
      toggleFavoriteNavigation(props.userId, path, allowedPaths),
    )
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
        <p className="global-search-hint">Favoritos e áreas recentes aparecem primeiro.</p>
      )}

      <div className="global-search-results" role="listbox">
        {query.trim() && !results.length ? (
          <p className="global-search-empty">Nenhum resultado encontrado</p>
        ) : (
          results.map((item, index) => {
            const isPage = (props.pages || []).some(
              ([label, to]) => label === item.label && to === item.to,
            )
            const favorite = preferences.favorites.includes(item.to)

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
