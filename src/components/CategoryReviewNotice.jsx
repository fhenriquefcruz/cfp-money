import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CategoryReviewNotice({
  summary,
  onReview,
  reviewActive = false,
  compact = false,
}) {
  const missing = Number(summary?.missingCategory) || 0
  const suspected = Number(summary?.suspectedCategory) || 0
  if (!missing && !suspected) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 py-2.5 ${compact ? 'mb-3' : ''}`}
    >
      <div>
        <p className="text-xs font-bold text-[--warning-text]">
          {missing} {missing === 1 ? 'lançamento sem categoria' : 'lançamentos sem categoria'} ·{' '}
          {suspected} {suspected === 1 ? 'classificação suspeita' : 'classificações suspeitas'}
        </p>
        {!compact && (
          <p className="mt-0.5 text-xs text-[--warning-text]">
            Nenhuma categoria será alterada automaticamente.
          </p>
        )}
      </div>
      {onReview ? (
        <button
          type="button"
          onClick={onReview}
          aria-pressed={reviewActive}
          className="min-h-10 rounded-xl border border-[--warning-border] px-3 text-xs font-bold text-[--warning-text] hover:bg-[--bg-hover]"
        >
          {reviewActive ? 'Mostrar todas' : 'Revisar agora'}
        </button>
      ) : (
        <Link
          to="/transactions?review=categories&scope=all"
          className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[--warning-border] px-3 text-xs font-bold text-[--warning-text] hover:bg-[--bg-hover]"
        >
          Revisar agora <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
