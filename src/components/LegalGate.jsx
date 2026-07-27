import React, {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  AlertTriangle,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  getPrivacyStatus,
  recordLegalAcceptance,
} from '../services/privacyGateway'
import { LEGAL_VERSIONS } from '../content/legal'
import LegalDocument from './LegalDocument'
import { Button, Modal } from './ui'

const ENFORCE_LEGAL_GATE =
  import.meta.env.VITE_ENFORCE_LEGAL_GATE === 'true'

export default function LegalGate() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [tab, setTab] = useState('terms')
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setStatus(await getPrivacyStatus())
    } catch (statusError) {
      console.error(
        '[Meu Real] Consentimento jurídico:',
        statusError,
      )
      setError(
        statusError?.message ||
          'Não foi possível validar os documentos jurídicos.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const confirm = async () => {
    setSaving(true)
    setError('')

    try {
      await recordLegalAcceptance({
        accepted,
        termsVersion: LEGAL_VERSIONS.terms,
        privacyVersion: LEGAL_VERSIONS.privacy,
      })
      setStatus((current) => ({
        ...current,
        requiresAcceptance: false,
      }))
    } catch (acceptError) {
      setError(
        acceptError?.message ||
          'Não foi possível registrar a aceitação.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 shadow-lg">
        <Loader2
          size={18}
          className="animate-spin text-[--brand-600]"
        />
      </div>
    )
  }

  if (error && ENFORCE_LEGAL_GATE) {
    return (
      <Modal
        isOpen
        onClose={() => {}}
        closeOnBackdrop={false}
        closeOnEscape={false}
        size="md"
        footer={
          <Button
            variant="primary"
            fullWidth
            icon={<RefreshCw size={15} />}
            onClick={loadStatus}
          >
            Tentar novamente
          </Button>
        }
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[--warning-bg] text-[--warning-text]">
            <AlertTriangle size={21} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[--text-primary]">
              Verificação indisponível
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[--text-secondary]">
              Não foi possível confirmar a versão dos Termos e
              da Política de Privacidade. O acesso permanece
              protegido até a conexão ser restabelecida.
            </p>
          </div>
          <p className="rounded-xl border border-[--border-default] bg-[--bg-subtle] p-3 text-xs text-[--text-tertiary]">
            {error}
          </p>
        </div>
      </Modal>
    )
  }

  if (!status?.requiresAcceptance) return null

  return (
    <Modal
      isOpen
      onClose={() => {}}
      closeOnBackdrop={false}
      closeOnEscape={false}
      size="lg"
      footer={
        <Button
          variant="primary"
          fullWidth
          disabled={!accepted}
          loading={saving}
          icon={<FileCheck2 size={15} />}
          onClick={confirm}
        >
          Aceitar e entrar
        </Button>
      }
    >
      <div className="space-y-4">
        <header className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-100] text-[--brand-600]">
            <ShieldCheck size={19} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[--text-primary]">
              Transparência e privacidade
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              Revise os documentos atuais para continuar
              usando o Meu Real.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
              tab === 'terms'
                ? 'border-[--brand-500] bg-[--brand-50] text-[--brand-700]'
                : 'border-[--border-default] text-[--text-secondary]'
            }`}
          >
            Termos
          </button>
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
              tab === 'privacy'
                ? 'border-[--brand-500] bg-[--brand-50] text-[--brand-700]'
                : 'border-[--border-default] text-[--text-secondary]'
            }`}
          >
            Privacidade
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-[--border-default] p-3">
          <LegalDocument type={tab} compact />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[--border-default] p-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) =>
              setAccepted(event.target.checked)
            }
            className="mt-1 h-4 w-4 accent-[--brand-600]"
          />
          <span className="text-xs leading-relaxed text-[--text-secondary]">
            Li e aceito os Termos de Uso e a Política
            de Privacidade.
          </span>
        </label>

        {error && (
          <p className="rounded-xl border border-[--danger-border] bg-[--danger-bg] p-3 text-xs text-[--danger-text]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
