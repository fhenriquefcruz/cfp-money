// src/components/Admin.jsx
import React, { useState, useEffect } from 'react'
import {
  Shield, Users, Lock, Unlock, CheckCircle, Clock,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Mail, User, Calendar
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Card, Button, Badge, Input } from './ui'
import { getAllPlansFromStorage, activatePremiumForEmail, blockEmailInStorage } from '../contexts/PlanContext'

const ADMIN_EMAIL = 'fhenriquefcruz@gmail.com' // troque pelo seu

function getPlanStatus(plan) {
  if (plan.blocked) return { label: 'Bloqueado', variant: 'danger' }
  const now = new Date()
  if (plan.type === 'premium' && plan.premiumUntil) {
    const days = Math.ceil((new Date(plan.premiumUntil) - now) / 86400000)
    if (days > 0) return { label: `Premium · ${days}d`, variant: 'success' }
    return { label: 'Premium expirado', variant: 'warning' }
  }
  if (plan.type === 'trial' && plan.trialStart) {
    const left = 7 - Math.floor((now - new Date(plan.trialStart)) / 86400000)
    if (left > 0) return { label: `Trial · ${left}d`, variant: 'info' }
    return { label: 'Trial expirado', variant: 'warning' }
  }
  return { label: 'Free', variant: 'secondary' }
}

function UserRow({ plan, onActivate, onBlock, onUnblock }) {
  const [expanded, setExpanded] = useState(false)
  const [months, setMonths] = useState(1)
  const status = getPlanStatus(plan)

  return (
    <div className="border-b border-[--border-subtle] last:border-0">
      {/* Linha principal */}
      <div className="flex flex-wrap items-center gap-3 py-3">
        {/* Email + expand */}
        <button
          className="flex items-center gap-2 flex-1 min-w-0 text-left group"
          onClick={() => setExpanded(v => !v)}>
          <div className="w-8 h-8 rounded-lg bg-[--brand-100] flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-[--brand-600]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate">{plan.email}</p>
            {plan.name && (
              <p className="text-xs text-[--text-tertiary] truncate">{plan.name}</p>
            )}
          </div>
          {expanded
            ? <ChevronUp size={14} className="text-[--text-tertiary] flex-shrink-0" />
            : <ChevronDown size={14} className="text-[--text-tertiary] flex-shrink-0" />}
        </button>

        <Badge variant={status.variant}>{status.label}</Badge>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <select
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            className="text-xs border border-[--border-default] rounded-lg px-2 py-1.5 bg-[--bg-elevated] text-[--text-primary]">
            <option value={1}>1 mês</option>
            <option value={2}>2 meses</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
          </select>
          <Button size="xs" variant="primary" icon={<CheckCircle size={12} />}
            onClick={() => onActivate(plan.email, months)}>
            Ativar
          </Button>
          {plan.blocked
            ? <Button size="xs" variant="secondary" icon={<Unlock size={12} />}
                onClick={() => onUnblock(plan.email)}>Liberar</Button>
            : <Button size="xs" variant="danger" icon={<Lock size={12} />}
                onClick={() => onBlock(plan.email)}>Bloquear</Button>
          }
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="pb-3 px-1">
          <div className="bg-[--bg-subtle] rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[--text-secondary]">
              <Mail size={12} className="text-[--text-tertiary]" />
              <span className="font-medium text-[--text-tertiary]">E-mail:</span>
              <span className="font-mono text-[--text-primary]">{plan.email}</span>
            </div>
            {plan.name && (
              <div className="flex items-center gap-2 text-[--text-secondary]">
                <User size={12} className="text-[--text-tertiary]" />
                <span className="font-medium text-[--text-tertiary]">Nome:</span>
                <span className="text-[--text-primary]">{plan.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[--text-secondary]">
              <Shield size={12} className="text-[--text-tertiary]" />
              <span className="font-medium text-[--text-tertiary]">Tipo:</span>
              <span className="text-[--text-primary] capitalize">{plan.type || 'free'}</span>
            </div>
            {plan.trialStart && (
              <div className="flex items-center gap-2 text-[--text-secondary]">
                <Calendar size={12} className="text-[--text-tertiary]" />
                <span className="font-medium text-[--text-tertiary]">Trial desde:</span>
                <span className="text-[--text-primary]">
                  {new Date(plan.trialStart).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {plan.premiumUntil && (
              <div className="flex items-center gap-2 text-[--text-secondary]">
                <Calendar size={12} className="text-[--text-tertiary]" />
                <span className="font-medium text-[--text-tertiary]">Premium até:</span>
                <span className="text-[--text-primary]">
                  {new Date(plan.premiumUntil).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[--text-secondary]">
              <Lock size={12} className="text-[--text-tertiary]" />
              <span className="font-medium text-[--text-tertiary]">Status:</span>
              <span className={plan.blocked ? 'text-[--danger-text] font-semibold' : 'text-[--success-text]'}>
                {plan.blocked ? 'Bloqueado' : 'Ativo'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [plans, setPlans]       = useState([])
  const [search, setSearch]     = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  const refresh = () => setPlans(getAllPlansFromStorage())
  useEffect(() => { refresh() }, [])

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const handleActivate = (email, months) => {
    activatePremiumForEmail(email, months)
    toast(`✓ Premium ativado por ${months} mês(es) para ${email}`)
    refresh()
  }

  const handleBlock = (email) => {
    blockEmailInStorage(email, true)
    toast(`Usuário ${email} bloqueado.`)
    refresh()
  }

  const handleUnblock = (email) => {
    blockEmailInStorage(email, false)
    toast(`Usuário ${email} desbloqueado.`)
    refresh()
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <Shield size={40} className="text-[--text-tertiary]" />
        <p className="text-lg font-bold text-[--text-primary]">Acesso restrito</p>
        <p className="text-sm text-[--text-tertiary]">Esta área é exclusiva para administradores.</p>
      </div>
    )
  }

  const filtered = plans.filter(p =>
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:   plans.length,
    premium: plans.filter(p => getPlanStatus(p).label.startsWith('Premium ·')).length,
    trial:   plans.filter(p => getPlanStatus(p).label.startsWith('Trial ·')).length,
    blocked: plans.filter(p => p.blocked).length,
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Painel Admin</h1>
          <p className="text-sm text-[--text-tertiary]">Gerenciamento de usuários e planos</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh}>
          Atualizar
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: stats.total,   icon: <Users size={16} />,        color: 'text-[--brand-500]'   },
          { label: 'Premium',    value: stats.premium, icon: <CheckCircle size={16} />,  color: 'text-[--success-icon]'},
          { label: 'Trial',      value: stats.trial,   icon: <Clock size={16} />,         color: 'text-[--warning-icon]'},
          { label: 'Bloqueados', value: stats.blocked, icon: <Lock size={16} />,          color: 'text-[--danger-icon]' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-black text-[--text-primary]">{s.value}</p>
            <p className="text-xs text-[--text-tertiary]">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Fluxo Pix */}
      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-[--warning-icon] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[--text-secondary] space-y-1">
            <p className="font-semibold text-[--text-primary]">Fluxo de pagamento Pix</p>
            <p>1. Usuário paga R$ 19,90 via Pix e informa o e-mail no campo de descrição.</p>
            <p>2. Localize o e-mail na lista abaixo (busca por nome ou e-mail).</p>
            <p>3. Clique em <strong>Ativar</strong> para liberar o Premium pelo período escolhido.</p>
          </div>
        </div>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-[--text-primary]">
            Usuários {filtered.length > 0 && `(${filtered.length})`}
          </h2>
          <Input
            placeholder="Buscar por e-mail ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 text-sm py-1.5"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Users size={28} className="text-[--text-tertiary] mx-auto mb-2" />
            <p className="text-sm text-[--text-tertiary]">
              {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário registrado ainda.'}
            </p>
          </div>
        ) : (
          filtered.map(plan => (
            <UserRow
              key={plan.email}
              plan={plan}
              onActivate={handleActivate}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
            />
          ))
        )}
      </Card>
    </div>
  )
}
