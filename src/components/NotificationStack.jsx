// src/components/NotificationStack.jsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

const ICONS = {
  success: <CheckCircle size={16} className="text-[--success-icon]" />,
  warning: <AlertTriangle size={16} className="text-[--warning-icon]" />,
  error:   <XCircle size={16} className="text-[--danger-icon]" />,
  info:    <Info size={16} className="text-[--brand-500]" />,
}

const BG = {
  success: 'bg-[--success-bg] border-[--success-border]',
  warning: 'bg-[--warning-bg] border-[--warning-border]',
  error:   'bg-[--danger-bg]  border-[--danger-border]',
  info:    'bg-[--brand-50]   border-[--brand-200]',
}

export default function NotificationStack() {
  const { notifications, dismissNotification } = useApp()

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{    opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-sm ${BG[n.kind] || BG.info}`}>
            <div className="flex-shrink-0 mt-0.5">{ICONS[n.kind] || ICONS.info}</div>
            <p className="flex-1 text-sm font-medium text-[--text-primary] leading-snug">{n.message}</p>
            <button onClick={() => dismissNotification(n.id)}
              className="flex-shrink-0 text-[--text-tertiary] hover:text-[--text-secondary] transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
