// src/components/ui.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconRight,
  className,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--brand-500] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[--brand-600] text-white hover:bg-[--brand-700] shadow-sm',
    secondary:
      'bg-[--bg-surface] border border-[--border-default] text-[--text-primary] hover:bg-[--bg-hover]',
    ghost: 'text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]',
    danger:
      'bg-[--danger-bg] text-[--danger-text] border border-[--danger-border] hover:bg-[--danger-bg] hover:opacity-80',
  }
  const sizes = {
    sm: 'min-h-11 px-3 py-1.5 text-xs',
    md: 'min-h-11 px-4 py-2 text-sm',
    lg: 'min-h-12 px-6 py-3 text-base',
  }
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  )
}

export const Input = ({ label, error, icon, iconRight, className, ...props }) => {
  const generatedId = React.useId()
  const inputId = props.id || generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[--text-secondary] block">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : props['aria-describedby']}
          className={clsx(
            'w-full bg-[--bg-surface] border rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all',
            icon ? 'pl-10' : '',
            iconRight ? 'pr-10' : '',
            error ? 'border-[--danger-border]' : 'border-[--border-default]',
            className,
          )}
          {...props}
        />
        {iconRight && <div className="absolute right-3 top-1/2 -translate-y-1/2">{iconRight}</div>}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-[--danger-text]">
          {error}
        </p>
      )}
    </div>
  )
}

export const Select = ({ label, error, children, className, ...props }) => {
  const generatedId = React.useId()
  const selectId = props.id || generatedId
  const errorId = `${selectId}-error`

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[--text-secondary]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : props['aria-describedby']}
        className={clsx(
          'w-full bg-[--bg-surface] border rounded-xl px-4 py-2.5 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all',
          error ? 'border-[--danger-border]' : 'border-[--border-default]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-xs text-[--danger-text]">
          {error}
        </p>
      )}
    </div>
  )
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  const titleId = React.useId()
  const dialogRef = React.useRef(null)
  const onCloseRef = React.useRef(onClose)

  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    if (!isOpen) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) onCloseRef.current()
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ;(focusable || dialogRef.current)?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [closeOnEscape, isOpen])

  if (!isOpen) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Janela de diálogo'}
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={clsx(
          'w-full bg-[--bg-surface] rounded-2xl shadow-xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-[--border-subtle] sticky top-0 bg-[--bg-surface] z-10">
            <h3 id={titleId} className="text-lg font-bold text-[--text-primary]">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
              aria-label={`Fechar ${title}`}
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && (
          <div className="p-4 border-t border-[--border-subtle] sticky bottom-0 bg-[--bg-surface]">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  )
}

const CARD_VARIANTS = {
  default: '',
  elevated: 'aurora-card--elevated',
  glass: 'aurora-card--glass',
  hero: 'aurora-card--hero',
}

export const Card = ({
  children,
  padding = true,
  variant = 'default',
  interactive = false,
  className,
  ...props
}) => (
  <div
    className={clsx(
      'aurora-card rounded-2xl',
      CARD_VARIANTS[variant] || CARD_VARIANTS.default,
      interactive && 'aurora-card--interactive',
      padding && 'p-4',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

// Tooltip inline leve
const TipIcon = ({ text }) => {
  const [show, setShow] = React.useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        className="w-3.5 h-3.5 rounded-full bg-[--bg-hover] text-[--text-tertiary] hover:bg-[--brand-100] hover:text-[--brand-600] flex items-center justify-center text-[9px] font-bold transition-colors leading-none"
        aria-label="Informação"
      >
        ?
      </button>
      {show && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-48 bg-gray-900 text-white text-xs rounded-xl px-2.5 py-1.5 shadow-xl pointer-events-none text-center leading-snug whitespace-normal">
          {text}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )
}

export const StatCard = ({ label, value, icon, color, loading, trend, tooltip }) => (
  <div className="bg-[--bg-surface] border border-[--border-default] rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[--text-tertiary]">{label}</span>
        {tooltip && <TipIcon text={tooltip} />}
      </div>
      <span className="text-lg" style={{ color }}>
        {icon}
      </span>
    </div>
    {loading ? (
      <div className="h-7 w-24 bg-[--bg-hover] rounded animate-pulse" />
    ) : (
      <p className="text-xl font-bold text-[--text-primary]">{value}</p>
    )}
    {trend && <p className="text-xs text-[--text-tertiary] mt-1">{trend.label}</p>}
  </div>
)

export const Badge = ({ children, color }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[--bg-hover] text-[--text-secondary]">
    {children}
  </span>
)

export const ProgressBar = ({ value, max, animated }) => {
  const percent = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 bg-[--bg-hover] rounded-full overflow-hidden">
      <div
        className="h-full bg-[--brand-500] rounded-full transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-12">
    <div className="text-4xl mb-3">{icon}</div>
    <p className="text-base font-semibold text-[--text-primary]">{title}</p>
    <p className="text-sm text-[--text-tertiary] mt-1">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)
