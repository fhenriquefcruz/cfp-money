import React, { useEffect, useMemo, useState } from 'react'
import { Clock3, Download, FileText, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import {
  cancelAccountDeletion,
  exportMyData,
  getPrivacyStatus,
  recordLegalAcceptance,
  requestAccountDeletion,
} from '../services/privacyGateway'
import { LEGAL_VERSIONS } from '../content/legal'
import LegalDocument from './LegalDocument'
import { Button, Card, Modal } from './ui'

const PHRASE = 'EXCLUIR MINHA CONTA'

function downloadJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `meu-real-dados-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function SparkPrivacyDataCard() {
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [action, setAction] = useState('')
  const [legalType, setLegalType] = useState(null)
  const [acceptanceOpen, setAcceptanceOpen] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [deletionOpen, setDeletionOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const load = async () => {
    setStatus(await getPrivacyStatus())
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message))
  }, [])

  const legalSummary = useMemo(
    () =>
      status?.requiresAcceptance
        ? 'Aceitação pendente'
        : `Termos ${LEGAL_VERSIONS.terms} e Privacidade ${LEGAL_VERSIONS.privacy} aceitos`,
    [status],
  )

  const run = async (name, operation, success) => {
    setAction(name)
    setMessage('')
    try {
      const result = await operation()
      if (name === 'export') downloadJson(result)
      await load()
      setMessage(success)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setAction('')
    }
  }

  const pending = status?.deletionRequest?.status === 'pending-manual'

  return (
    <>
      <Card className="overflow-hidden" padding={false}>
        <div className="border-b border-[--border-subtle] bg-[--bg-subtle] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[--text-primary]">Privacidade e dados</h2>
              <p className="mt-1 text-xs text-[--text-tertiary]">
                Operação compatível com o plano gratuito.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-[--border-default] p-3">
            <div className="flex items-center gap-2">
              <FileText size={15} />
              <p className="text-xs font-black">Documentos jurídicos</p>
            </div>
            <p className="mt-1 text-[10px] text-[--text-tertiary]">{legalSummary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => setLegalType('terms')}>
                Termos
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setLegalType('privacy')}>
                Privacidade
              </Button>
            </div>
            {status?.requiresAcceptance && (
              <Button size="sm" fullWidth className="mt-2" onClick={() => setAcceptanceOpen(true)}>
                Revisar e aceitar
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-[--border-default] p-3">
            <div className="flex items-center gap-2">
              <Download size={15} />
              <p className="text-xs font-black">Portabilidade</p>
            </div>
            <p className="mt-1 text-[10px] text-[--text-tertiary]">
              Gera no navegador um arquivo JSON com os dados acessíveis pela própria conta.
            </p>
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              className="mt-3"
              loading={action === 'export'}
              onClick={() => run('export', exportMyData, 'Exportação gerada.')}
            >
              Exportar meus dados
            </Button>
          </div>

          {pending ? (
            <div className="rounded-2xl border border-[--warning-border] bg-[--warning-bg] p-3">
              <div className="flex items-center gap-2">
                <Clock3 size={15} />
                <p className="text-xs font-black">Exclusão solicitada</p>
              </div>
              <p className="mt-1 text-[10px]">
                No plano gratuito, a solicitação é processada manualmente pelo responsável.
              </p>
              <Button
                size="sm"
                variant="secondary"
                fullWidth
                className="mt-3"
                icon={<XCircle size={14} />}
                loading={action === 'cancel'}
                onClick={() => run('cancel', cancelAccountDeletion, 'Solicitação cancelada.')}
              >
                Cancelar solicitação
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-3">
              <div className="flex items-center gap-2">
                <Trash2 size={15} />
                <p className="text-xs font-black">Encerrar conta</p>
              </div>
              <p className="mt-1 text-[10px]">
                Registre uma solicitação para atendimento manual enquanto o backend gratuito estiver
                ativo.
              </p>
              <Button
                size="sm"
                variant="danger"
                fullWidth
                className="mt-3"
                onClick={() => setDeletionOpen(true)}
              >
                Solicitar exclusão
              </Button>
            </div>
          )}

          {message && <p className="rounded-xl border p-3 text-xs">{message}</p>}
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
        onClose={() => setAcceptanceOpen(false)}
        title="Aceitação dos documentos"
        footer={
          <Button
            fullWidth
            disabled={!accepted}
            loading={action === 'accept'}
            onClick={() =>
              run(
                'accept',
                async () => {
                  await recordLegalAcceptance({
                    accepted,
                    termsVersion: LEGAL_VERSIONS.terms,
                    privacyVersion: LEGAL_VERSIONS.privacy,
                  })
                  setAcceptanceOpen(false)
                  setAccepted(false)
                },
                'Documentos aceitos.',
              )
            }
          >
            Aceitar e continuar
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="max-h-[360px] overflow-y-auto rounded-2xl border p-3">
            <LegalDocument type="terms" compact />
            <div className="my-5 border-t" />
            <LegalDocument type="privacy" compact />
          </div>
          <label className="flex gap-3 rounded-xl border p-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span className="text-xs">Li e aceito os documentos apresentados.</span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={deletionOpen}
        onClose={() => {
          setDeletionOpen(false)
          setConfirmation('')
        }}
        title="Solicitar exclusão"
        footer={
          <Button
            variant="danger"
            fullWidth
            disabled={confirmation !== PHRASE}
            loading={action === 'delete'}
            onClick={() =>
              run(
                'delete',
                async () => {
                  await requestAccountDeletion({
                    confirmation,
                  })
                  setDeletionOpen(false)
                  setConfirmation('')
                },
                'Solicitação registrada.',
              )
            }
          >
            Registrar solicitação
          </Button>
        }
      >
        <p className="text-sm">
          Digite <strong>{PHRASE}</strong>:
        </p>
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-3 min-h-11 w-full rounded-xl border px-3"
        />
      </Modal>
    </>
  )
}
