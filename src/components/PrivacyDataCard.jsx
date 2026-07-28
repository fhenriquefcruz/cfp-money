import React, { useEffect, useMemo, useState } from 'react'
import { Clock3, Download, FileText, RefreshCw, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import {
  cancelAccountDeletion,
  exportMyData,
  getPrivacyStatus,
  recordLegalAcceptance,
  requestAccountDeletion,
} from '../services/backend'
import { LEGAL_VERSIONS } from '../content/legal'
import LegalDocument from './LegalDocument'
import { Button, Card, Modal } from './ui'

const DELETION_PHRASE = 'EXCLUIR MINHA CONTA'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR')
}

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  anchor.href = url
  anchor.download = `meu-real-dados-${date}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function PrivacyDataCard() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [message, setMessage] = useState('')
  const [legalType, setLegalType] = useState(null)
  const [acceptanceOpen, setAcceptanceOpen] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [deletionOpen, setDeletionOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const deletionPending = Boolean(
    status?.deletionRequest && ['pending', 'processing'].includes(status.deletionRequest.status),
  )

  const legalSummary = useMemo(
    () =>
      status?.requiresAcceptance
        ? 'Aceitação pendente'
        : `Termos ${LEGAL_VERSIONS.terms} e Privacidade ${LEGAL_VERSIONS.privacy} aceitos`,
    [status],
  )

  const loadStatus = async () => {
    setLoading(true)
    setMessage('')

    try {
      setStatus(await getPrivacyStatus())
    } catch (error) {
      setMessage(error?.message || 'Não foi possível consultar a área de privacidade.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const exportData = async () => {
    setAction('export')
    setMessage('')

    try {
      downloadJson(await exportMyData())
      setMessage('Exportação gerada com sucesso.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível gerar a exportação.')
    } finally {
      setAction('')
    }
  }

  const acceptLegal = async () => {
    setAction('accept')
    setMessage('')

    try {
      await recordLegalAcceptance({
        accepted,
        termsVersion: LEGAL_VERSIONS.terms,
        privacyVersion: LEGAL_VERSIONS.privacy,
      })
      setAcceptanceOpen(false)
      setAccepted(false)
      await loadStatus()
      setMessage('Documentos jurídicos aceitos.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível registrar a aceitação.')
    } finally {
      setAction('')
    }
  }

  const requestDeletion = async () => {
    setAction('delete')
    setMessage('')

    try {
      await requestAccountDeletion({
        confirmation,
      })
      setDeletionOpen(false)
      setConfirmation('')
      await loadStatus()
      setMessage('Exclusão agendada. Você pode cancelar durante o prazo de segurança.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível solicitar a exclusão.')
    } finally {
      setAction('')
    }
  }

  const cancelDeletion = async () => {
    setAction('cancel-delete')
    setMessage('')

    try {
      await cancelAccountDeletion()
      await loadStatus()
      setMessage('Solicitação de exclusão cancelada.')
    } catch (error) {
      setMessage(error?.message || 'Não foi possível cancelar a exclusão.')
    } finally {
      setAction('')
    }
  }

  return (
    <>
      <Card className="overflow-hidden" padding={false}>
        <div className="border-b border-[--border-subtle] bg-[--bg-subtle] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[--text-primary]">Privacidade e dados</h2>
              <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
                Consulte os documentos aplicáveis, exporte seus dados ou solicite o encerramento da
                conta.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex min-h-20 items-center justify-center">
              <RefreshCw size={18} className="animate-spin text-[--brand-600]" />
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-[--border-default] p-3">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-[--brand-600]" />
                  <p className="text-xs font-black text-[--text-primary]">Documentos jurídicos</p>
                </div>
                <p className="mt-1 text-[10px] text-[--text-tertiary]">{legalSummary}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setLegalType('terms')}>
                    Termos
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setLegalType('privacy')}>
                    Privacidade
                  </Button>
                </div>

                {status?.requiresAcceptance && (
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    className="mt-2"
                    onClick={() => setAcceptanceOpen(true)}
                  >
                    Revisar e aceitar
                  </Button>
                )}
              </div>

              <div className="rounded-2xl border border-[--border-default] p-3">
                <div className="flex items-center gap-2">
                  <Download size={15} className="text-[--brand-600]" />
                  <p className="text-xs font-black text-[--text-primary]">Portabilidade</p>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
                  Baixe um arquivo JSON com cadastro, lançamentos, cartões, metas, orçamentos e
                  demais dados vinculados à conta.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  className="mt-3"
                  loading={action === 'export'}
                  onClick={exportData}
                >
                  Exportar meus dados
                </Button>
              </div>

              {deletionPending ? (
                <div className="rounded-2xl border border-[--warning-border] bg-[--warning-bg] p-3">
                  <div className="flex items-center gap-2">
                    <Clock3 size={15} className="text-[--warning-text]" />
                    <p className="text-xs font-black text-[--warning-text]">Exclusão agendada</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[--warning-text]">
                    Processamento previsto para {formatDateTime(status.deletionRequest.scheduledAt)}
                    .
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="mt-3"
                    loading={action === 'cancel-delete'}
                    icon={<XCircle size={14} />}
                    onClick={cancelDeletion}
                  >
                    Cancelar exclusão
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-3">
                  <div className="flex items-center gap-2">
                    <Trash2 size={15} className="text-[--danger-text]" />
                    <p className="text-xs font-black text-[--danger-text]">Encerrar conta</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[--danger-text]">
                    A exclusão possui prazo de segurança de sete dias e remove os dados abrangidos
                    pelo procedimento.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    className="mt-3"
                    onClick={() => setDeletionOpen(true)}
                  >
                    Solicitar exclusão
                  </Button>
                </div>
              )}
            </>
          )}

          {message && (
            <p className="rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-secondary]">
              {message}
            </p>
          )}
        </div>
      </Card>

      <Modal
        isOpen={Boolean(legalType)}
        onClose={() => setLegalType(null)}
        title={legalType === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
        size="lg"
      >
        {legalType && <LegalDocument type={legalType} />}
      </Modal>

      <Modal
        isOpen={acceptanceOpen}
        onClose={() => {
          setAcceptanceOpen(false)
          setAccepted(false)
        }}
        title="Aceitação dos documentos"
        size="lg"
        footer={
          <Button
            variant="primary"
            fullWidth
            disabled={!accepted}
            loading={action === 'accept'}
            onClick={acceptLegal}
          >
            Aceitar e continuar
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-[--border-default] p-3">
            <LegalDocument type="terms" compact />
            <div className="my-5 border-t border-[--border-subtle]" />
            <LegalDocument type="privacy" compact />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[--border-default] p-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[--brand-600]"
            />
            <span className="text-xs leading-relaxed text-[--text-secondary]">
              Li e aceito os Termos de Uso e a Política de Privacidade nas versões indicadas.
            </span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={deletionOpen}
        onClose={() => {
          setDeletionOpen(false)
          setConfirmation('')
        }}
        title="Solicitar exclusão da conta"
        footer={
          <Button
            variant="danger"
            fullWidth
            disabled={confirmation.trim().toUpperCase() !== DELETION_PHRASE}
            loading={action === 'delete'}
            onClick={requestDeletion}
          >
            Agendar exclusão
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[--text-secondary]">
            Antes de prosseguir, exporte os dados que deseja conservar. Após sete dias, o
            procedimento removerá a conta e os registros abrangidos.
          </p>
          <div className="rounded-xl border border-[--danger-border] bg-[--danger-bg] p-3 text-xs text-[--danger-text]">
            Digite exatamente:
            <strong className="mt-1 block">{DELETION_PHRASE}</strong>
          </div>
          <input
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
          />
        </div>
      </Modal>
    </>
  )
}
