import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils'
import { UNCATEGORIZED_COLOR } from '../domain/categoryComposition'
import BentoCategoryIcon from './dashboard/BentoCategoryIcon'

const formatPercent = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

// A mesma legenda e a mesma escala são usadas no Dashboard e nas Transações.
export default function CategoryCompositionVisual({
  items = [],
  maxVisible = 5,
  showLeader = false,
  getHref,
  onSelect,
  selectedCategoryId = '',
  vectorIcons = false,
  onHoverCategory,
}) {
  const [expanded, setExpanded] = useState(false)
  if (!items.length) return null

  const total = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  const topThree = items.slice(0, 3).reduce((sum, item) => sum + Number(item.sharePercent || 0), 0)
  const reviewClassification = items.some(
    (item) =>
      /^(outros|sem categoria)$/i.test(String(item.categoryName || '').trim()) &&
      Number(item.sharePercent) >= 25,
  )
  const leader = items[0] || null
  const visible = expanded ? items : items.slice(0, maxVisible)
  const hidden = expanded ? [] : items.slice(maxVisible)
  const remainder = hidden.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const chartParts =
    remainder > 0
      ? [
          ...visible,
          {
            categoryId: '__remaining__',
            categoryName: `Demais categorias (${hidden.length})`,
            total: remainder,
            sharePercent: total ? (remainder / total) * 100 : 0,
            color: UNCATEGORIZED_COLOR,
          },
        ]
      : visible

  return (
    <div className="category-composition space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[--text-tertiary]">
            Distribuição por categoria
          </p>
          <p className="mt-0.5 text-base font-black tabular-nums text-[--text-primary]">
            {formatCurrency(total)}
          </p>
        </div>
        <p className="text-right text-[11px] text-[--text-secondary]">
          Top 3 <strong className="text-[--text-primary]">{formatPercent(topThree)}%</strong> dos
          gastos
        </p>
      </div>
      {showLeader && leader && (
        <div
          className="dashboard-category-leader"
          style={{ '--category-accent': leader.color || UNCATEGORIZED_COLOR }}
        >
          {vectorIcons ? (
            <BentoCategoryIcon category={leader} />
          ) : (
            <span className="dashboard-category-leader__medal" aria-hidden="true">
              {leader.icon || '◈'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
              Categoria que mais consome
            </p>
            <p className="truncate text-sm font-black text-[--text-primary]">
              {leader.categoryName}
            </p>
            <p className="text-xs font-bold tabular-nums text-[--text-secondary]">
              {formatPercent(leader.sharePercent)}% do total · {formatCurrency(leader.total)}
            </p>
          </div>
        </div>
      )}
      <div
        className="category-composition-track"
        role="img"
        aria-label={`Distribuição de despesas por ${items.length} categorias. Três maiores: ${formatPercent(topThree)}%.`}
      >
        {chartParts.map((item) => (
          <div
            key={item.categoryId || item.categoryName}
            title={`${item.categoryName}: ${formatCurrency(item.total)}, ${formatPercent(item.sharePercent)}%`}
            className="category-composition-segment"
            style={{
              '--category-accent': item.color || UNCATEGORIZED_COLOR,
              width: `${Math.max(0, Number(item.sharePercent || 0))}%`,
            }}
          />
        ))}
      </div>
      <p className="text-[10px] font-black uppercase tracking-wide text-[--text-tertiary]">
        Ranking das categorias · Top {Math.min(maxVisible, items.length)}
      </p>
      <div className="category-composition-list">
        {visible.map((item, index) => {
          const content = (
            <>
              <span className="category-composition-dot" aria-hidden="true" />
              <span className="category-composition-rank" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="category-composition-copy">
                <span className="category-composition-name">
                  {vectorIcons && <BentoCategoryIcon category={item} size={15} />}
                  {!vectorIcons && <span aria-hidden="true">{item.icon || '◈'}</span>}
                  {item.categoryName}
                </span>
                <span className="category-composition-detail">
                  {formatPercent(item.sharePercent)}% dos gastos
                  {item.changePercent != null
                    ? ` · ${item.changePercent > 0 ? '+' : ''}${formatPercent(item.changePercent)}% vs. mês anterior`
                    : ''}
                </span>
              </span>
              <strong className="category-composition-value">{formatCurrency(item.total)}</strong>
            </>
          )
          const style = { '--category-accent': item.color || UNCATEGORIZED_COLOR }
          const common = 'category-composition-item group'
          const key = item.categoryId || item.categoryName
          const href = item.categoryId && getHref?.(item)
          if (href)
            return (
              <Link
                key={key}
                to={href}
                className={common}
                style={style}
                onMouseEnter={() => onHoverCategory?.(item.categoryId)}
                onMouseLeave={() => onHoverCategory?.('')}
                onFocus={() => onHoverCategory?.(item.categoryId)}
                onBlur={() => onHoverCategory?.('')}
              >
                {content}
              </Link>
            )
          if (item.categoryId && onSelect) {
            return (
              <button
                key={key}
                type="button"
                className={common}
                style={style}
                aria-pressed={selectedCategoryId === item.categoryId}
                onMouseEnter={() => onHoverCategory?.(item.categoryId)}
                onMouseLeave={() => onHoverCategory?.('')}
                onFocus={() => onHoverCategory?.(item.categoryId)}
                onBlur={() => onHoverCategory?.('')}
                onClick={() => onSelect(item.categoryId)}
              >
                {content}
              </button>
            )
          }
          return (
            <div
              key={key}
              className={common}
              style={style}
              onMouseEnter={() => onHoverCategory?.(item.categoryId)}
              onMouseLeave={() => onHoverCategory?.('')}
            >
              {content}
            </div>
          )
        })}
      </div>
      {hidden.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="category-composition-expand"
        >
          Ver mais {hidden.length} {hidden.length === 1 ? 'categoria' : 'categorias'} ·{' '}
          {formatCurrency(remainder)}
        </button>
      )}
      {expanded && items.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="category-composition-expand"
        >
          Mostrar apenas as principais
        </button>
      )}
      {reviewClassification && (
        <p className="rounded-xl border border-[--warning-border] bg-[--warning-bg] px-3 py-2 text-[11px] font-semibold text-[--warning-text]">
          Classificação em atenção: “Outros” ou “Sem categoria” concentra pelo menos 25% dos gastos.
          Revise os lançamentos para obter uma leitura mais precisa.
        </p>
      )}
      <p className="text-[10px] leading-relaxed text-[--text-tertiary]">
        Cores identificam categorias; valores e percentuais mostram o peso de cada uma.
      </p>
    </div>
  )
}
