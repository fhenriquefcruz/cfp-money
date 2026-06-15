import React from 'react'
import { Info } from 'lucide-react'

export default function InfoTooltip({ text }) {
  return (
    <span
      title={text}
      className="inline-flex items-center text-[--text-tertiary] cursor-help"
    >
      <Info size={14} />
    </span>
  )
}
