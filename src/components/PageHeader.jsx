import React from 'react'
import { clsx } from 'clsx'

export default function PageHeader({ title, subtitle, period, actions, className }) {
  return (
    <header
      className={clsx(
        'operational-page__header flex flex-wrap items-start justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-black tracking-tight text-[--text-primary]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[--text-tertiary]">{subtitle}</p>}
        {period && <div className="mt-2">{period}</div>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
