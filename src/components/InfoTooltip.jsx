// src/components/InfoTooltip.jsx
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

export default function InfoTooltip({ text, size = 14, className = '' }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos]         = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)

  const show = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({
      top:  r.top  + window.scrollY - 8,
      left: r.left + window.scrollX + r.width / 2,
    })
    setVisible(true)
  }

  const hide = () => setVisible(false)

  useEffect(() => {
    if (!visible) return
    const close = (e) => {
      if (!btnRef.current?.contains(e.target)) hide()
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [visible])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={e => { e.stopPropagation(); visible ? hide() : show() }}
        className={`inline-flex items-center justify-center rounded-full
          text-[--text-tertiary] hover:text-[--brand-500]
          transition-colors flex-shrink-0 ${className}`}
        aria-label="Mais informações"
        style={{ width: size + 4, height: size + 4 }}
      >
        <HelpCircle size={size} />
      </button>

      {visible && createPortal(
        <div
          style={{
            position: 'absolute',
            top:  pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            maxWidth: 220,
            pointerEvents: 'none',
          }}
          className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2
                     shadow-xl border border-gray-700 leading-relaxed
                     text-center whitespace-normal animate-fade-in"
        >
          {text}
          <div
            style={{
              position: 'absolute',
              left: '50%', top: '100%',
              transform: 'translateX(-50%)',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #111827',
            }}
          />
        </div>,
        document.body
      )}
    </>
  )
}
