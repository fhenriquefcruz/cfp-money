// src/components/Dashboard.jsx
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Plus, ArrowRight,
  Target, AlertTriangle, Zap, Heart,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Card, StatCard, Button, ProgressBar, EmptyState } from './ui'
import InfoTooltip from './InfoTooltip'
import { formatCurrency, formatRelativeDate, getMonthlyData } from '../utils'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PIE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[--bg-elevated] border border-[--border-default] rounded-xl p-3 shadow-lg">
      <p className="text-xs font-semibold text-[--text-secondary] mb-2">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-[--text-secondary]">{e.name}:</span>
          <span className="font-bold text-[--text-primary]">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

const TxItem = ({ tx, categories }) => {
  const cat = categories.find(c => c.id === tx.categoryId)
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: (cat?.color || '#6366f1') + '20' }}>
        {cat?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {tx.description || tx.categoryName || 'Sem descrição'}
        </p>
        <p className="text-xs text-[--text-tertiary]">
          {formatRelativeDate(tx.date)} · {tx.categoryName || cat?.name}
        </p>
      </div>
      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${isIncome ? 'text-[--success-icon]' : 'text-[--danger-icon]'}`}>
        {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
      </span>
    </div>
  )
}

// Índice de saúde financeira (0–100)
function calcHealthScore({ balance, income, expenses, budgetsOk, goalsActive, savingRate }) {
  let score = 0
  if (balance >= 0)    score += 30
  if (savingRate >= 20) score += 25
  else if (savingRate >= 10) score += 12
  else if (savingRate >= 0)  score += 5
  if (budgetsOk)      score += 20
  if (goalsActive)    score += 15
  if (income > 0)     score += 10
  return Math.min(100, score)
}

function HealthScore({ score }) {
  const color  = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label  = score >= 75 ? 'Ótima' : score >= 50 ? 'Regular' : 'Atenção'
  const emoji  = score >= 75 ? '💚' : score >= 50 ? '💛' : '❤️'
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const dash   = (score / 100) * circ

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
          <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold text-[--text-primary]">Saúde {label} {emoji}</p>
          <InfoTooltip text="Índice calculado com base no saldo do mês, taxa de poupança, controle de orçamento e metas ativas. Meta: acima de 75." />
        </div>
        <p className="text-xs text-[--text-tertiary] mt-0.5">
          {score >= 75 ? 'Continue assim! Suas finanças estão equilibradas.' :
           score >= 50 ? 'Atenção a alguns pontos para melhorar.' :
                         'Revise seus gastos e defina metas.'}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { transactions, categories, goals, budgets, loading, getSummary, getCategoryTotals, getSpendingForecast } = useApp()

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth()
  const prevMonth    = subMonths(now, 1)

  const currentSummary = useMemo(() => getSummary(currentYear, currentMonth), [transactions])
  const prevSummary    = useMemo(() => getSummary(prevMonth.getFullYear(), prevMonth.getMonth()), [transactions])
  const categoryTotals = useMemo(() => getCategoryTotals(currentYear, currentMonth), [transactions])
  const monthlyData    = useMemo(() => getMonthlyData(transactions, 6), [transactions])
  const forecast       = useMemo(() => getSpendingForecast(), [transactions])

  const totalBalance = useMemo(() =>
    transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0),
    [transactions]
  )

  const budgetAlerts = useMemo(() => {
    return budgets.map(budget => {
      const cat   = categories.find(c => c.id === budget.categoryId)
      const spent = transactions
        .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId &&
          new Date(t.date) >= new Date(currentYear, currentMonth, 1))
        .reduce((s, t) => s + t.amount, 0)
      return { budget, cat, spent, pct: (spent / budget.amount) * 100 }
    }).filter(b => b.pct >= 70).sort((a, b) => b.pct - a.pct).slice(0, 3)
  }, [budgets, transactions, categories])

  const healthScore = useMemo(() => {
    const savingRate = currentSummary.income > 0
      ? ((currentSummary.income - currentSummary.expenses) / currentSummary.income) * 100 : 0
    const budgetsOk  = budgets.length > 0 && budgetAlerts.filter(b => b.pct > 100).length === 0
    const goalsActive = goals.length > 0
    return calcHealthScore({
      balance:     currentSummary.balance,
      income:      currentSummary.income,
      expenses:    currentSummary.expenses,
      budgetsOk, goalsActive, savingRate,
    })
  }, [currentSummary, budgets, budgetAlerts, goals])

  const expenseChange = prevSummary.expenses > 0
    ? ((currentSummary.expenses - prevSummary.expenses) / prevSummary.expenses) * 100 : 0

  const greeting = () => {
    const h = now.getHours()
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  }

  const isLoading = loading.transactions
  const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">

      {/* Header */}
      <motion.div className="flex items-start justify-between" {...fade}>
        <div>
          <p className="text-sm text-[--text-tertiary] font-medium">
            {greeting()}, {user?.displayName?.split(' ')[0] || 'usuário'} 👋
          </p>
          <h1 className="text-2xl font-black text-[--text-primary] mt-0.5">
            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
        </div>
        <Link to="/transactions">
          <Button variant="primary" icon={<Plus />} size="sm">Nova transação</Button>
        </Link>
      </motion.div>

      {/* Hero saldo */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[--brand-700] via-[--brand-600] to-[--brand-500] text-white"
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white/70 text-sm font-medium">Saldo total acumulado</p>
            <InfoTooltip
              text="Soma de todas as receitas menos todas as despesas desde o início. Não se limita ao mês atual."
              className="text-white/60 hover:text-white" />
          </div>
          {isLoading
            ? <div className="h-10 w-48 rounded-xl bg-white/20 animate-pulse mb-4" />
            : <p className="text-4xl font-black mb-4 tabular-nums">{formatCurrency(totalBalance)}</p>
          }
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: 'Receitas do mês',  value: currentSummary.income },
              { label: 'Despesas do mês',  value: currentSummary.expenses },
              { label: 'Saldo do mês',     value: currentSummary.balance, colored: true },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px bg-white/20 hidden sm:block" />}
                <div>
                  <p className="text-white/60 text-xs mb-0.5">{item.label}</p>
                  <p className={`text-lg font-bold ${item.colored ? (item.value >= 0 ? 'text-green-300' : 'text-red-300') : ''}`}>
                    {formatCurrency(item.value)}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <StatCard label="Receitas" value={formatCurrency(currentSummary.income, { compact: true })}
          icon={<TrendingUp />} color="#10b981" loading={isLoading}
          tooltip="Total de entradas registradas no mês atual." />
        <StatCard label="Despesas" value={formatCurrency(currentSummary.expenses, { compact: true })}
          icon={<TrendingDown />} color="#ef4444" loading={isLoading}
          tooltip="Total de saídas registradas no mês atual."
          trend={prevSummary.expenses > 0 ? {
            positive: expenseChange <= 0,
            label: `${Math.abs(expenseChange).toFixed(0)}% vs mês anterior`,
          } : undefined} />
        <StatCard label="Saldo do mês" value={formatCurrency(currentSummary.balance, { compact: true })}
          icon={<Wallet />} color={currentSummary.balance >= 0 ? '#6366f1' : '#ef4444'} loading={isLoading}
          tooltip="Receitas menos despesas do mês atual." />
        <StatCard label="Previsão de gastos" value={formatCurrency(forecast, { compact: true })}
          icon={<Zap />} color="#f59e0b" loading={isLoading}
          tooltip="Média das despesas dos últimos 3 meses. Útil para planejar o mês corrente."
          trend={forecast > 0 ? { positive: false, label: 'Média 3 meses' } : undefined} />
      </motion.div>

      {/* Índice de saúde + gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.15 }}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[--text-primary]">Evolução financeira</h3>
                <p className="text-xs text-[--text-tertiary]">Últimos 6 meses</p>
              </div>
              <InfoTooltip text="Comparativo mensal entre receitas (verde) e despesas (vermelho). Área verde acima = mês positivo." />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => formatCurrency(v, { compact: true })} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="income"   name="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#incG)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#expG)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Pie + Health */}
        <motion.div className="space-y-4" {...fade} transition={{ delay: 0.2 }}>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-[--text-primary]">Por categoria</h3>
              <InfoTooltip text="Distribuição das despesas do mês atual por categoria." />
            </div>
            {categoryTotals.length === 0 ? (
              <p className="text-xs text-[--text-tertiary] text-center py-6">Nenhuma despesa no mês</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={categoryTotals} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                      dataKey="total" nameKey="categoryName" paddingAngle={2}>
                      {categoryTotals.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {categoryTotals.slice(0, 3).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-[--text-secondary] flex-1 truncate">{cat.categoryName}</span>
                      <span className="text-xs font-semibold text-[--text-primary]">{formatCurrency(cat.total, { compact: true })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Índice de saúde financeira */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Heart size={14} className="text-[--danger-icon]" />
              <h3 className="text-sm font-bold text-[--text-primary]">Saúde financeira</h3>
            </div>
            <HealthScore score={healthScore} />
          </Card>
        </motion.div>
      </div>

      {/* Linha inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" {...fade} transition={{ delay: 0.25 }}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">Transações recentes</h3>
                <InfoTooltip text="Últimas 6 movimentações registradas, independente do mês." />
              </div>
              <Link to="/transactions" className="text-xs text-[--text-brand] hover:underline flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {transactions.length === 0 ? (
              <EmptyState icon={<Wallet />} title="Nenhuma transação"
                description="Adicione sua primeira transação para começar."
                action={<Link to="/transactions"><Button variant="primary" icon={<Plus />} size="sm">Adicionar</Button></Link>} />
            ) : (
              transactions.slice(0, 6).map(tx => <TxItem key={tx.id} tx={tx} categories={categories} />)
            )}
          </Card>
        </motion.div>

        <div className="space-y-4">
          {budgetAlerts.length > 0 && (
            <motion.div {...fade} transition={{ delay: 0.3 }}>
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-[--warning-icon]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Alertas de orçamento</h3>
                  <InfoTooltip text="Categorias que atingiram 70% ou mais do limite mensal definido." />
                </div>
                <div className="space-y-4">
                  {budgetAlerts.map(({ budget, cat, spent }) => (
                    <div key={budget.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: (cat?.color || '#ef4444') + '20' }}>
                        {cat?.icon || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[--text-primary] truncate">{cat?.name}</span>
                          <span className={spent > budget.amount ? 'text-[--danger-text] font-bold' : 'text-[--text-secondary]'}>
                            {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                          </span>
                        </div>
                        <ProgressBar value={spent} max={budget.amount} animated />
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/budgets" className="block mt-3 text-xs text-[--text-brand] hover:underline text-center">
                  Gerenciar orçamentos
                </Link>
              </Card>
            </motion.div>
          )}

          <motion.div {...fade} transition={{ delay: 0.35 }}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[--brand-500]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Metas</h3>
                  <InfoTooltip text="Seus objetivos financeiros e o progresso atual. Use 'Aportar' nas metas para atualizar." />
                </div>
                <Link to="/goals" className="text-xs text-[--text-brand] hover:underline">Ver todas</Link>
              </div>
              {goals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-[--text-tertiary] mb-2">Nenhuma meta definida</p>
                  <Link to="/goals"><Button variant="ghost" size="xs" icon={<Plus />}>Criar meta</Button></Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 3).map(goal => {
                    const pct = Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100)
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-[--text-primary] truncate">{goal.emoji} {goal.name}</span>
                          <span className="text-[--text-tertiary] ml-2 flex-shrink-0">{pct.toFixed(0)}%</span>
                        </div>
                        <ProgressBar value={goal.currentAmount || 0} max={goal.targetAmount} animated />
                        <div className="flex justify-between text-xs mt-1 text-[--text-tertiary]">
                          <span>{formatCurrency(goal.currentAmount || 0, { compact: true })}</span>
                          <span>{formatCurrency(goal.targetAmount, { compact: true })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
