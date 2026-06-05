// src/components/Categories.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Input, Modal } from './ui'

const DEFAULT_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#f59e0b', '#6366f1', '#ec4899', '#6b7280']

const EMOJI_LIST = [
  '🍔', '🍕', '🥗', '☕', '🚗', '⛽', '✈️', '🏠', '💡', '📱', '💻', '📚', 
  '🎮', '🎬', '🏋️', '❤️', '💊', '👕', '👟', '🎁', '💰', '💵', '📈', '🏦',
  '🛒', '🎉', '🐶', '🐱', '🌱', '🌈', '⭐', '🔥', '💎', '🔧', '📦', '✅'
]

export default function Categories() {
  const { categories, createCategory, editCategory, removeCategory } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '📦', color: DEFAULT_COLORS[0], type: 'expense' })
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = (cat = null) => {
    if (cat) {
      setEditing(cat)
      setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type })
    } else {
      setEditing(null)
      setForm({ name: '', icon: '📦', color: DEFAULT_COLORS[0], type: 'expense' })
    }
    setModalOpen(true)
    setShowEmojiPicker(false)
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
      setModalOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Excluir esta categoria?')) await removeCategory(id)
  }

  const selectEmoji = (emoji) => {
    setForm(f => ({ ...f, icon: emoji }))
    setShowEmojiPicker(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-[--text-primary]">Categorias</h1>
        <Button variant="primary" size="sm" icon={<Plus />} onClick={() => handleOpen()}>Nova categoria</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <Card key={cat.id} padding={false}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: cat.color + '20' }}>
                  {cat.icon}
                </div>
                <div>
                  <p className="font-semibold text-[--text-primary]">{cat.name}</p>
                  <p className="text-xs text-[--text-tertiary]">{cat.type === 'expense' ? 'Despesa' : 'Receita'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpen(cat)} className="p-2 rounded-lg hover:bg-[--bg-hover]"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg hover:bg-[--danger-bg] text-[--danger-text]"><Trash2 size={14} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoria' : 'Nova categoria'}>
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          
          {/* Ícone com seletor de emojis */}
          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Ícone (emoji)</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2.5 text-2xl flex items-center gap-2 hover:border-[--border-strong] transition-all"
              >
                <span className="text-2xl">{form.icon}</span>
                <span className="text-xs text-[--text-tertiary] ml-auto">▼</span>
              </button>
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  className="absolute z-50 mt-1 p-2 bg-[--bg-surface] border border-[--border-default] rounded-xl shadow-lg w-64 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto"
                >
                  {EMOJI_LIST.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => selectEmoji(emoji)}
                      className="w-8 h-8 text-xl hover:bg-[--bg-hover] rounded-lg transition-colors flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-white ring-2 ring-[--brand-500]' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[--text-secondary] block mb-1.5">Tipo</label>
            <select 
              value={form.type} 
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))} 
              className="w-full bg-[--bg-surface] border border-[--border-default] rounded-xl px-4 py-2 text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>

          <Button variant="primary" fullWidth onClick={handleSave} loading={loading}>Salvar</Button>
        </div>
      </Modal>
    </div>
  )
}
