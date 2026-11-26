// src/components/Categories.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useCategories } from '../contexts/AppContext'
import { Card, Button, Input, Modal } from './ui'
import InfoTooltip from './InfoTooltip'
import CategoryIcon, { CATEGORY_ICON_OPTIONS } from './CategoryIcon'
import { FolderOpen, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { CATEGORY_PALETTE, categoryAccentStyle } from '../domain/categoryComposition'

// Paleta categórica oficial do Meu Real.
const DEFAULT_COLORS = CATEGORY_PALETTE

export default function Categories() {
  const { categories, createCategory, editCategory, removeCategory } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    icon: 'package',
    color: DEFAULT_COLORS[0],
    type: 'expense',
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const iconPickerRef = useRef(null)
  const iconButtonRef = useRef(null)

  // Fecha o picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        iconPickerRef.current &&
        !iconPickerRef.current.contains(event.target) &&
        iconButtonRef.current &&
        !iconButtonRef.current.contains(event.target)
      ) {
        setShowIconPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = (cat = null) => {
    setShowIconPicker(false)
    if (cat) {
      setEditing(cat)
      setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type })
    } else {
      setEditing(null)
      setForm({ name: '', icon: 'package', color: DEFAULT_COLORS[0], type: 'expense' })
    }
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setShowIconPicker(false)
    setEditing(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      if (editing) {
        await editCategory(editing.id, form)
      } else {
        await createCategory(form)
      }
      handleClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await removeCategory(categoryToDelete.id)
      setCategoryToDelete(null)
    } catch {
      setDeleteError('Não foi possível excluir a categoria. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  const selectIcon = (icon) => {
    setForm((f) => ({ ...f, icon }))
    setShowIconPicker(false)
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  const CategoryCard = ({ cat }) => (
    <Card key={cat.id} className="category-card" padding={false}>
      <div className="category-card__content flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="category-card__identity flex min-w-0 items-center gap-3">
          <div
            className="category-colored-avatar w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={categoryAccentStyle(cat)}
          >
            <CategoryIcon category={cat} size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[--text-primary] break-words leading-snug">
                {cat.name}
              </p>
              {cat.isDefault && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[--bg-subtle] text-[--text-tertiary] border border-[--border-subtle] flex-shrink-0">
                  padrão
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="category-card__actions flex flex-shrink-0 gap-2 border-l border-[--border-subtle] pl-2">
          <button
            onClick={() => handleOpen(cat)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[--border-default] text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
            title={cat.isDefault ? 'Ver detalhes' : 'Editar'}
            aria-label={`${cat.isDefault ? 'Ver detalhes de' : 'Editar'} ${cat.name}`}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          {!cat.isDefault && (
            <button
              onClick={() => {
                setDeleteError('')
                setCategoryToDelete(cat)
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[--danger-border] text-[--danger-text] transition-colors hover:bg-[--danger-bg]"
              title="Excluir"
              aria-label={`Excluir ${cat.name}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Card>
  )

  return (
    <div className="operational-page categories-premium mx-auto min-w-0 max-w-[1600px] space-y-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="operational-page__header flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[--text-primary]">Categorias</h1>
            <InfoTooltip text="Categorias padrão são globais e não podem ser excluídas. Você pode criar categorias personalizadas a qualquer momento." />
          </div>
          <p className="text-sm text-[--text-tertiary] mt-0.5">{categories.length} categorias</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<span aria-hidden="true">+</span>}
          onClick={() => handleOpen()}
        >
          <span className="hidden sm:inline">Nova categoria</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Expense categories */}
      {expenseCategories.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[--text-tertiary] uppercase tracking-wider mb-3">
            Despesas ({expenseCategories.length})
          </h2>
          <div className="operational-card-grid categories-card-grid grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-3">
            {expenseCategories.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </div>
      )}

      {/* Income categories */}
      {incomeCategories.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[--text-tertiary] uppercase tracking-wider mb-3">
            Receitas ({incomeCategories.length})
          </h2>
          <div className="operational-card-grid categories-card-grid grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-3">
            {incomeCategories.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen
            size={36}
            className="mx-auto mb-3 text-[--text-tertiary]"
            aria-hidden="true"
          />
          <p className="font-semibold text-[--text-primary]">Nenhuma categoria</p>
          <p className="text-sm text-[--text-tertiary] mt-1 mb-4">
            Crie categorias para organizar suas finanças.
          </p>
          <Button
            variant="primary"
            icon={<span aria-hidden="true">+</span>}
            onClick={() => handleOpen()}
          >
            Criar primeira categoria
          </Button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleClose}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
      >
        <div className="space-y-4">
          <Input
            label="Nome da categoria"
            placeholder="Ex: Alimentação"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          {/* Ícones de categoria */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
              Ícone
            </label>
            <div className="relative">
              <button
                ref={iconButtonRef}
                type="button"
                onClick={() => setShowIconPicker((v) => !v)}
                className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-[--border-strong] transition-all"
              >
                <CategoryIcon category={form} size={22} />
                <span className="text-sm text-[--text-secondary]">Selecionar ícone</span>
                <span className="ml-auto text-[--text-tertiary] text-xs">▼</span>
              </button>

              {showIconPicker && (
                <div
                  ref={iconPickerRef}
                  className="absolute z-50 mt-1 grid max-h-52 w-full grid-cols-4 gap-1.5 overflow-y-auto rounded-xl border border-[--border-default] bg-[--bg-elevated] p-3 shadow-xl min-[390px]:grid-cols-6 sm:grid-cols-8"
                >
                  {CATEGORY_ICON_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectIcon(id)}
                      aria-label={label}
                      className={`flex aspect-square w-full min-w-0 items-center justify-center rounded-lg text-xl transition-colors hover:bg-[--bg-hover] ${
                        form.icon === id ? 'bg-[--brand-100] ring-2 ring-[--brand-500]' : ''
                      }`}
                    >
                      <Icon size={20} aria-hidden="true" strokeWidth={1.8} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={c}
                  className={`category-palette-swatch h-11 w-11 rounded-full border-2 transition-all ${
                    form.color === c
                      ? 'border-white ring-2 ring-[--brand-500] scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ '--category-accent': c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-[--bg-subtle] rounded-xl border border-[--border-subtle]">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: form.color + '20' }}
            >
              <CategoryIcon category={form} size={20} />
            </div>
            <div>
              <p className="font-semibold text-[--text-primary]">
                {form.name || 'Nome da categoria'}
              </p>
              <p className="text-xs text-[--text-tertiary]">
                {form.type === 'expense' ? 'Despesa' : 'Receita'}
              </p>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                    form.type === t
                      ? t === 'expense'
                        ? 'bg-[--danger-bg] text-[--danger-text] border-[--danger-border]'
                        : 'bg-[--success-bg] text-[--success-text] border-[--success-border]'
                      : 'bg-[--bg-surface] text-[--text-secondary] border-[--border-default] hover:bg-[--bg-hover]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {t === 'expense' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                    {t === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>
            {editing ? 'Salvar alterações' : 'Criar categoria'}
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="Excluir categoria"
        size="sm"
        closeOnBackdrop={!deleting}
        closeOnEscape={!deleting}
      >
        <p className="text-sm text-[--text-secondary]">
          Excluir “{categoryToDelete?.name}”? Esta ação não pode ser desfeita.
        </p>
        {deleteError && (
          <p role="alert" className="mt-3 text-sm text-[--danger-text]">
            {deleteError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCategoryToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="min-h-11 rounded-xl border border-[--danger-border] bg-[--danger-bg] px-4 text-sm font-bold text-[--danger-text] hover:brightness-110 disabled:opacity-50"
          >
            {deleting ? 'Excluindo…' : 'Excluir categoria'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
