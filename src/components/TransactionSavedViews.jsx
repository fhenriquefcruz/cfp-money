import React, { useState } from 'react'
import { BookmarkPlus, X } from 'lucide-react'
import { Button } from './ui'

export default function TransactionSavedViews({ views, canSave, onApply, onSave, onDelete }) {
  const [isNaming, setIsNaming] = useState(false)
  const [name, setName] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    const saved = onSave(trimmed)
    if (saved === false) return

    setName('')
    setIsNaming(false)
  }

  return (
    <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-[--text-primary]">Visões salvas</p>
          <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
            Reaplique combinações de filtros sem montar tudo novamente.
          </p>
        </div>

        {!isNaming && (
          <Button
            variant="secondary"
            size="xs"
            icon={<BookmarkPlus size={12} />}
            disabled={!canSave}
            onClick={() => setIsNaming(true)}
          >
            Salvar visão
          </Button>
        )}
      </div>

      {isNaming && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            autoFocus
            value={name}
            maxLength={40}
            placeholder="Ex: Cartão pendente"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
              if (event.key === 'Escape') {
                setName('')
                setIsNaming(false)
              }
            }}
            className="min-h-10 flex-1 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-xs text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
            aria-label="Nome da visão"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                setName('')
                setIsNaming(false)
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="xs" disabled={!name.trim()} onClick={submit}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {views.length === 0 ? (
        <p className="mt-3 text-[10px] text-[--text-tertiary]">
          Nenhuma visão salva neste navegador.
        </p>
      ) : (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {views.map((view) => (
            <div
              key={view.id}
              className="saved-view-chip inline-flex min-h-10 flex-shrink-0 items-center rounded-xl border border-[--border-default] bg-[--bg-surface]"
            >
              <button
                type="button"
                className="saved-view-name min-h-10 px-3 text-xs font-bold text-[--text-secondary] hover:text-[--text-brand]"
                onClick={() => onApply(view)}
                title={view.name}
              >
                {view.name}
              </button>
              <button
                type="button"
                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[--text-tertiary] hover:bg-[--danger-bg] hover:text-[--danger-text]"
                aria-label={`Excluir visão ${view.name}`}
                onClick={() => onDelete(view.id)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
