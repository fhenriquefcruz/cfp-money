// src/components/Admin.jsx — Firestore real-time
import React, { useState, useEffect } from 'react'
import {
  Shield, Users, Lock, Unlock, CheckCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, Mail, User, Calendar, X, Star
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Card, Button, Badge } from './ui'
import { onAllUsersChange, activatePremiumForUser, removePremiumForUser, blockUser } from '../services/firebase'

const ADMIN_EMAIL = 'fhenriquefcruz@gmail.com'

function getPlanStatus(u) {
  if (u.blocked) return { label: 'Bloqueado', variant: 'danger' }
  const now = new Date()
  if (u.plan === 'premium' && u.premiumUntil) {
    const days = Math.ceil((new Date(u.premiumUntil) - now) / 86400000)
    if (days > 0) return { label: `Premium · ${days}d`, variant: 'success' }
    return { label: 'Premium expirado', variant: 'warning' }
  }
  if (u.plan === 'trial' || !u.plan) {
    const start = u.trialStart?.toDate?.() || new Date(u.trialStart)
    const left  = 7 - Math.floor((now - start) / 86400000)
    if (left > 0) return { label: `Trial · ${left}d`, variant: 'info' }
    return { label: 'Trial expirado', variant: 'warning' }
  }
  return { label: 'Free', variant: 'secondary' }
}

function UserRow({ u, onActivate, onRemovePremium, onBlock, onUnblock }) {
  const [expanded, setExpanded] = useState(false)
  const [months, setMonths]     = useState(1)
  const status = getPlanStatus(u)
  const isPremiumActive = u.plan === 'premium' && u.premiumUntil && new Date(u.premiumUntil) > new Date()

  return (
    <div className="border-b border-[--border-subtle] last:border-0">
      <div className="flex flex-wrap items-center gap-3 py-3">
        <button className="flex items-center gap-2 flex-1 min-w-0 text-left"
          onClick={() => setExpanded(v => !v)}>
          <div className="w-8 h-8 rounded-lg bg-[--brand-100] flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-[--brand-600]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate">{u.email}</p>
            {u.displayName && <p className="text-xs text-[--text-tertiary] truncate">{u.displayName}</p>}
          </div>
          {expanded ? <ChevronUp size={14} className="text-[--text-tertiary] flex-shrink-0" />
                    : <ChevronDown size={14} className="text-[--text-tertiary] flex-shrink-0" />}
        </button>

        <Badge variant={status.variant}>{status.label}</Badge>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={months} onChange={e => setMonths(Number(e.target.value))}
            className="text-xs border border-[--border-default] rounded-lg px-2 py-1.5 bg-[--bg-elevated] text-[--text-primary]">
            {[1,2,3,6].map(m => <option key={m} value={m}>{m} mês{m > 1 ? 'es' : ''}</option>)}
          </select>
          <Button size="xs" variant="primary" icon={<CheckCircle size={12} />}
            onClick={() => onActivate(u.uid, months)}>Ativar</Button>
          {isPremiumActive && (
            <Button size="xs" variant="warning" icon={<X size={12} />}
              onClick={() => onRemovePremium(u.uid)}>Remover</Button>
          )}
          {u.blocked
            ? <Button size="xs" variant="secondary" icon={<Unlock size={12} />} onClick={() => onUnblock(u.uid)}>Liberar</Button>
            : <Button size="xs" variant="danger"    icon={<Lock size={12} />}   onClick={() => onBlock(u.uid)}>Bloquear</Button>
          }
        </div>
      </div>

      {expanded && (
        <div className="pb-3 px-1">
          <div className="bg-[--bg-subtle] rounded-xl p-3 space-y-2 text-xs">
            {[
              { icon: <Mail size={12} />,     label: 'E-mail',        value: u.email },
              { icon: <User size={12} />,     label: 'Nome',          value: u.displayName || '—' },
              { icon: <Shield size={12} />,   label: 'Plano',         value: u.plan || 'trial' },
              { icon: <Calendar size={12} />, label: 'Cadastro',      value: u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('pt-BR') : '—' },
              { icon: <Star size={12} />,     label: 'Premium até',   value: u.premiumUntil ? new Date(u.premiumUntil).toLocaleDateString('pt-BR') : '—' },
              { icon: <Lock size={12} />,     label: 'Status',        value: u.blocked ? 'Bloqueado' : 'Ativo' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2 text-[--text-secondary]">
                <span className="text-[--text-tertiary]">{r.icon}</span>
                <span className="font-medium text-[--text-tertiary] w-20 flex-shrink-0">{r.label}:</span>
                <span className="text-[--text-primary]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [users, setUsers]       = useState([])
  const [search, setSearch]     = useState('')
  const [successMsg, setMsg]    = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin) return
    return onAllUsersChange(setUsers)
  }, [isAdmin])

  const toast = (msg) => { setMsg(msg); setTimeout(() => setMsg(''), 3000) }

  const handleActivate     = async (uid, months) => { await activatePremiumForUser(uid, months); toast(`✓ Premium ativado por ${months} mês(es)`) }
  const handleRemovePremium = async (uid)         => { await removePremiumForUser(uid);           toast('Premium removido.')                         }
  const handleBlock        = async (uid)           => { await blockUser(uid, true);                toast('Usuário bloqueado.')                        }
  const handleUnblock      = async (uid)           => { await blockUser(uid, false);               toast('Usuário desbloqueado.')                     }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
      <Shield size={40} className="text-[--text-tertiary]" />
      <p className="text-lg font-bold text-[--text-primary]">Acesso restrito</p>
      <p className="text-sm text-[--text-tertiary]">Esta área é exclusiva para administradores.</p>
    </div>
  )

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:   users.length,
    premium: users.filter(u => getPlanStatus(u).label.startsWith('Premium ·')).length,
    trial:   users.filter(u => getPlanStatus(u).label.startsWith('Trial ·')).length,
    blocked: users.filter(u => u.blocked).length,
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-black text-[--text-primary]">Painel Admin</h1>
        <p className="text-sm text-[--text-tertiary]">Todos os usuários em tempo real</p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: stats.total,   icon: <Users size={16} />,       color: 'text-[--brand-500]'    },
          { label: 'Premium',    value: stats.premium, icon: <CheckCircle size={16} />, color: 'text-[--success-icon]' },
          { label: 'Trial',      value: stats.trial,   icon: <Clock size={16} />,       color: 'text-[--warning-icon]' },
          { label: 'Bloqueados', value: stats.blocked, icon: <Lock size={16} />,        color: 'text-[--danger-icon]'  },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-black text-[--text-primary]">{s.value}</p>
            <p className="text-xs text-[--text-tertiary]">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-[--warning-icon] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[--text-secondary] space-y-1">
            <p className="font-semibold text-[--text-primary]">Fluxo de pagamento Pix</p>
            <p>1. Usuário paga R$ 19,90 e informa o e-mail na descrição do Pix.</p>
            <p>2. Localize o e-mail abaixo e clique em <strong>Ativar</strong>.</p>
            <p>3. O acesso é liberado instantaneamente em todos os dispositivos.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[--text-primary]">Usuários ({filtered.length})</h2>
          <input
            placeholder="Buscar por e-mail ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 text-sm border border-[--border-default] rounded-xl px-3 py-2 bg-[--bg-elevated] text-[--text-primary] focus:outline-none focus:border-[--brand-500]"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Users size={28} className="text-[--text-tertiary] mx-auto mb-2" />
            <p className="text-sm text-[--text-tertiary]">
              {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado ainda.'}
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
