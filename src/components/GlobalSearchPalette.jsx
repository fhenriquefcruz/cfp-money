import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { searchGlobal } from '../domain/globalSearch'
import {
  prioritizeNavigationPages,
  readNavigationPreferences,
  registerRecentNavigation,
  toggleFavoriteNavigation,
} from '../domain/navigationPreferences'
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
  const location = useLocation()
  const { user } = useAuth()
  const allowedPaths = useMemo(() => pages.map(([, to]) => to), [pages])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [preferences, setPreferences] = useState(() =>
    readNavigationPreferences(user?.uid, allowedPaths),
  )

  useEffect(() => {
    setPreferences(registerRecentNavigation(user?.uid, location.pathname, allowedPaths))
  }, [allowedPaths, location.pathname, user?.uid])

  const orderedPages = prioritizeNavigationPages(
    pages,
    preferences.favorites,
    preferences.recents,
    location.pathname,
  )
  const results = searchGlobal({
    query,
    pages: orderedPages,
    transactions,
    categories,
    goals,
    creditCards,
  })

  const openResult = ({ to }) => {
    onClose()
    navigate(to)
  }

  const toggleFavorite = (path) => {
    setPreferences(toggleFavoriteNavigation(user?.uid, path, allowedPaths))
  }

  const onKeyDown = (event) => {
    if (!results.length) return

    if (event.key === 'Enter') {
      event.preventDefault()
      openResult(results[active])
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    setActive((current) => Math.max(0, Math.min(results.length - 1, current + step)))
  }

  return (
    <Modal isOpen onClose={onClose} title="Buscar no Meu Real" size="lg">
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
        className="global-search-input"
      />

      {!query.trim() && (
        <p className="global-search-hint">Favoritos e áreas recentes aparecem primeiro.</p>
      )}

      <div className="global-search-results">
        {query.trim() && !results.length ? (
          <p className="global-search-empty">Nenhum resultado encontrado</p>
        ) : (
          results.map((item, position) => {
            const isPage = pages.some(([label, to]) => label === item.label && to === item.to)
            const favorite = preferences.favorites.includes(item.to)

            return (
              <div className="global-search-row" key={`${item.to}:${item.label}`}>
                <button
                  type="button"
                  onClick={() => openResult(item)}
                  className={`global-search-result ${
                    active === position ? 'global-search-result--active' : ''
                  }`}
                >
                  {item.label}
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
