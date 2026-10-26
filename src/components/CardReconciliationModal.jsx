import React, { useEffect, useMemo, useState } from 'react'
import { useCreditCards, useTransactions } from '../contexts/AppContext'
import { isUnlinkedCreditPurchase, previewCardReconciliation } from '../domain/cardReconciliation'
import { labelForMonth } from '../domain/creditCardCenter'
import { formatCurrency, formatDate } from '../utils'
import { Button, Modal } from './ui'

export default function CardReconciliationModal({ isOpen, onClose }) {
  const { transactions, reconcileLegacyCard, undoLegacyCard } = useTransactions()
  const { creditCards } = useCreditCards()
  const [filter, setFilter] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [cardId, setCardId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [undoId, setUndoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const pending = useMemo(
    () =>
      transactions
        .filter(isUnlinkedCreditPurchase)
        .sort((first, second) => String(second.date).localeCompare(String(first.date))),
    [transactions],
  )
  const reviewed = useMemo(
    () => transactions.filter((item) => item.cardReconciliation?.version === 1),
    [transactions],
  )
  const visible = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase('pt-BR')
    return query
      ? pending.filter((item) =>
          [item.description, item.categoryName, item.date, item.amount].some((value) =>
            String(value || '')
              .toLocaleLowerCase('pt-BR')
              .includes(query),
          ),
        )
      : pending
  }, [filter, pending])

  useEffect(() => {
    if (!isOpen) return
    if (!pending.some((item) => item.id === transactionId)) {
      setTransactionId(pending[0]?.id || '')
      setConfirmed(false)
    }
  }, [isOpen, pending, transactionId])

  const transaction = pending.find((item) => item.id === transactionId)
  const card = creditCards.find((item) => item.id === cardId)
  let preview = null
  let previewError = ''
  if (transaction && card) {
    try {
      preview = previewCardReconciliation(transaction, card)
    } catch (issue) {
      previewError = issue.message
    }
  }

  const chooseTransaction = (id) => {
    setTransactionId(id)
    setConfirmed(false)
    setError('')
  }
  const chooseCard = (id) => {
    setCardId(id)
    setConfirmed(false)
    setError('')
  }
  const confirmLink = async () => {
    if (!transaction || !card || !preview || saving) return
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setSaving(true)
    setError('')
    try {
      await reconcileLegacyCard(transaction.id, card, preview.invoiceMonth)
      setConfirmed(false)
      setCardId('')
    } catch (issue) {
      setConfirmed(false)
      setError(issue.message || 'Não foi possível salvar o vínculo.')
    } finally {
      setSaving(false)
    }
  }
  const confirmUndo = async (id) => {
    if (saving) return
    if (undoId !== id) {
      setUndoId(id)
      return
    }
    setSaving(true)
    setError('')
    try {
      await undoLegacyCard(id)
      setUndoId('')
    } catch (issue) {
      setError(issue.message || 'Não foi possível desfazer a associação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title="Conciliar compras antigas"
      size="lg"
    >
      <div className="space-y-5">
        <p className="text-xs leading-relaxed text-[--text-secondary]">
          Escolha a compra e o cartão correto. A associação não cria outra despesa, não muda o valor
          ou a data contábil e pode ser desfeita. Nada é salvo antes da sua confirmação.
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[--warning-bg] px-3 py-1.5 text-xs font-bold text-[--warning-text]">
            {pending.length} compra{pending.length === 1 ? '' : 's'} para revisar
          </span>
          <span className="rounded-full bg-[--success-bg] px-3 py-1.5 text-xs font-bold text-[--success-text]">
            {reviewed.length} {reviewed.length === 1 ? 'vínculo reversível' : 'vínculos reversíveis'}
          </span>
        </div>

        {pending.length > 0 ? (
          <>
            <label className="block space-y-1.5 text-xs font-bold text-[--text-secondary]">
              Buscar compra por nome, categoria ou data
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Localizar lançamento"
                className="w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-2.5 text-sm text-[--text-primary]"
              />
            </label>

            <div
              role="group"
              aria-label="Compras antigas sem cartão"
              className="max-h-48 space-y-2 overflow-y-auto"
            >
              {visible.slice(0, 30).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === transactionId}
                  onClick={() => chooseTransaction(item.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-xs transition-colors ${
                    item.id === transactionId
                      ? 'border-[--brand-500] bg-[--brand-50]'
                      : 'border-[--border-subtle] bg-[--bg-subtle] hover:border-[--brand-300]'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-[--text-primary]">
                      {item.description || 'Despesa no crédito'}
                    </span>
                    <span className="mt-1 block text-[--text-tertiary]">
                      {formatDate(item.date)} · {item.categoryName || 'Sem categoria'}
                      {item.isInstallment
                        ? ` · parcela ${item.installmentNum || '?'} / ${item.installmentOf || '?'}`
                        : ''}
                    </span>
                  </span>
                  <span className="flex-shrink-0 font-black tabular-nums text-[--text-primary]">
                    {formatCurrency(item.amount)}
                  </span>
                </button>
              ))}
              {!visible.length && (
                <p className="py-4 text-center text-xs text-[--text-tertiary]">
                  Nenhuma compra encontrada.
                </p>
              )}
              {visible.length > 30 && (
                <p className="text-xs text-[--text-tertiary]">
                  Mostrando 30 de {visible.length} compras. Utilize a busca para localizar outras.
                </p>
              )}
            </div>

            {transaction && (
              <section
                className="space-y-3 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-4"
                aria-label="Prévia da conciliação"
              >
                <label
                  htmlFor="legacy-card-selection"
                  className="block text-xs font-bold text-[--text-secondary]"
                >
                  Cartão ao qual esta compra pertence
                </label>
                <select
                  id="legacy-card-selection"
                  value={cardId}
                  onChange={(event) => chooseCard(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-sm font-semibold text-[--text-primary]"
                >
                  <option value="">Escolha um cartão</option>
                  {creditCards
                    .filter((item) => item.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.last4 ? `· final ${item.last4}` : ''}
                      </option>
                    ))}
                </select>
                {!creditCards.length && (
                  <p className="text-xs text-[--warning-text]">
                    Cadastre o cartão em Meus cartões antes de conciliar.
                  </p>
                )}

                {preview && (
                  <div className="space-y-2 rounded-xl border border-[--brand-200] bg-[--bg-surface] p-3 text-xs">
                    <p className="font-black text-[--text-primary]">
                      Prévia sem alteração dos valores
                    </p>
                    <div className="flex justify-between gap-3 text-[--text-secondary]">
                      <span>Compra registrada</span>
                      <strong className="text-[--text-primary]">
                        {formatCurrency(transaction.amount)}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3 text-[--text-secondary]">
                      <span>Data preservada</span>
                      <strong className="text-[--text-primary]">
                        {formatDate(transaction.date)}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3 text-[--text-secondary]">
                      <span>Fatura de destino</span>
                      <strong className="text-[--text-primary]">
                        {labelForMonth(preview.invoiceMonth)}
                      </strong>
                    </div>
                    <p className="leading-relaxed text-[--text-tertiary]">
                      {transaction.purchaseDate || transaction.originalPurchaseDate
                        ? 'Competência calculada a partir da data original da compra e do ciclo cadastrado.'
                        : 'Sem data original de compra: a competência existente foi preservada. Confira se esta fatura está correta antes de confirmar.'}
                    </p>
                  </div>
                )}
                {previewError && <p className="text-xs text-[--danger-text]">{previewError}</p>}
                <Button
                  type="button"
                  loading={saving}
                  disabled={!preview}
                  onClick={confirmLink}
                  fullWidth
                >
                  {confirmed ? 'Confirmar vínculo desta compra' : 'Revisar e vincular'}
                </Button>
                {confirmed && (
                  <p className="text-xs text-[--warning-text]">
                    Confira o cartão e a competência acima. A segunda confirmação salvará o vínculo.
                  </p>
                )}
              </section>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-[--success-bg] p-3 text-xs font-bold text-[--success-text]">
            Todas as compras de crédito identificadas possuem um cartão vinculado.
          </p>
        )}

        {reviewed.length > 0 && (
          <section className="space-y-2" aria-label="Conciliações reversíveis">
            <h4 className="text-xs font-black text-[--text-primary]">
              Vínculos realizados nesta etapa
            </h4>
            {reviewed.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[--border-subtle] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[--text-primary]">
                    {item.description || 'Compra no crédito'}
                  </p>
                  <p className="text-[10px] text-[--text-tertiary]">
                    {item.cardName} · {formatCurrency(item.amount)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => confirmUndo(item.id)}
                >
                  {undoId === item.id ? 'Confirmar desfazer' : 'Desfazer vínculo'}
                </Button>
              </div>
            ))}
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-[--danger-bg] p-3 text-xs text-[--danger-text]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
