import React, { useMemo, useState } from 'react'
import { CreditCard, Edit2, Info, Plus, ReceiptText, ShieldCheck, Trash2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Button, Card, Input, Modal } from './ui'
import PremiumGate from './PremiumGate'
import { normalizeCreditCard } from '../domain/creditCards'

const EMPTY_CARD = {
  name: '',
  last4: '',
  closingDay: '',
  dueDay: '',
  active: true,
}

function CardForm({ initialValue, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initialValue || EMPTY_CARD)
  const [errors, setErrors] = useState({})

  const update = (field) => (event) => {
    const value = field === 'active' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const submit = () => {
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Informe um nome para o cartão.'
    if (!Number(form.closingDay) || Number(form.closingDay) < 1 || Number(form.closingDay) > 31) {
      nextErrors.closingDay = 'Use um dia entre 1 e 31.'
    }
    if (!Number(form.dueDay) || Number(form.dueDay) < 1 || Number(form.dueDay) > 31) {
      nextErrors.dueDay = 'Use um dia entre 1 e 31.'
    }
    if (form.last4 && !/^\d{4}$/.test(form.last4)) {
      nextErrors.last4 = 'Informe exatamente os 4 últimos números.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    onSave(normalizeCreditCard(form))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-[--brand-200] bg-[--brand-50] p-3.5">
        <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
        <p className="text-xs leading-relaxed text-[--brand-700]">
          Cadastre apenas informações de identificação e calendário. Nunca informe número completo,
          código de segurança ou senha.
        </p>
      </div>

      <Input
        label="Nome do cartão"
        value={form.name}
        onChange={update('name')}
        placeholder="Ex.: Nubank"
        error={errors.name}
      />

      <Input
        label="Últimos 4 números (opcional)"
        value={form.last4}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            last4: event.target.value.replace(/\D/g, '').slice(0, 4),
          }))
        }
        inputMode="numeric"
        placeholder="1234"
        error={errors.last4}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Dia de fechamento"
          type="number"
          min="1"
          max="31"
          value={form.closingDay}
          onChange={update('closingDay')}
          error={errors.closingDay}
        />
        <Input
          label="Dia de vencimento"
          type="number"
          min="1"
          max="31"
          value={form.dueDay}
          onChange={update('dueDay')}
          error={errors.dueDay}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-[--border-default] p-3">
        <input
          type="checkbox"
          checked={form.active}
          onChange={update('active')}
          className="mt-0.5 h-4 w-4 accent-[--brand-600]"
        />
        <span>
          <span className="block text-sm font-medium text-[--text-primary]">Cartão ativo</span>
          <span className="block text-xs text-[--text-tertiary]">
            Cartões inativos permanecem no histórico, mas deixam de aparecer em novos lançamentos.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={submit} loading={loading}>
          Salvar cartão
        </Button>
      </div>
    </div>
  )
}

function CreditCardsContent() {
  const { creditCards, createCreditCard, editCreditCard, removeCreditCard, loading } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [deleteCard, setDeleteCard] = useState(null)
  const [saving, setSaving] = useState(false)

  const activeCards = useMemo(
    () => creditCards.filter((card) => card.active !== false),
    [creditCards],
  )

  const openNew = () => {
    setEditingCard(null)
    setModalOpen(true)
  }

  const openEdit = (card) => {
    setEditingCard(card)
    setModalOpen(true)
  }

  const save = async (card) => {
    setSaving(true)
    try {
      if (editingCard?.id) {
        await editCreditCard(editingCard.id, card)
      } else {
        await createCreditCard(card)
      }
      setModalOpen(false)
      setEditingCard(null)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteCard?.id) return
    setSaving(true)
    try {
      await removeCreditCard(deleteCard.id)
      setDeleteCard(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden shadow-sm" padding={false}>
        <div className="border-b border-[--border-subtle] bg-gradient-to-r from-[--brand-50] to-[--bg-surface] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-600] text-white">
                <CreditCard size={19} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[--brand-600]">
                  Cartões Premium
                </p>
                <h2 className="mt-0.5 text-sm font-black text-[--text-primary]">
                  Cartões e calendário de faturas
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
                  Centralize fechamento e vencimento para evitar lançamentos na competência errada.
                </p>
              </div>
            </div>

            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openNew}>
              Adicionar cartão
            </Button>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-3.5">
            <Info size={16} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
            <div>
              <p className="text-xs font-bold text-[--text-primary]">
                Como o Meu Real utilizará esses dados?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[--text-tertiary]">
                A data da compra será preservada, enquanto o lançamento financeiro será associado ao
                vencimento da fatura. O histórico antigo não será recalculado.
              </p>
            </div>
          </div>

          {loading.creditCards ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-2xl bg-[--bg-hover]" />
              <div className="h-20 animate-pulse rounded-2xl bg-[--bg-hover]" />
            </div>
          ) : creditCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[--border-default] bg-[--bg-subtle] p-6 text-center">
              <ReceiptText size={26} className="mx-auto text-[--text-tertiary]" />
              <p className="mt-2 text-sm font-bold text-[--text-primary]">
                Nenhum cartão cadastrado
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
                Cadastre o primeiro cartão para calcular faturas e parcelas automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {creditCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 rounded-2xl border border-[--border-default] bg-[--bg-surface] p-3.5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
                    <CreditCard size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-[--text-primary]">
                        {card.name}
                        {card.last4 ? ` •••• ${card.last4}` : ''}
                      </p>
                      {card.active === false && (
                        <span className="rounded-full bg-[--bg-hover] px-2 py-0.5 text-[10px] font-bold text-[--text-tertiary]">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[--text-tertiary]">
                      Fecha dia {card.closingDay} · vence dia {card.dueDay}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover] hover:text-[--text-brand]"
                      aria-label={`Editar cartão ${card.name}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteCard(card)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--danger-bg] hover:text-[--danger-text]"
                      aria-label={`Excluir cartão ${card.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-[--text-tertiary]">
                {activeCards.length} cartão{activeCards.length === 1 ? '' : 'ões'} ativo
                {activeCards.length === 1 ? '' : 's'} para novos lançamentos.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingCard(null)
        }}
        title={editingCard ? 'Editar cartão' : 'Adicionar cartão'}
        closeOnBackdrop={false}
      >
        <CardForm
          key={editingCard?.id || 'new'}
          initialValue={editingCard || EMPTY_CARD}
          onSave={save}
          onCancel={() => {
            setModalOpen(false)
            setEditingCard(null)
          }}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={!!deleteCard}
        onClose={() => setDeleteCard(null)}
        title="Excluir cartão?"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setDeleteCard(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={confirmDelete} loading={saving}>
              Excluir
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[--text-secondary]">
          O cadastro de <strong>{deleteCard?.name}</strong> será removido. Transações anteriores que
          já possuem o nome e os dados desse cartão serão preservadas.
        </p>
      </Modal>
    </>
  )
}

export default function CreditCardsSettingsCard() {
  return (
    <PremiumGate
      variant="card"
      feature="Cartões e calendário de faturas"
      description="Cadastre fechamento e vencimento para calcular compras e parcelas com segurança."
      benefits={[
        'Data da compra preservada',
        'Fatura calculada automaticamente',
        'Parcelas distribuídas por mês',
        'Histórico anterior mantido',
      ]}
    >
      <CreditCardsContent />
    </PremiumGate>
  )
}
