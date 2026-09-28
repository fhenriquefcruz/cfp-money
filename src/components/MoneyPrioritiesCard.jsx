import React from 'react'
import { Link } from 'react-router-dom'
import { Card } from './ui'

const LEVEL = {
  critical: ['Prioridade', 'money-priority--critical'],
  warning: ['Atenção', 'money-priority--warning'],
  opportunity: ['Oportunidade', 'money-priority--opportunity'],
}

export default function MoneyPrioritiesCard({ report }) {
  const priorities = report?.priorities || []

  return (
    <Card className="money-priorities-card" padding={false}>
      <div className="money-priorities-header">
        <h2 className="money-priorities-title">Suas prioridades agora</h2>
        <p className="money-priorities-subtitle">
          Até três ações reunidas pelo Money em ordem de relevância.
        </p>
      </div>

      <div className="money-priorities-list">
        {!priorities.length ? (
          <p className="money-priorities-clear">Nenhuma prioridade relevante agora</p>
        ) : (
          priorities.map((priority, index) => {
            const [label, tone] = LEVEL[priority.level] || LEVEL.opportunity
            return (
              <div
                key={priority.id}
                data-testid="money-priority"
                className={`money-priority-item ${tone}`}
              >
                <p className="money-priority-level">
                  {index + 1}. {label}
                </p>
                <p className="money-priority-title">{priority.title}</p>
                <p className="money-priority-detail">{priority.detail}</p>
                <Link to={priority.to} className="money-priority-action">
                  {priority.actionLabel}
                </Link>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
