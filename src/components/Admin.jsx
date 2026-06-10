// src/components/Admin.jsx
// Painel do administrador — bloquear/liberar usuários e confirmar pagamentos Pix
import React, { useState, useEffect } from 'react'
import { Shield, Users, Lock, Unlock, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Card, Button, Badge, Input } from './ui'

// E-mail do administrador — altere para o seu
const ADMIN_EMAIL = 'admin@cfpmoney.com'

// Gerencia planos de todos os usuários via localStorage
// (Em produção, substituir por Firestore/backend)
function getAllUserPlans() {
  const plans = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('cfp_plan_')) {
      try {
        const uid = key.replace('cfp_plan_', '')
        const plan = JSON.parse(localStorage.getItem(key))
        plans.push({ uid, ...plan })
      } catch {}
    }
  }
  return plans
}

function getPlanStatus(plan) {
  if (plan.blocked) return { label: 'Bloqueado', variant: 'danger' }
  const now = new Date()
  if (plan.type === 'premium' && plan.premiumUntil) {
    const until = new Date(plan.premiumUntil)
    const days = Math.ceil((until - now) / 86400000)
    if (days > 0) return { label: `Premium · ${days}d`, variant: 'success' }
    return { label: 'Premium expirado', variant: 'warning' }
  }
  if (plan.type === 'trial' && plan.trialStart) {
    const used = Math.floor((now - new Date(plan.trialStart)) / 86400000)
    const left = 7 - used
    if (left > 0) return { label: `Trial · ${left}d`, variant: 'info' }
    return { label: 'Trial expirado', variant: 'warning' }
  }
  return { label: 'Free', variant: 'secondary' }
}

function UserRow({ plan, onBlock, onUnblock, onActivatePremium }) {
  const status = getPlanStatus(plan)
  const [months, setMonths] = useState(1)

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate font-mono">{plan.uid}</p>
        <p className="text-xs text-[--text-tertiary]">
          {plan.premiumUntil ? `Vence: ${new Date(plan.premiumUntil).toLocaleDateString('pt-BR')}` :
           plan.trialStart   ? `Trial desde: ${new Date(plan.trialStart).toLocaleDateString('pt-BR')}` : '—'}
        </p>
      </div>
      <Badge variant={status.variant}>{status.label}</Badge>
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
          onClick={() => onActivatePremium(plan.uid, months)}>
          Ativar
        </Button>
        {plan.blocked
          ? <Button size="xs" variant="secondary" icon={<Unlock size={12} />} onClick={() => onUnblock(plan.uid)}>Liberar</Button>
          : <Button size="xs" variant="danger"    icon={<Lock size={12} />}    onClick={() => onBlock(plan.uid)}>Bloquear</Button>
        }
      </div>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [search, setSearch] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  const refresh = () => setPlans(getAllUserPlans())

  useEffect(() => { refresh() }, [])

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const handleActivate = (uid, months) => {
    const key = `cfp_plan_${uid}`
    const raw = localStorage.getItem(key)
    const plan = raw ? JSON.parse(raw) : {}
    const until = new Date()
    until.setDate(until.getDate() + months * 30)
    const updated = { ...plan, type: 'premium', premiumUntil: until.toISOString(), blocked: false }
    localStorage.setItem(key, JSON.stringify(updated))
    toast(`✓ Premium ativado por ${months} mês(es) para ${uid.slice(0, 8)}...`)
    refresh()
  }

  const handleBlock = (uid) => {
    const key = `cfp_plan_${uid}`
    const plan = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({ ...plan, blocked: true }))
    toast(`Usuário ${uid.slice(0, 8)}... bloqueado.`)
    refresh()
  }

  const handleUnblock = (uid) => {
    const key = `cfp_plan_${uid}`
    const plan = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({ ...plan, blocked: false }))
    toast(`Usuário ${uid.slice(0, 8)}... desbloqueado.`)
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

  const filtered = plans.filter(p => p.uid.toLowerCase().includes(search.toLowerCase()))
  const stats = {
    total: plans.length,
    premium: plans.filter(p => { const s = getPlanStatus(p); return s.label.startsWith('Premium ·') }).length,
    trial:   plans.filter(p => { const s = getPlanStatus(p); return s.label.startsWith('Trial ·') }).length,
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
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm">
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <Users size={16} />, color: 'text-[--brand-500]' },
          { label: 'Premium', value: stats.premium, icon: <CheckCircle size={16} />, color: 'text-[--success-icon]' },
          { label: 'Trial', value: stats.trial, icon: <Clock size={16} />, color: 'text-[--warning-icon]' },
          { label: 'Bloqueados', value: stats.blocked, icon: <Lock size={16} />, color: 'text-[--danger-icon]' },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-black text-[--text-primary]">{s.value}</p>
            <p className="text-xs text-[--text-tertiary]">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Pix instructions */}
      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-[--warning-icon] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[--text-secondary]">
            <p className="font-semibold text-[--text-primary] mb-1">Fluxo de pagamento Pix</p>
            <p>1. Usuário paga R$ 19,90 via Pix para a sua chave.</p>
            <p>2. Você identifica o UID do usuário (disponível no Firebase Console → Authentication).</p>
            <p>3. Use o botão <strong>Ativar</strong> ao lado do usuário para liberar o Premium.</p>
          </div>
        </div>
      </Card>

      {/* User list */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[--text-primary]">Usuários ({filtered.length})</h2>
          <Input placeholder="Buscar por UID..." value={search}
            onChange={e => setSearch(e.target.value)} className="w-56 text-sm py-1.5" />
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-[--text-tertiary] text-center py-8">Nenhum usuário encontrado.</p>
        ) : (
          filtered.map(plan => (
            <UserRow key={plan.uid} plan={plan}
              onBlock={handleBlock} onUnblock={handleUnblock} onActivatePremium={handleActivate} />
          ))
        )}
      </Card>
    </div>
  )
}
