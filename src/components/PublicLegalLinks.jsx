import React, { useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { SUPPORT_POLICY } from '../content/commercial'
import { LEGAL_IDENTITY } from '../content/legal'
import LegalDocument from './LegalDocument'
import { Modal } from './ui'

export default function PublicLegalLinks() {
  const [documentType, setDocumentType] = useState(null)
  const supportEmail = SUPPORT_POLICY.contactEmail
  const supportHref = `mailto:${supportEmail}?subject=${encodeURIComponent('Suporte Meu Real')}`

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] leading-relaxed text-[--text-tertiary]">
        <span>Ao continuar, você concorda com os documentos aplicáveis:</span>
        <button
          type="button"
          className="font-bold text-[--text-brand] hover:underline"
          onClick={() => setDocumentType('terms')}
        >
          Termos de Uso
        </button>
        <button
          type="button"
          className="font-bold text-[--text-brand] hover:underline"
          onClick={() => setDocumentType('privacy')}
        >
          Política de Privacidade
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-bold text-[--text-brand] hover:underline"
          onClick={() => setDocumentType('support')}
        >
          <LifeBuoy size={12} />
          Suporte
        </button>
      </div>

      <Modal
        isOpen={documentType === 'terms' || documentType === 'privacy'}
        onClose={() => setDocumentType(null)}
        title={documentType === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
        size="lg"
      >
        {documentType && documentType !== 'support' && <LegalDocument type={documentType} />}
      </Modal>

      <Modal
        isOpen={documentType === 'support'}
        onClose={() => setDocumentType(null)}
        title="Fornecedor e suporte"
        size="md"
      >
        <div className="space-y-4 text-sm text-[--text-secondary]">
          <div className="rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-4">
            <p className="font-black text-[--text-primary]">{LEGAL_IDENTITY.controller}</p>
            <p className="mt-1">{LEGAL_IDENTITY.registration}</p>
            <p>{LEGAL_IDENTITY.address}</p>
          </div>

          <div>
            <p className="font-black text-[--text-primary]">Canal eletrônico</p>
            <a
              className="mt-1 block break-all text-[--text-brand] hover:underline"
              href={supportHref}
            >
              {supportEmail}
            </a>
          </div>

          <div>
            <p className="font-black text-[--text-primary]">Prazo de atendimento</p>
            <p className="mt-1">
              Meta de resposta: {SUPPORT_POLICY.responseTarget}. Prazo máximo informado:{' '}
              {SUPPORT_POLICY.responseDeadline}.
            </p>
          </div>

          <p className="text-xs text-[--text-tertiary]">
            Usuários autenticados também podem registrar solicitações pelo próprio aplicativo e
            receber um protocolo imediato.
          </p>
        </div>
      </Modal>
    </>
  )
}
