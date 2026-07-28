import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle({ compact = false, fullWidth = false, className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const actionLabel = isDark ? 'Ativar tema claro' : 'Ativar tema escuro'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={actionLabel}
      title={compact ? actionLabel : undefined}
      onClick={toggleTheme}
      className={clsx(
        'group inline-flex min-h-11 items-center rounded-xl border border-[--border-default] bg-[--bg-surface] text-[--text-secondary] shadow-sm transition-all hover:border-[--brand-300] hover:bg-[--bg-hover] hover:text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]',
        compact ? 'h-11 w-11 justify-center p-0' : 'gap-3 px-3 py-2',
        fullWidth && 'w-full justify-between',
        className,
      )}
    >
      <span
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
          isDark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-amber-100 text-amber-700',
        )}
        aria-hidden="true"
      >
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>

      {!compact && (
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-xs font-bold text-[--text-primary]">
            {isDark ? 'Tema escuro' : 'Tema claro'}
          </span>
          <span className="block text-[10px] text-[--text-tertiary]">
            {isDark ? 'Reduzir luminosidade' : 'Aumentar contraste claro'}
          </span>
        </span>
      )}

      {!compact && (
        <span
          aria-hidden="true"
          className={clsx(
            'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors',
            isDark
              ? 'border-[--brand-600] bg-[--brand-600]'
              : 'border-[--border-default] bg-[--bg-hover]',
          )}
        >
          <span
            className={clsx(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              isDark ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </span>
      )}
    </button>
  )
}
