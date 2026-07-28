import React from 'react'
import { LEGAL_IDENTITY, LEGAL_VERSIONS, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../content/legal'

export default function LegalDocument({ type = 'privacy', compact = false }) {
  const isTerms = type === 'terms'
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS
  const version = isTerms ? LEGAL_VERSIONS.terms : LEGAL_VERSIONS.privacy

  return (
    <article
      className={`text-[--text-secondary] ${compact ? 'space-y-4 text-xs' : 'space-y-5 text-sm'}`}
    >
      <header className="rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-4">
        <h2 className="text-lg font-black text-[--text-primary]">
          {isTerms ? 'Termos de Uso' : 'Política de Privacidade'}
        </h2>
        <p className="mt-1 text-xs text-[--text-tertiary]">
          Versão {version} · {LEGAL_IDENTITY.controller}
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="font-black text-[--text-primary]">{section.title}</h3>
          <div className="mt-2 space-y-2 leading-relaxed">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
