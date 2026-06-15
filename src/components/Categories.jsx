// src/components/Categories.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal } from './ui'

const DEFAULT_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#06b6d4', '#f59e0b', '#6366f1', '#ec4899',
  '#6b7280', '#22c55e', '#ef4444', '#0ea5e9',
]

const EMOJI_LIST = [
  '🍔', '🍕', '🥗', '☕', '🍜', '🥤', '🍰', '🛒',
  '🚗', '⛽', '✈️', '🚌', '🚕', '🛵', '🚂', '⚓',
  '🏠', '💡', '🔧', '🛋️', '🏗️', '🪑', '🛏️', '🚿',
  '📱', '💻', '🖥️', '⌨️', '🖱️', '📷', '🎧', '📺',
  '📚', '🎓', '✏️', '📝', '🔬', '🏫', '📐', '🗂️',
  '🎮', '🎬', '🎵', '🎸', '⚽', '🏋️', '🎯', '🎲',
  '❤️', '💊', '🏥', '🦷', '👓', '🩺', '💉', '🌡️',
  '👕', '👟', '👔', '👗', '👜', '🧢', '🧣', '🕶️',
  '🎁', '🎉', '🎊', '🛍️', '💐', '🕯️', '🪴', '🧸',
  '💰', '💵', '📈', '🏦', '💳', '🪙', '💹', '📊',
  '✅', '📦', '🔑', '⭐', '🔥', '💎', '🌈', '🐶',
]

export default function Categories() {
  const { categories, createCategory, editCategory, removeCategory } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '',
    icon: '📦',
    color: DEFAULT_COLORS[0],
    type: 'expense',
  })
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef(null)
  const emojiButtonRef = useRef(null)

  // Fecha o picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = (cat = null) => {
    setShowEmojiPicker(false)
    if (cat) {
      setEditing(cat)
      setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type })
    } else {
      setEditing(null)
      setForm({ name: '', icon: '📦', color: DEFAULT_COLORS[0], type: 'expense' })
    }
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setShowEmojiPicker(false)
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

  const handleDelete = async (id) => {
    if (window.confirm('Excluir esta categoria?')) {
      await removeCategory(id)
    }
  }

  const selectEmoji = (emoji) => {
    setForm((f) => ({ ...f, icon: emoji }))
    setShowEmojiPicker(false)
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  const CategoryCard = ({ cat }) => (
    <Card key={cat.id} padding={false}>
      <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: cat.color + '20' }}
          >
            {cat.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[--text-primary] truncate">{cat.name}</p>
              {cat.isDefault && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[--bg-hover] text-[--text-tertiary] flex-shrink-0">
                  Padrão
                </span>
              )}
            </div>
            <p className="text-xs text-[--text-tertiary]">
              {cat.type === 'expense' ? 'Despesa' : 'Receita'}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => handleOpen(cat)}
            className="p-2 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] hover:text-[--text-primary] transition-colors"
            title={cat.isDefault ? 'Ver detalhes' : 'Editar'}
          >
            <Edit2 size={14} />
          </button>
          {!cat.isDefault && (
            <button
              onClick={() => handleDelete(cat.id)}
              className="p-2 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-6 pb-28 lg:pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Categorias</h1>
          <p className="text-sm text-[--text-tertiary] mt-0.5">{categories.length} categorias</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => handleOpen()}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {incomeCategories.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="font-semibold text-[--text-primary]">Nenhuma categoria</p>
          <p className="text-sm text-[--text-tertiary] mt-1 mb-4">Crie categorias para organizar suas finanças.</p>
          <Button variant="primary" icon={<Plus />} onClick={() => handleOpen()}>
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

          {/* Emoji picker */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">
              Ícone
            </label>
            <div className="relative">
              <button
                ref={emojiButtonRef}
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-[--border-strong] transition-all"
              >
                <span className="text-2xl">{form.icon}</span>
                <span className="text-sm text-[--text-secondary]">Selecionar emoji</span>
                <span className="ml-auto text-[--text-tertiary] text-xs">▼</span>
              </button>

              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute z-50 mt-1 p-3 bg-[--bg-elevated] border border-[--border-default] rounded-xl shadow-xl w-full grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto"
                  style={{ minWidth: 260 }}
                >
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => selectEmoji(emoji)}
                      className={`w-8 h-8 text-xl hover:bg-[--bg-hover] rounded-lg transition-colors flex items-center justify-center ${
                        form.icon === emoji ? 'bg-[--brand-100] ring-2 ring-[--brand-500]' : ''
                      }`}
                    >
                      {emoji}
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
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === c
                      ? 'border-white ring-2 ring-[--brand-500] scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
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
              {form.icon}
            </div>
            <div>
              <p className="font-semibold text-[--text-primary]">{form.name || 'Nome da categoria'}</p>
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
                  {t === 'expense' ? '📉 Despesa' : '📈 Receita'}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>
            {editing ? 'Salvar alterações' : 'Criar categoria'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
