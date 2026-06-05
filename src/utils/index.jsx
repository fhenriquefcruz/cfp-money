// src/components/ui/index.jsx
// Shared UI primitives

import React, { forwardRef, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

// ── BUTTON ──
export const Button = forwardRef(({
  children, variant = 'primary', size = 'md',
  loading, icon, iconRight, className, fullWidth, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    primary: 'bg-[--brand-600] hover:bg-[--brand-700] active:bg-[--brand-800] text-white focus-visible:ring-[--brand-500] shadow-sm',
    secondary: 'bg-[--bg-hover] hover:bg-[--border-default] text-[--text-primary] border border-[--border-default] focus-visible:ring-[--brand-500]',
    ghost: 'hover:bg-[--bg-hover] text-[--text-secondary] hover:text-[--text-primary] focus-visible:ring-[--brand-500]',
    danger: 'bg-[--danger-bg] hover:bg-red-100 text-[--danger-text] border border-[--danger-border] focus-visible:ring-red-500',
    success: 'bg-[--success-bg] hover:bg-green-100 text-[--success-text] border border-[--success-border] focus-visible:ring-green-500',
    outline: 'border border-[--brand-500] text-[--text-brand] hover:bg-[--brand-50] focus-visible:ring-[--brand-500]',
  }

  const sizes = {
    xs: 'text-xs px-2.5 py-1.5 rounded-md',
    sm: 'text-sm px-3 py-2 rounded-lg',
    md: 'text-sm px-4 py-2.5 rounded-xl',
    lg: 'text-base px-6 py-3 rounded-xl',
    xl: 'text-lg px-8 py-4 rounded-2xl',
    icon: 'p-2 rounded-xl',
    'icon-sm': 'p-1.5 rounded-lg',
  }

  return (
    <button
      ref={ref}
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 20 : 16} />
      ) : icon ? (
        React.cloneElement(icon, { size: size === 'lg' ? 20 : 16 })
      ) : null}
      {children}
      {iconRight && !loading && React.cloneElement(iconRight, { size: 16 })}
    </button>
  )
})
Button.displayName = 'Button'

// ── INPUT ──
export const Input = forwardRef(({
  label, error, hint, icon, iconRight, className, wrapperClass, ...props
}, ref) => (
  <div className={clsx('flex flex-col gap-1.5', wrapperClass)}>
    {label && (
      <label className="text-sm font-medium text-[--text-secondary]" htmlFor={props.id}>
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none">
          {React.cloneElement(icon, { size: 16 })}
        </div>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full bg-[--bg-surface] border text-[--text-primary] placeholder:text-[--text-tertiary]',
          'rounded-xl py-2.5 transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[--brand-500] focus:border-transparent',
          icon ? 'pl-9 pr-4' : 'px-4',
          iconRight ? 'pr-10' : '',
          error
            ? 'border-[--danger-border] focus:ring-red-500'
            : 'border-[--border-default] hover:border-[--border-strong]',
          className
        )}
        {...props}
      />
      {iconRight && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]">
          {iconRight}
        </div>
      )}
    </div>
    {error && <p className="text-xs text-[--danger-text] flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    {hint && !error && <p className="text-xs text-[--text-tertiary]">{hint}</p>}
  </div>
))
Input.displayName = 'Input'

// ── SELECT ──
export const Select = forwardRef(({ label, error, children, wrapperClass, ...props }, ref) => (
  <div className={clsx('flex flex-col gap-1.5', wrapperClass)}>
    {label && (
      <label className="text-sm font-medium text-[--text-secondary]">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <select
      ref={ref}
      className={clsx(
        'w-full bg-[--bg-surface] border text-[--text-primary]',
        'rounded-xl px-4 py-2.5 transition-all duration-150 appearance-none',
        'focus:outline-none focus:ring-2 focus:ring-[--brand-500] focus:border-transparent',
        error
          ? 'border-[--danger-border]'
          : 'border-[--border-default] hover:border-[--border-strong]',
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-[--danger-text]">{error}</p>}
  </div>
))
Select.displayName = 'Select'

// ── CARD ──
export const Card = ({ children, className, hover, onClick, padding = true }) => (
  <motion.div
    className={clsx(
      'bg-[--bg-surface] border border-[--border-default] rounded-2xl',
      padding && 'p-5',
      hover && 'cursor-pointer hover:shadow-md hover:border-[--border-strong] transition-all duration-200',
      className
    )}
    onClick={onClick}
    whileHover={hover ? { y: -1 } : undefined}
  >
    {children}
  </motion.div>
)

// ── MODAL ──
export const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            ref={overlayRef}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={clsx(
              'relative bg-[--bg-surface] w-full rounded-t-3xl sm:rounded-3xl',
              'border border-[--border-default] shadow-xl max-h-[90vh] flex flex-col z-10',
              sizes[size]
            )}
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          >
            {/* Handle bar for mobile */}
            <div className="sm:hidden w-10 h-1 bg-[--border-strong] rounded-full mx-auto mt-3 mb-0 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] flex-shrink-0">
              <h2 className="text-lg font-bold text-[--text-primary]">{title}</h2>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[--border-subtle] flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── BADGE ──
export const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-[--bg-hover] text-[--text-secondary]',
    primary: 'bg-[--brand-100] text-[--brand-700]',
    success: 'bg-[--success-bg] text-[--success-text]',
    warning: 'bg-[--warning-bg] text-[--warning-text]',
    danger: 'bg-[--danger-bg] text-[--danger-text]',
    info: 'bg-[--info-bg] text-[--info-text]',
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', variants[variant], className)}>
      {children}
    </span>
  )
}

// ── SPINNER ──
export const Spinner = ({ size = 20, className }) => (
  <svg
    className={clsx('animate-spin', className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
  </svg>
)

// ── EMPTY STATE ──
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    {icon && (
      <div className="w-16 h-16 rounded-2xl bg-[--bg-hover] flex items-center justify-center mb-4 text-[--text-tertiary]">
        {React.cloneElement(icon, { size: 28 })}
      </div>
    )}
    <h3 className="text-base font-semibold text-[--text-primary] mb-1">{title}</h3>
    {description && <p className="text-sm text-[--text-tertiary] mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
)

// ── PROGRESS BAR ──
export const ProgressBar = ({ value, max, color, showLabel, className, animated }) => {
  const pct = Math.min(100, (value / max) * 100)
  const getColor = () => {
    if (color) return color
    if (pct >= 100) return '#ef4444'
    if (pct >= 80) return '#f59e0b'
    return '#6366f1'
  }
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div className="w-full bg-[--bg-hover] rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getColor() }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-[--text-tertiary]">
          <span>{pct.toFixed(0)}%</span>
          <span>Meta: {max}</span>
        </div>
      )}
    </div>
  )
}

// ── TOAST NOTIFICATIONS ──
const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLORS = {
  success: { bg: '--success-bg', text: '--success-text', border: '--success-border', icon: '--success-icon' },
  error: { bg: '--danger-bg', text: '--danger-text', border: '--danger-border', icon: '--danger-icon' },
  warning: { bg: '--warning-bg', text: '--warning-text', border: '--warning-border', icon: '--warning-icon' },
  info: { bg: '--info-bg', text: '--info-text', border: '--info-border', icon: '--info-icon' },
}

export const Toast = ({ notification, onDismiss }) => {
  const { message, kind = 'info', id } = notification
  const c = COLORS[kind] || COLORS.info
  const Icon = ICONS[kind] || Info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="flex items-start gap-3 p-4 rounded-2xl border shadow-lg max-w-sm w-full cursor-pointer"
      style={{
        background: `var(${c.bg})`,
        borderColor: `var(${c.border})`,
        color: `var(${c.text})`,
      }}
      onClick={() => onDismiss(id)}
    >
      <Icon size={18} style={{ color: `var(${c.icon})`, flexShrink: 0, marginTop: 1 }} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <X size={14} className="opacity-50 flex-shrink-0 mt-0.5" />
    </motion.div>
  )
}

export const ToastContainer = ({ notifications, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end">
    <AnimatePresence>
      {notifications.map(n => (
        <Toast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </AnimatePresence>
  </div>
)

// ── AMOUNT DISPLAY ──
export const Amount = ({ value, size = 'md', colored = true }) => {
  const isPositive = value >= 0
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-2xl', '2xl': 'text-3xl' }
  const color = colored
    ? isPositive
      ? 'text-[--success-icon]'
      : 'text-[--danger-icon]'
    : 'text-[--text-primary]'
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value))
  return (
    <span className={clsx('font-bold tabular-nums', sizes[size], color)}>
      {isPositive ? '' : '−'}{fmt}
    </span>
  )
}

// ── STAT CARD ──
export const StatCard = ({ label, value, icon, trend, color, loading }) => (
  <Card className="flex-1 min-w-0">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">{label}</p>
      {icon && (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: color ? color + '20' : 'var(--bg-hover)' }}
        >
          {React.cloneElement(icon, {
            size: 16,
            style: { color: color || 'var(--text-brand)' }
          })}
        </div>
      )}
    </div>
    {loading ? (
      <div className="skeleton h-7 w-32 mb-1" />
    ) : (
      <p className="text-2xl font-bold text-[--text-primary] tabular-nums">{value}</p>
    )}
    {trend && !loading && (
      <p className={clsx('text-xs mt-1', trend.positive ? 'text-[--success-icon]' : 'text-[--danger-icon]')}>
        {trend.positive ? '↑' : '↓'} {trend.label}
      </p>
    )}
  </Card>
)
