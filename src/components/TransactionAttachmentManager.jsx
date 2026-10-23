import React, { useEffect, useRef, useState } from 'react'
import { Download, FilePlus2, Paperclip, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTransactions, useNotifications } from '../contexts/AppContext'
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENTS_PER_TRANSACTION,
  downloadTransactionAttachment,
  removeTransactionAttachment,
  uploadTransactionAttachment,
  validateReceiptFile,
} from '../services/transactionAttachments'
import { Button, Modal } from './ui'

function readableSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`
}

export default function TransactionAttachmentManager({
  transaction,
  isOpen,
  onClose,
  initialKind = 'transaction',
}) {
  const { user } = useAuth()
  const { transactions } = useTransactions()
  const { showNotification } = useNotifications()
  const [kind, setKind] = useState(initialKind)
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState([])
  const inputRef = useRef(null)
  const selected = transactions.find((item) => item.id === transaction?.id) || transaction
  const persisted = Array.isArray(selected?.attachments) ? selected.attachments : []
  const attachments = [
    ...persisted,
    ...uploaded.filter((item) => !persisted.some((saved) => saved.id === item.id)),
  ]

  useEffect(() => {
    if (!isOpen) return
    setKind(initialKind)
    setUploaded([])
  }, [isOpen, transaction?.id, initialKind])

  const addFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length || !user?.uid || !selected?.id) return
    setBusy(true)
    try {
      let count = attachments.length
      for (const file of files) {
        validateReceiptFile(file, count)
        const metadata = await uploadTransactionAttachment(user.uid, selected.id, file, kind)
        setUploaded((current) => [...current, metadata])
        count += 1
      }
      showNotification('Comprovante anexado à transação.')
    } catch (error) {
      showNotification(error.message || 'Não foi possível salvar o anexo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveFile = async (metadata) => {
    if (!user?.uid || !selected?.id) return
    setBusy(true)
    try {
      const blob = await downloadTransactionAttachment(user.uid, selected.id, metadata)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = metadata.name || 'comprovante'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 3000)
    } catch (error) {
      showNotification(error.message || 'Não foi possível baixar o arquivo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (metadata) => {
    if (!user?.uid || !selected?.id) return
    if (!window.confirm(`Excluir o comprovante "${metadata.name}"?`)) return
    setBusy(true)
    try {
      await removeTransactionAttachment(user.uid, selected.id, metadata)
      setUploaded((current) => current.filter((item) => item.id !== metadata.id))
      showNotification('Comprovante removido.')
    } catch (error) {
      showNotification(error.message || 'Não foi possível excluir o comprovante.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Comprovantes da transação"
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-[--text-tertiary]">
          Arquivos privados vinculados ao lançamento. Até {ATTACHMENTS_PER_TRANSACTION} arquivos de
          2 MB cada. Os comprovantes são baixados apenas por quem acessa esta conta.
        </p>
        <div role="group" aria-label="Tipo de comprovante" className="grid grid-cols-2 gap-2">
          {[
            ['transaction', 'Compra / lançamento'],
            ['payment', 'Pagamento'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              disabled={busy}
              className={`min-h-10 rounded-xl border px-2 text-xs font-bold transition-colors ${
                kind === value
                  ? 'border-[--brand-500] bg-[--brand-50] text-[--text-brand]'
                  : 'border-[--border-default] text-[--text-secondary] hover:bg-[--bg-hover]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Selecionar comprovantes"
          accept={ATTACHMENT_ACCEPT}
          multiple
          disabled={busy || attachments.length >= ATTACHMENTS_PER_TRANSACTION}
          onChange={addFiles}
        />
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[--border-strong] bg-[--bg-subtle] px-3 text-xs font-bold text-[--text-brand] hover:bg-[--bg-hover] disabled:opacity-50"
          disabled={busy || attachments.length >= ATTACHMENTS_PER_TRANSACTION}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Upload size={16} /> : <FilePlus2 size={16} />}
          {busy ? 'Salvando arquivos…' : 'Adicionar PDF, imagem, planilha ou documento'}
        </button>
        {attachments.length ? (
          <ul className="space-y-2" aria-label="Comprovantes vinculados">
            {attachments.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-2.5"
              >
                <Paperclip size={16} className="shrink-0 text-[--text-brand]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[--text-primary]" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-[--text-tertiary]">
                    {item.kind === 'payment' ? 'Pagamento' : 'Lançamento'} ·{' '}
                    {readableSize(item.size)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveFile(item)}
                  aria-label={`Baixar ${item.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-[--bg-hover] disabled:opacity-50"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(item)}
                  aria-label={`Excluir ${item.name}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[--danger-text] hover:bg-[--danger-bg] disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-[--border-subtle] bg-[--bg-subtle] px-4 py-5 text-center text-xs text-[--text-tertiary]">
            Nenhum comprovante nesta transação.
          </div>
        )}
      </div>
    </Modal>
  )
}
