// src/components/Admin.jsx
import React, { useState, useEffect } from 'react'
import {
  Shield,
  Users,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Star,
  Search,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Card } from './ui'
import { formatPlanExpiration, getPlanPresentation } from '../domain/plan'
import { adminListUsers, adminSetUserAccess } from '../services/adminGateway'
import {
  buildActivitySummary,
  formatActivityDate,
  formatRelativeActivity,
  getUserActivityReference,
  getUserActivityState,
  matchesActivityFilter,
} from '../domain/userActivity'
import CommercialOverviewRouter from './CommercialOverviewRouter'
import SupportAdminCard from './SupportAdminCard'

const ACTIVITY_META = {
  online: ['Online agora', 'premium'],
  today: ['Ativo hoje', 'trial_active'],
  week: ['Ativo na semana', 'trial_active'],
  inactive: ['Inativo', 'premium_expired'],
  inactive30: ['Inativo há 30+ dias', 'blocked'],
  untracked: ['Sem registro', 'free'],
}

function ActivityBadge({ u }) {
  const state = getUserActivityState(u)
  const [label, tone] = ACTIVITY_META[state.key] || ACTIVITY_META.untracked

  return (
    <span
      className="admin-status-badge admin-tone"
      data-tone={tone}
      title={state.key === 'online' ? 'Atividade registrada nos últimos 5 minutos.' : label}
    >
      <span className="admin-status-dot" />
      {label}
    </span>
  )
}

function StatusBadge({ u }) {
  const info = getPlanPresentation(u)
  return (
    <span className="admin-status-badge admin-tone" data-tone={info.key}>
      <span className="admin-status-dot" />
      {info.label}
      {info.sub && <span className="opacity-70 font-normal">· {info.sub}</span>}
    </span>
  )
}

function UserRow({ u, onActivate, onRemovePremium, onBlock, onUnblock }) {
  const [expanded, setExpanded] = useState(false)
  const [months, setMonths] = useState(1)
  const planInfo = getPlanPresentation(u)
  const isPremiumActive = planInfo.key === 'premium'

  return (
    <>
      {/* Linha principal — grid fixo */}
      <div className="admin-user-row">
        {/* Coluna 1: usuário */}
        <button
          className="admin-user-identity"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="admin-user-avatar">
            {(u.displayName || u.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="admin-user-name">
              {u.displayName || '—'}
            </p>
            <p className="admin-user-email">{u.email}</p>
          </div>
          {expanded ? (
            <ChevronUp size={12} className="text-[--text-tertiary] flex-shrink-0 ml-1" />
          ) : (
            <ChevronDown size={12} className="text-[--text-tertiary] flex-shrink-0 ml-1" />
          )}
        </button>

        {/* Coluna 2: badge de status (oculto em mobile muito pequeno) */}
        <div className="admin-desktop-cell">
          <StatusBadge u={u} />
        </div>

        {/* Coluna 3: atividade recente */}
        <div className="admin-activity-cell">
          <ActivityBadge u={u} />
          <p className="admin-activity-age">
            {formatRelativeActivity(getUserActivityReference(u))}
          </p>
        </div>

        {/* Coluna 4: ações agrupadas */}
        <div className="admin-access-actions">
          {/* Select + Ativar colados */}
          <div className="admin-access-control">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="admin-access-select"
              aria-label={`Meses de acesso para ${u.displayName || u.email}`}
            >
              {[1, 2, 3, 6].map((m) => (
                <option key={m} value={m}>
                  {m}m
                </option>
              ))}
            </select>
            <button
              onClick={() => onActivate(u.uid, months)}
              className="admin-activate-button"
              aria-label={`Ativar ${months} ${months === 1 ? 'mês' : 'meses'} para ${u.displayName || u.email}`}
            >
              <CheckCircle size={11} /> Ativar
            </button>
          </div>

          {isPremiumActive && (
            <button
              onClick={() => onRemovePremium(u.uid)}
              className="admin-icon-action" data-action="remove"
              title="Remover Premium"
              aria-label={`Remover Premium de ${u.displayName || u.email}`}
            >
              <X size={13} />
            </button>
          )}

          {u.blocked ? (
            <button
              onClick={() => onUnblock(u.uid)}
              className="admin-icon-action" data-action="unblock"
              title="Desbloquear"
              aria-label={`Desbloquear ${u.displayName || u.email}`}
            >
              <Unlock size={13} />
            </button>
          ) : (
            <button
              onClick={() => onBlock(u.uid)}
              className="admin-icon-action" data-action="block"
              title="Bloquear"
              aria-label={`Bloquear ${u.displayName || u.email}`}
            >
              <Lock size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expansão: badge mobile + detalhes */}
      {expanded && (
        <div className="admin-user-expanded">
          <div className="admin-mobile-badges">
            <StatusBadge u={u} />
            <ActivityBadge u={u} />
          </div>
          <div className="admin-user-details">
            {[
              { label: 'Plano', value: u.plan || 'trial' },
              {
                label: 'Cadastro',
                value: formatPlanExpiration({ premiumUntil: u.createdAt }),
              },
              {
                label: 'Premium até',
                value: formatPlanExpiration(u),
              },
              { label: 'Status', value: u.blocked ? 'Bloqueado' : 'Ativo' },
              {
                label: 'Último login',
                value: formatActivityDate(u.lastSignInAt),
              },
              {
                label: 'Última atividade',
                value: `${formatActivityDate(u.lastSeenAt)} · ${formatRelativeActivity(
                  getUserActivityReference(u),
                )}`,
              },
              {
                label: 'Presença',
                value: ACTIVITY_META[getUserActivityState(u).key]?.[0] || 'Sem registro',
              },
            ].map((r) => (
              <div key={r.label}>
                <span className="admin-detail-label">{r.label}: </span>
                <span className="admin-detail-value">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default function Admin() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return undefined
    let active = true

    adminListUsers()
      .then((data) => {
        if (active) setUsers(data)
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || 'Não foi possível carregar os usuários.')
      })

    return () => {
      active = false
    }
  }, [isAdmin])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const runAccessAction = async (command, successMessage) => {
    setError('')
    try {
      await adminSetUserAccess(command)
      setUsers(await adminListUsers())
      showToast(successMessage)
    } catch (actionError) {
      setError(actionError?.message || 'Não foi possível concluir a ação administrativa.')
    }
  }

  const handleActivate = (uid, m) =>
    runAccessAction(
      {
        targetUid: uid,
        action: 'activate',
        months: m,
      },
      `✓ Premium ativado por ${m} mês(es)`,
    )

  const handleRemovePremium = (uid) =>
    runAccessAction(
      {
        targetUid: uid,
        action: 'remove',
      },
      'Premium removido.',
    )

  const handleBlock = (uid) =>
    runAccessAction(
      {
        targetUid: uid,
        action: 'block',
      },
      'Usuário bloqueado.',
    )

  const handleUnblock = (uid) =>
    runAccessAction(
      {
        targetUid: uid,
        action: 'unblock',
      },
      'Usuário desbloqueado.',
    )

  if (!isAdmin)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <Shield size={40} className="admin-detail-label" />
        <p className="text-lg font-bold text-[--text-primary]">Acesso restrito</p>
        <p className="admin-users-empty-text">Área exclusiva para administradores.</p>
      </div>
    )

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <AlertTriangle size={40} className="text-[--danger-icon]" />
        <p className="text-base font-bold text-[--text-primary]">Erro ao carregar dados</p>
        <p className="admin-users-empty-text">{error}</p>
      </div>
    )

  const now = new Date()
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = users
    .filter(
      (u) =>
        (!normalizedSearch ||
          u.email?.toLowerCase().includes(normalizedSearch) ||
          u.displayName?.toLowerCase().includes(normalizedSearch)) &&
        matchesActivityFilter(u, activityFilter, now),
    )
    .sort((a, b) => {
      const aTime = getUserActivityReference(a)?.getTime() || 0
      const bTime = getUserActivityReference(b)?.getTime() || 0
      return bTime - aTime
    })

  const activitySummary = buildActivitySummary(users, now)
  const stats = {
    total: users.length,
    premium: users.filter((u) => getPlanPresentation(u).key === 'premium').length,
    blocked: users.filter((u) => u.blocked).length,
    online: activitySummary.online,
    active7d: activitySummary.active7d,
    inactive30: activitySummary.inactive30,
  }

  return (
    <div className="operational-page admin-premium mx-auto min-w-0 max-w-[1600px] space-y-5 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-black text-[--text-primary]">Painel Admin</h1>
        <p className="admin-users-empty-text">Usuários cadastrados e controle de acesso</p>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Stats */}
      <div className="operational-summary-grid admin-summary-grid">
        {[
          {
            label: 'Total',
            value: stats.total,
            icon: <Users size={15} />,
            tone: 'free',
          },
          {
            label: 'Premium',
            value: stats.premium,
            icon: <Star size={15} />,
            tone: 'premium',
          },
          {
            label: 'Bloqueados',
            value: stats.blocked,
            icon: <Lock size={15} />,
            tone: 'blocked',
          },
          {
            label: 'Online agora',
            value: stats.online,
            icon: <Users size={15} />,
            tone: 'premium',
          },
          {
            label: 'Ativos em 7 dias',
            value: stats.active7d,
            icon: <Clock size={15} />,
            tone: 'trial_active',
          },
          {
            label: 'Inativos 30+ dias',
            value: stats.inactive30,
            icon: <Clock size={15} />,
            tone: 'blocked',
          },
        ].map((s) => (
          <Card key={s.label} className="!p-4">
            <div className="admin-stat-icon admin-tone" data-tone={s.tone}>
              {s.icon}
            </div>
            <p className="text-2xl font-black text-[--text-primary]">{s.value}</p>
            <p className="text-xs text-[--text-tertiary]">{s.label}</p>
          </Card>
        ))}
      </div>

      <CommercialOverviewRouter />

      <SupportAdminCard />

      {/* Instrução Pix */}
      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={15} className="text-[--warning-icon] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[--text-secondary] space-y-0.5">
            <p className="font-semibold text-[--text-primary]">Fluxo Pix</p>
            <p>1. Usuário paga R$ 19,90 e informa o e-mail na descrição.</p>
            <p>
              2. Localize abaixo e clique <strong>Ativar</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabela de usuários */}
      <Card className="admin-users-surface !p-0 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="admin-users-toolbar">
          <h2 className="text-sm font-bold text-[--text-primary]">
            Usuários <span className="text-[--text-tertiary] font-normal">({filtered.length})</span>
          </h2>
          <div className="admin-users-filters">
            <select
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
              className="admin-filter-select"
              aria-label="Filtrar usuários por atividade"
            >
              <option value="all">Toda atividade</option>
              <option value="online">Online agora</option>
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d+">Sem acesso há 30+ dias</option>
              <option value="untracked">Sem registro ainda</option>
            </select>
            <div className="admin-search">
              <Search
                size={13}
                className="admin-search-icon"
              />
              <input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-search-input"
              />
            </div>
          </div>
        </div>

        <div className="admin-activity-note">
          “Online agora” significa atividade registrada nos últimos 5 minutos. É uma presença aproximada,
          não uma confirmação de sessão aberta em tempo real.
        </div>

        {/* Header de colunas */}
        <div className="admin-users-header">
          <span className="admin-users-heading">
            Usuário
          </span>
          <span className="admin-users-heading admin-users-heading--desktop">
            Status
          </span>
          <span className="admin-users-heading admin-users-heading--desktop">
            Atividade
          </span>
          <span className="admin-users-heading admin-users-heading--actions">
            Ações
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-users-empty">
            <Users size={28} className="admin-users-empty-icon" />
            <p className="admin-users-empty-text">
              {search || activityFilter !== 'all'
                ? 'Nenhum usuário corresponde aos filtros.'
                : 'Nenhum usuário cadastrado.'}
            </p>
          </div>
        ) : (
          filtered.map((u) => (
            <UserRow
              key={u.uid}
              u={u}
              onActivate={handleActivate}
              onRemovePremium={handleRemovePremium}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
            />
          ))
        )}
      </Card>
    </div>
  )
}
