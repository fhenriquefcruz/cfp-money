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

// Badges coloridos por status
const STATUS_STYLES = {
  premium: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  premium_expired: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-400',
  },
  trial_active: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-400',
  },
  trial_expired: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  blocked: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  free: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-300',
  },
}


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
  const [label, styleKey] = ACTIVITY_META[state.key] || ACTIVITY_META.untracked
  const style = STATUS_STYLES[styleKey]

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
      title={state.key === 'online' ? 'Atividade registrada nos últimos 5 minutos.' : label}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`} />
      {label}
    </span>
  )
}

function StatusBadge({ u }) {
  const info = getPlanPresentation(u)
  const style = STATUS_STYLES[info.key]
  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
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
      <div className="admin-user-row grid grid-cols-1 items-stretch gap-3 border-b border-[--border-subtle] px-4 py-3 transition-colors last:border-0 hover:bg-[--bg-hover] sm:grid-cols-[2fr_0.9fr_1.15fr_auto] sm:items-center">
        {/* Coluna 1: usuário */}
        <button
          className="flex min-h-11 w-full items-center gap-2.5 min-w-0 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="w-7 h-7 rounded-lg bg-[--brand-100] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[--brand-600]">
            {(u.displayName || u.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate leading-tight">
              {u.displayName || '—'}
            </p>
            <p className="text-xs text-[--text-tertiary] truncate leading-tight">{u.email}</p>
          </div>
          {expanded ? (
            <ChevronUp size={12} className="text-[--text-tertiary] flex-shrink-0 ml-1" />
          ) : (
            <ChevronDown size={12} className="text-[--text-tertiary] flex-shrink-0 ml-1" />
          )}
        </button>

        {/* Coluna 2: badge de status (oculto em mobile muito pequeno) */}
        <div className="hidden sm:block">
          <StatusBadge u={u} />
        </div>

        {/* Coluna 3: atividade recente */}
        <div className="hidden min-w-0 sm:block">
          <ActivityBadge u={u} />
          <p className="mt-1 text-[10px] text-[--text-tertiary]">
            {formatRelativeActivity(getUserActivityReference(u))}
          </p>
        </div>

        {/* Coluna 4: ações agrupadas */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:flex-shrink-0">
          {/* Select + Ativar colados */}
          <div className="flex min-w-0 flex-1 sm:flex-none items-center rounded-xl border border-[--border-default] overflow-hidden">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="min-h-11 text-xs px-2 bg-[--bg-elevated] text-[--text-primary] border-0 focus:outline-none"
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
              className="min-h-11 flex-1 sm:flex-none px-3 bg-[--brand-600] text-white text-xs font-semibold hover:bg-[--brand-700] transition-colors inline-flex items-center justify-center gap-1"
              aria-label={`Ativar ${months} ${months === 1 ? 'mês' : 'meses'} para ${u.displayName || u.email}`}
            >
              <CheckCircle size={11} /> Ativar
            </button>
          </div>

          {isPremiumActive && (
            <button
              onClick={() => onRemovePremium(u.uid)}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[--border-default] text-[--text-tertiary] hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              title="Remover Premium"
              aria-label={`Remover Premium de ${u.displayName || u.email}`}
            >
              <X size={13} />
            </button>
          )}

          {u.blocked ? (
            <button
              onClick={() => onUnblock(u.uid)}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[--border-default] text-[--text-tertiary] hover:text-[--success-icon] hover:border-[--success-border] transition-colors"
              title="Desbloquear"
              aria-label={`Desbloquear ${u.displayName || u.email}`}
            >
              <Unlock size={13} />
            </button>
          ) : (
            <button
              onClick={() => onBlock(u.uid)}
              className="w-11 h-11 inline-flex items-center justify-center rounded-xl border border-[--border-default] text-[--text-tertiary] hover:text-[--danger-text] hover:border-[--danger-border] hover:bg-[--danger-bg] transition-colors"
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
        <div className="px-4 pb-3 bg-[--bg-subtle] border-b border-[--border-subtle]">
          <div className="flex flex-wrap items-center gap-2 mb-2 pt-2 sm:hidden">
            <StatusBadge u={u} />
            <ActivityBadge u={u} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
                <span className="text-[--text-tertiary]">{r.label}: </span>
                <span className="font-medium text-[--text-primary]">{r.value}</span>
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
        <Shield size={40} className="text-[--text-tertiary]" />
        <p className="text-lg font-bold text-[--text-primary]">Acesso restrito</p>
        <p className="text-sm text-[--text-tertiary]">Área exclusiva para administradores.</p>
      </div>
    )

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <AlertTriangle size={40} className="text-[--danger-icon]" />
        <p className="text-base font-bold text-[--text-primary]">Erro ao carregar dados</p>
        <p className="text-sm text-[--text-tertiary]">{error}</p>
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
        <p className="text-sm text-[--text-tertiary]">Usuários cadastrados e controle de acesso</p>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Stats */}
      <div className="operational-summary-grid grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: 'Total',
            value: stats.total,
            icon: <Users size={15} />,
            style: STATUS_STYLES.free,
          },
          {
            label: 'Premium',
            value: stats.premium,
            icon: <Star size={15} />,
            style: STATUS_STYLES.premium,
          },
          {
            label: 'Bloqueados',
            value: stats.blocked,
            icon: <Lock size={15} />,
            style: STATUS_STYLES.blocked,
          },
          {
            label: 'Online agora',
            value: stats.online,
            icon: <Users size={15} />,
            style: STATUS_STYLES.premium,
          },
          {
            label: 'Ativos em 7 dias',
            value: stats.active7d,
            icon: <Clock size={15} />,
            style: STATUS_STYLES.trial_active,
          },
          {
            label: 'Inativos 30+ dias',
            value: stats.inactive30,
            icon: <Clock size={15} />,
            style: STATUS_STYLES.blocked,
          },
        ].map((s) => (
          <Card key={s.label} className="!p-4">
            <div
              className={`inline-flex items-center justify-center w-8 h-8 rounded-xl mb-2 ${s.style.bg}`}
            >
              <span className={s.style.text}>{s.icon}</span>
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
        <div className="admin-users-toolbar flex flex-col gap-3 border-b border-[--border-subtle] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-[--text-primary]">
            Usuários <span className="text-[--text-tertiary] font-normal">({filtered.length})</span>
          </h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-[--border-default] bg-[--bg-elevated] px-3 text-xs text-[--text-primary] focus:border-[--brand-500] focus:outline-none"
              aria-label="Filtrar usuários por atividade"
            >
              <option value="all">Toda atividade</option>
              <option value="online">Online agora</option>
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d+">Sem acesso há 30+ dias</option>
              <option value="untracked">Sem registro ainda</option>
            </select>
            <div className="relative w-full sm:w-auto">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
              />
              <input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-[--border-default] bg-[--bg-elevated] py-1.5 pl-7 pr-3 text-xs text-[--text-primary] focus:border-[--brand-500] focus:outline-none sm:w-44"
              />
            </div>
          </div>
        </div>

        <div className="border-b border-[--border-subtle] bg-[--bg-subtle] px-4 py-2 text-[10px] leading-relaxed text-[--text-tertiary]">
          “Online agora” significa atividade registrada nos últimos 5 minutos. É uma presença aproximada,
          não uma confirmação de sessão aberta em tempo real.
        </div>

        {/* Header de colunas */}
        <div className="grid grid-cols-[1fr_auto] border-b border-[--border-subtle] bg-[--bg-subtle] px-4 py-2 sm:grid-cols-[2fr_0.9fr_1.15fr_auto]">
          <span className="text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider">
            Usuário
          </span>
          <span className="hidden sm:block text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider">
            Status
          </span>
          <span className="hidden sm:block text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider">
            Atividade
          </span>
          <span className="text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider text-right">
            Ações
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={28} className="text-[--text-tertiary] mx-auto mb-2" />
            <p className="text-sm text-[--text-tertiary]">
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
