// src/components/ui.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export const Button = ({ children, variant = 'primary', size = 'md', fullWidth = false, loading = false, icon, iconRight, className, ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--brand-500] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[--brand-600] text-white hover:bg-[--brand-700] shadow-sm',
    secondary: 'bg-[--bg-surface] border border-[--border-default] text-[--text-primary] hover:bg-[--bg-hover]',
    ghost: 'text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]',
    danger: 'bg-[--danger-bg] text-[--danger-text] border border-[--danger-border] hover:bg-[--danger-bg] hover:opacity-80',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
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
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-[--text-secondary] block">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]">{icon}</div>}
        <input
          className={clsx(
            'w-full bg-[--bg-surface] border rounded-xl px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all',
            icon ? 'pl-10' : '',
            iconRight ? 'pr-10' : '',
            error ? 'border-[--danger-border]' : 'border-[--border-default]',
            className
          )}
          {...props}
        />
        {iconRight && <div className="absolute right-3 top-1/2 -translate-y-1/2">{iconRight}</div>}
      </div>
      {error && <p className="text-xs text-[--danger-text]">{error}</p>}
    </div>
  )
}

export const Select = ({ label, error, children, className, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-[--text-secondary]">{label}</label>}
      <select
        className={clsx(
          'w-full bg-[--bg-surface] border rounded-xl px-4 py-2.5 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500] transition-all',
          error ? 'border-[--danger-border]' : 'border-[--border-default]',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[--danger-text]">{error}</p>}
    </div>
  )
}

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={clsx('w-full mx-4 bg-[--bg-surface] rounded-2xl shadow-xl', sizes[size])}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-[--border-subtle]">
            <h3 className="text-lg font-bold text-[--text-primary]">{title}</h3>
            <button onClick={onClose} className="text-[--text-tertiary] hover:text-[--text-primary]">&times;</button>
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && <div className="p-4 border-t border-[--border-subtle]">{footer}</div>}
      </motion.div>
    </div>
  )
}

export const Card = ({ children, padding = true }) => (
  <div className={clsx('bg-[--bg-surface] border border-[--border-default] rounded-2xl', padding && 'p-4')}>
    {children}
  </div>
)

// Tooltip inline leve (sem dependência circular com Onboarding)
const TipIcon = ({ text }) => {
  const [show, setShow] = React.useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="w-3.5 h-3.5 rounded-full bg-[--bg-hover] text-[--text-tertiary] hover:bg-[--brand-100] hover:text-[--brand-600] flex items-center justify-center text-[9px] font-bold transition-colors leading-none"
        aria-label="Informação">
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
      <span className="text-lg" style={{ color }}>{icon}</span>
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
