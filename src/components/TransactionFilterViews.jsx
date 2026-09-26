import React, { useEffect, useMemo, useState } from 'react'
import { Bookmark, Check, Plus, Trash2 } from 'lucide-react'
import {
  areTransactionFilterViewsEqual,
  createSavedTransactionFilter,
  upsertSavedTransactionFilter,
} from '../domain/transactionFilterViews'

const STORAGE_PREFIX = 'meu-real:transaction-filter-views'

function storageKey(userId) {
  return STORAGE_PREFIX + ':' + (userId || 'local')
}

function readSavedViews(userId) {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSavedViews(userId, views) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(userId), JSON.stringify(views))
}

export default function TransactionFilterViews({ userId, filters, onApply, showNotification }) {
  const [views, setViews] = useState(() => readSavedViews(userId))
  const [name, setName] = useState('')
  const [showSave, setShowSave] = useState(false)

  useEffect(() => {
    setViews(readSavedViews(userId))
    setName('')
    setShowSave(false)
  }, [userId])

  const activeViewId = useMemo(
    () => views.find((view) => areTransactionFilterViewsEqual(view.filters, filters))?.id || null,
    [views, filters],
  )

  const saveViews = (next) => {
    setViews(next)
    writeSavedViews(userId, next)
  }

  const handleSave = () => {
    try {
      const nextItem = createSavedTransactionFilter({
        name,
        filters,
      })
      saveViews(upsertSavedTransactionFilter(views, nextItem))
      setName('')
      setShowSave(false)
      showNotification?.('Visão de filtros salva neste dispositivo.')
    } catch (error) {
      showNotification?.(error.message || 'Não foi possível salvar a visão.', 'warning')
    }
  }

  const removeView = (id) => {
    saveViews(views.filter((view) => view.id !== id))
  }

  return (
    <div className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark size={14} className="text-[--brand-600]" />
            <p className="text-xs font-black text-[--text-primary]">Visões salvas</p>
          </div>
          <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
            Reaplique combinações de filtros com um clique. Salvas somente neste dispositivo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSave((current) => !current)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[--border-default] px-3 text-xs font-bold text-[--text-secondary] hover:border-[--brand-500]"
        >
          <Plus size={13} />
          Salvar visão
        </button>
      </div>

      {showSave && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSave()
            }}
            placeholder="Ex: Despesas pendentes"
            aria-label="Nome da visão de filtros"
            className="min-h-11 flex-1 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="min-h-11 rounded-xl bg-[--brand-600] px-4 text-xs font-bold text-white hover:bg-[--brand-700] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      )}

      {views.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[--bg-subtle] px-3 py-2 text-[10px] text-[--text-tertiary]">
          Nenhuma visão salva ainda.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {views.map((view) => {
            const active = activeViewId === view.id
            const wrapperClass =
              'inline-flex min-h-10 items-center rounded-xl border ' +
              (active
                ? 'border-[--brand-300] bg-[--brand-50]'
                : 'border-[--border-default] bg-[--bg-subtle]')

            return (
              <div key={view.id} className={wrapperClass}>
                <button
                  type="button"
                  onClick={() => onApply(view.filters)}
                  className="inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-bold text-[--text-secondary]"
                  aria-pressed={active}
                >
                  {active && <Check size={12} className="text-[--brand-600]" />}
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => removeView(view.id)}
                  className="inline-flex h-10 w-10 items-center justify-center border-l border-[--border-subtle] text-[--text-tertiary] hover:text-[--danger-text]"
                  aria-label={'Excluir visão ' + view.name}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
