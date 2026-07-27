import React, { useEffect, useState } from 'react'
import {
  FileCheck2,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import {
  getPrivacyStatus,
  recordLegalAcceptance,
} from '../services/backend'
import { LEGAL_VERSIONS } from '../content/legal'
import LegalDocument from './LegalDocument'
import { Button, Modal } from './ui'

export default function LegalGate() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [tab, setTab] = useState('terms')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getPrivacyStatus()
      .then((result) => {
        if (active) setStatus(result)
      })
      .catch((statusError) => {
        console.error(
          '[Meu Real] Consentimento jurídico:',
          statusError,
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

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
