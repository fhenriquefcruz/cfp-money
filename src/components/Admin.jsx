// src/components/Admin.jsx
import React, { useState, useEffect } from 'react'
import {
  Shield, Users, Lock, Unlock, CheckCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, X, Star, Search
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Card, Button } from './ui'
import { onAllUsersChange, activatePremiumForUser, removePremiumForUser, blockUser } from '../services/firebase'

const ADMIN_EMAIL = 'fhenriquefcruz@gmail.com'

// Badges coloridos por status
const STATUS_STYLES = {
  premium:          { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  premium_expired:  { bg: 'bg-orange-100 dark:bg-orange-900/40',   text: 'text-orange-700 dark:text-orange-400',   dot: 'bg-orange-400'  },
  trial_active:     { bg: 'bg-blue-100 dark:bg-blue-900/40',        text: 'text-blue-700 dark:text-blue-400',        dot: 'bg-blue-400'    },
  trial_expired:    { bg: 'bg-gray-100 dark:bg-gray-800',           text: 'text-gray-500 dark:text-gray-400',        dot: 'bg-gray-400'    },
  blocked:          { bg: 'bg-red-100 dark:bg-red-900/40',          text: 'text-red-700 dark:text-red-400',          dot: 'bg-red-500'     },
  free:             { bg: 'bg-gray-100 dark:bg-gray-800',           text: 'text-gray-500 dark:text-gray-400',        dot: 'bg-gray-300'    },
}

function getPlanInfo(u) {
  if (u.blocked) return { key: 'blocked', label: 'Bloqueado', sub: '' }
  const now = new Date()
  if (u.plan === 'premium' && u.premiumUntil) {
    const days = Math.ceil((new Date(u.premiumUntil) - now) / 86400000)
    if (days > 0) return { key: 'premium', label: 'Premium', sub: `${days}d restantes` }
    return { key: 'premium_expired', label: 'Premium', sub: 'Expirado' }
  }
  if (u.plan === 'trial' || !u.plan) {
    const start = u.trialStart?.toDate?.() || (u.trialStart ? new Date(u.trialStart) : new Date())
    const left  = 7 - Math.floor((now - start) / 86400000)
    if (left > 0) return { key: 'trial_active', label: 'Trial', sub: `${left}d restantes` }
    return { key: 'trial_expired', label: 'Trial', sub: 'Expirado' }
  }
  return { key: 'free', label: 'Free', sub: '' }
}

function StatusBadge({ u }) {
  const info  = getPlanInfo(u)
  const style = STATUS_STYLES[info.key]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {info.label}
      {info.sub && <span className="opacity-70 font-normal">· {info.sub}</span>}
    </span>
  )
}

function UserRow({ u, onActivate, onRemovePremium, onBlock, onUnblock }) {
  const [expanded, setExpanded] = useState(false)
  const [months, setMonths]     = useState(1)
  const isPremiumActive = u.plan === 'premium' && u.premiumUntil && new Date(u.premiumUntil) > new Date()

  return (
    <>
      {/* Linha principal — grid fixo */}
      <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_auto] items-center gap-2 px-4 py-3 border-b border-[--border-subtle] last:border-0 hover:bg-[--bg-hover] transition-colors">

        {/* Coluna 1: usuário */}
        <button className="flex items-center gap-2.5 min-w-0 text-left" onClick={() => setExpanded(v => !v)}>
          <div className="w-7 h-7 rounded-lg bg-[--brand-100] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[--brand-600]">
            {(u.displayName || u.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate leading-tight">{u.displayName || '—'}</p>
            <p className="text-xs text-[--text-tertiary] truncate leading-tight">{u.email}</p>
          </div>
          {expanded ? <ChevronUp size={12} className="text-[--text-tertiary] flex-shrink-0 ml-1" />
                    : <ChevronDown size={12} className="text-[--text-tertiary] flex-shrink-0 ml-1" />}
        </button>

        {/* Coluna 2: badge de status (oculto em mobile muito pequeno) */}
        <div className="hidden sm:block">
          <StatusBadge u={u} />
        </div>

        {/* Coluna 3: ações agrupadas */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Select + Ativar colados */}
          <div className="flex items-center rounded-xl border border-[--border-default] overflow-hidden">
            <select
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              className="text-xs px-1.5 py-1.5 bg-[--bg-elevated] text-[--text-primary] border-0 focus:outline-none">
              {[1,2,3,6].map(m => <option key={m} value={m}>{m}m</option>)}
            </select>
            <button
              onClick={() => onActivate(u.uid, months)}
              className="px-2.5 py-1.5 bg-[--brand-600] text-white text-xs font-semibold hover:bg-[--brand-700] transition-colors flex items-center gap-1">
              <CheckCircle size={11} /> Ativar
            </button>
          </div>

          {isPremiumActive && (
            <button onClick={() => onRemovePremium(u.uid)}
              className="p-1.5 rounded-lg border border-[--border-default] text-[--text-tertiary] hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              title="Remover Premium">
              <X size={13} />
            </button>
          )}

          {u.blocked
            ? <button onClick={() => onUnblock(u.uid)}
                className="p-1.5 rounded-lg border border-[--border-default] text-[--text-tertiary] hover:text-[--success-icon] hover:border-[--success-border] transition-colors"
                title="Desbloquear">
                <Unlock size={13} />
              </button>
            : <button onClick={() => onBlock(u.uid)}
                className="p-1.5 rounded-lg border border-[--border-default] text-[--text-tertiary] hover:text-[--danger-text] hover:border-[--danger-border] hover:bg-[--danger-bg] transition-colors"
                title="Bloquear">
                <Lock size={13} />
              </button>
          }
        </div>
      </div>

      {/* Expansão: badge mobile + detalhes */}
      {expanded && (
        <div className="px-4 pb-3 bg-[--bg-subtle] border-b border-[--border-subtle]">
          <div className="flex items-center gap-2 mb-2 pt-2 sm:hidden">
            <StatusBadge u={u} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {[
              { label: 'Plano',        value: u.plan || 'trial' },
              { label: 'Cadastro',     value: u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('pt-BR') : '—' },
              { label: 'Premium até',  value: u.premiumUntil ? new Date(u.premiumUntil).toLocaleDateString('pt-BR') : '—' },
              { label: 'Status',       value: u.blocked ? '🔴 Bloqueado' : '🟢 Ativo' },
            ].map(r => (
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
  const { user }   = useAuth()
  const [users, setUsers]    = useState([])
  const [search, setSearch]  = useState('')
  const [toast, setToast]    = useState('')
  const [error, setError]    = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin) return
    const unsub = onAllUsersChange(
      data => setUsers(data),
      err  => setError('Erro: ' + err.message)
    )
    return () => { if (unsub) unsub() }
  }, [isAdmin])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleActivate      = async (uid, m) => { await activatePremiumForUser(uid, m); showToast(`✓ Premium ativado por ${m} mês(es)`) }
  const handleRemovePremium = async uid       => { await removePremiumForUser(uid);      showToast('Premium removido.') }
  const handleBlock         = async uid       => { await blockUser(uid, true);            showToast('Usuário bloqueado.') }
  const handleUnblock       = async uid       => { await blockUser(uid, false);           showToast('Usuário desbloqueado.') }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
      <Shield size={40} className="text-[--text-tertiary]" />
      <p className="text-lg font-bold text-[--text-primary]">Acesso restrito</p>
      <p className="text-sm text-[--text-tertiary]">Área exclusiva para administradores.</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
      <AlertTriangle size={40} className="text-[--danger-icon]" />
      <p className="text-base font-bold text-[--text-primary]">Erro ao carregar dados</p>
      <p className="text-sm text-[--text-tertiary]">{error}</p>
    </div>
  )

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:   users.length,
    premium: users.filter(u => getPlanInfo(u).key === 'premium').length,
    trial:   users.filter(u => getPlanInfo(u).key === 'trial_active').length,
    blocked: users.filter(u => u.blocked).length,
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-black text-[--text-primary]">Painel Admin</h1>
        <p className="text-sm text-[--text-tertiary]">Usuários em tempo real</p>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: stats.total,   icon: <Users size={15} />,       style: STATUS_STYLES.free      },
          { label: 'Premium',    value: stats.premium, icon: <Star size={15} />,         style: STATUS_STYLES.premium   },
          { label: 'Trial',      value: stats.trial,   icon: <Clock size={15} />,        style: STATUS_STYLES.trial_active },
          { label: 'Bloqueados', value: stats.blocked, icon: <Lock size={15} />,         style: STATUS_STYLES.blocked   },
        ].map(s => (
          <Card key={s.label} className="!p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl mb-2 ${s.style.bg}`}>
              <span className={s.style.text}>{s.icon}</span>
            </div>
            <p className="text-2xl font-black text-[--text-primary]">{s.value}</p>
            <p className="text-xs text-[--text-tertiary]">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Instrução Pix */}
      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={15} className="text-[--warning-icon] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[--text-secondary] space-y-0.5">
            <p className="font-semibold text-[--text-primary]">Fluxo Pix</p>
            <p>1. Usuário paga R$ 19,90 e informa o e-mail na descrição.</p>
            <p>2. Localize abaixo e clique <strong>Ativar</strong>.</p>
          </div>
        </div>
      </Card>

      {/* Tabela de usuários */}
      <Card className="!p-0 overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle]">
          <h2 className="text-sm font-bold text-[--text-primary]">
            Usuários <span className="text-[--text-tertiary] font-normal">({filtered.length})</span>
          </h2>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--text-tertiary]" />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-xs border border-[--border-default] rounded-xl pl-7 pr-3 py-1.5 bg-[--bg-elevated] text-[--text-primary] focus:outline-none focus:border-[--brand-500] w-44"
            />
          </div>
        </div>

        {/* Header de colunas */}
        <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_auto] px-4 py-2 bg-[--bg-subtle] border-b border-[--border-subtle]">
          <span className="text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider">Usuário</span>
          <span className="hidden sm:block text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider">Status</span>
          <span className="text-[10px] font-bold text-[--text-tertiary] uppercase tracking-wider text-right">Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={28} className="text-[--text-tertiary] mx-auto mb-2" />
            <p className="text-sm text-[--text-tertiary]">
              {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
            </p>
          </div>
        ) : (
          filtered.map(u => (
            <UserRow key={u.uid} u={u}
              onActivate={handleActivate} onRemovePremium={handleRemovePremium}
              onBlock={handleBlock} onUnblock={handleUnblock} />
          ))
        )}
      </Card>
    </div>
  )
}
