import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, ShieldCheck, XCircle } from 'lucide-react'
import { buildCsvImportPreview } from '../domain/csvImport'
import { formatCurrency, PAYMENT_METHODS } from '../utils'
import { Button, Modal } from './ui'

const STATUS_CONFIG = {
  ready: {
    label: 'Pronta',
    icon: CheckCircle2,
    className: 'border-[--success-border] bg-[--success-bg] text-[--success-text]',
  },
  warning: {
    label: 'Revisar',
    icon: AlertTriangle,
    className: 'border-[--warning-border] bg-[--warning-bg] text-[--warning-text]',
  },
  error: {
    label: 'Erro',
    icon: XCircle,
    className: 'border-[--danger-border] bg-[--danger-bg] text-[--danger-text]',
  },
}

const TEMPLATE =
  'Data;Tipo;Descrição;Categoria;Valor;Pagamento\n' +
  '01/09/2026;Despesa;Almoço;Alimentação;25,90;pix\n' +
  '05/09/2026;Receita;Salário;Salário;5000,00;transfer'

export default function TransactionCsvImportModal({
  isOpen,
  onClose,
  categories,
  existingTransactions,
  onImport,
}) {
  const [sourceText, setSourceText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [importing, setImporting] = useState(false)

  const selectedRows = useMemo(
    () => preview?.rows?.filter((row) => selectedIds.has(row.id) && row.importable) || [],
    [preview, selectedIds],
  )

  const reset = () => {
    setSourceText('')
    setFileName('')
    setPreview(null)
    setSelectedIds(new Set())
    setImporting(false)
  }

  const close = () => {
    if (importing) return
    reset()
    onClose()
  }

  const analyze = () => {
    const next = buildCsvImportPreview(sourceText, {
      categories,
      existingTransactions,
      paymentMethods: PAYMENT_METHODS,
    })

    setPreview(next)
    setSelectedIds(
      new Set(
        next.rows
          .filter((row) => row.selectedByDefault)
          .map((row) => row.id),
      ),
    )
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setFileName(file.name)
    setSourceText(text)
    setPreview(null)
    setSelectedIds(new Set())
  }

  const toggleRow = (row) => {
    if (!row.importable) return

    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(row.id)) next.delete(row.id)
      else next.add(row.id)
      return next
    })
  }

  const selectRecommended = () => {
    setSelectedIds(
      new Set(
        preview.rows
          .filter((row) => row.importable && !row.duplicate)
          .map((row) => row.id),
      ),
    )
  }

  const confirmImport = async () => {
    if (!selectedRows.length || importing) return

    setImporting(true)
    try {
      await onImport(selectedRows.map((row) => row.transaction))
      reset()
      onClose()
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'modelo-importacao-meu-real.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const summary = preview?.summary

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Importar CSV"
      size="lg"
      closeOnBackdrop={!importing}
      closeOnEscape={!importing}
      footer={
        preview?.rows?.length ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" fullWidth disabled={importing} onClick={() => setPreview(null)}>
              Voltar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={importing}
              disabled={!selectedRows.length}
              onClick={confirmImport}
            >
              Importar {selectedRows.length || ''}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" fullWidth disabled={importing} onClick={close}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={!sourceText.trim()}
              onClick={analyze}
            >
              Analisar CSV
            </Button>
          </div>
        )
      }
    >
      {!preview?.rows?.length ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[--brand-200] bg-[--brand-50] p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-[--brand-700]" />
              <div>
                <p className="text-xs font-bold text-[--brand-800]">
                  Nada será gravado nesta etapa
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[--brand-700]">
                  Primeiro o Meu Real valida cada linha e mostra uma prévia. A importação só acontece
                  depois da sua confirmação.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-xs font-bold text-[--text-secondary] hover:border-[--brand-500]">
              <FileUp size={14} />
              Escolher arquivo CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleFile}
              />
            </label>
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>
              Baixar modelo
            </Button>
          </div>

          {fileName && (
            <p className="text-xs font-semibold text-[--text-secondary]">
              Arquivo selecionado: {fileName}
            </p>
          )}

          <div>
            <label
              htmlFor="csv-import-source"
              className="mb-1.5 block text-xs font-bold text-[--text-secondary]"
            >
              Conteúdo do CSV
            </label>
            <textarea
              id="csv-import-source"
              value={sourceText}
              onChange={(event) => {
                setSourceText(event.target.value)
                setPreview(null)
              }}
              rows={10}
              placeholder="Você também pode colar o CSV aqui..."
              className="w-full resize-y rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 font-mono text-xs text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
            />
          </div>

          <p className="text-[10px] leading-relaxed text-[--text-tertiary]">
            Colunas mínimas: Data, Tipo e Valor. Para despesas, informe também a Categoria. O formato
            atual de exportação do Meu Real continua compatível.
          </p>

          {preview?.fatalIssues?.map((issue) => (
            <div
              key={issue.code}
              className="rounded-xl border border-[--danger-border] bg-[--danger-bg] p-3 text-xs text-[--danger-text]"
            >
              {issue.message}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Linhas', summary.total],
              ['Prontas', summary.ready],
              ['Revisar', summary.warnings],
              ['Erros', summary.errors],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[--text-tertiary]">
                  {label}
                </p>
                <p className="mt-1 text-lg font-black tabular-nums text-[--text-primary]">{value}</p>
              </div>
            ))}
          </div>

          {summary.duplicates > 0 && (
            <div className="rounded-xl border border-[--warning-border] bg-[--warning-bg] p-3">
              <p className="text-xs font-bold text-[--warning-text]">
                {summary.duplicates} possível(is) duplicidade(s)
              </p>
              <p className="mt-1 text-[10px] text-[--warning-text]">
                Elas ficam desmarcadas por padrão. Você ainda pode incluí-las manualmente após revisar.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[--text-secondary]">
              {selectedRows.length} de {summary.total} selecionada(s) para importar
            </p>
            <button
              type="button"
              onClick={selectRecommended}
              className="min-h-10 text-xs font-bold text-[--text-brand] hover:underline"
            >
              Selecionar recomendadas
            </button>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {preview.rows.map((row) => {
              const config = STATUS_CONFIG[row.status]
              const StatusIcon = config.icon
              const tx = row.transaction

              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      disabled={!row.importable}
                      onChange={() => toggleRow(row)}
                      aria-label={`Selecionar linha ${row.rowNumber}`}
                      className="mt-1 h-4 w-4 flex-shrink-0 rounded accent-[--brand-600]"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-[--text-primary]">
                            {tx.description || tx.categoryName || `Linha ${row.rowNumber}`}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                            Linha {row.rowNumber} · {tx.date || 'data inválida'} ·{' '}
                            {tx.isSavings ? 'Poupança' : tx.type === 'income' ? 'Receita' : 'Despesa'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black tabular-nums text-[--text-primary]">
                            {formatCurrency(tx.amount || 0)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${config.className}`}
                          >
                            <StatusIcon size={11} />
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {row.issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {row.issues.map((issue) => (
                            <p
                              key={issue.code}
                              className={`text-[10px] leading-relaxed ${
                                issue.severity === 'error'
                                  ? 'text-[--danger-text]'
                                  : 'text-[--warning-text]'
                              }`}
                            >
                              {issue.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
