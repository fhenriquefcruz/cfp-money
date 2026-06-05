// src/components/Dashboard.jsx
import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Plus, ArrowRight,
  Calendar, Target, AlertTriangle, Zap, Info
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Card, StatCard, Badge, Button, ProgressBar, EmptyState } from './ui'
import { formatCurrency, formatDate, formatRelativeDate, getMonthlyData } from '../utils'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── CUSTOM TOOLTIP ──
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[--bg-elevated] border border-[--border-default] rounded-xl p-3 shadow-lg">
      <p className="text-xs font-semibold text-[--text-secondary] mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[--text-secondary]">{entry.name}:</span>
          <span className="font-bold text-[--text-primary]">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── TRANSACTION ITEM ──
const TxItem = ({ tx, categories }) => {
  const cat = categories.find(c => c.id === tx.categoryId)
  const isIncome = tx.type === 'income'
  return (
    <motion.div
      className="flex items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: (cat?.color || '#6366f1') + '20' }}
      >
        {cat?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {tx.description || tx.categoryName || 'Sem descrição'}
        </p>
        <p className="text-xs text-[--text-tertiary]">
          {formatRelativeDate(tx.date)} • {tx.categoryName || cat?.name}
        </p>
      </div>
      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${isIncome ? 'text-[--success-icon]' : 'text-[--danger-icon]'}`}>
        {isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
      </span>
    </motion.div>
  )
}

// ── BUDGET ALERT ITEM ──
const BudgetAlert = ({ budget, spent, category }) => {
  const pct = Math.min(100, (spent / budget.amount) * 100)
  const isOver = pct >= 100
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: (category?.color || '#ef4444') + '20' }}
      >
        {category?.icon || '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-[--text-primary] truncate">{category?.name}</span>
          <span className={isOver ? 'text-[--danger-text] font-bold' : 'text-[--text-secondary]'}>
            {formatCurrency(spent)} / {formatCurrency(budget.amount)}
          </span>
        </div>
        <ProgressBar value={spent} max={budget.amount} animated />
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const { user } = useAuth()
  const { transactions, categories, goals, budgets, loading, getSummary, getCategoryTotals, getSpendingForecast } = useApp()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const prevMonth = subMonths(now, 1)

  const currentSummary = useMemo(() => getSummary(currentYear, currentMonth), [transactions])
  const prevSummary = useMemo(() => getSummary(prevMonth.getFullYear(), prevMonth.getMonth()), [transactions])
  const categoryTotals = useMemo(() => getCategoryTotals(currentYear, currentMonth), [transactions])
  const monthlyData = useMemo(() => getMonthlyData(transactions, 6), [transactions])
  const forecast = useMemo(() => getSpendingForecast(), [transactions])

  const totalBalance = useMemo(() =>
    transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
    transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  const recentTransactions = transactions.slice(0, 6)

  // Budget alerts (categories at ≥80%)
  const budgetAlerts = useMemo(() => {
    return budgets.map(budget => {
      const cat = categories.find(c => c.id === budget.categoryId)
      const spent = transactions
        .filter(t =>
          t.type === 'expense' &&
          t.categoryId === budget.categoryId &&
          new Date(t.date) >= new Date(currentYear, currentMonth, 1)
        )
        .reduce((s, t) => s + t.amount, 0)
      return { budget, cat, spent, pct: (spent / budget.amount) * 100 }
    }).filter(b => b.pct >= 70).sort((a, b) => b.pct - a.pct).slice(0, 3)
  }, [budgets, transactions, categories])

  // Expense change vs last month
  const expenseChange = prevSummary.expenses > 0
    ? ((currentSummary.expenses - prevSummary.expenses) / prevSummary.expenses) * 100
    : 0

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const isLoading = loading.transactions

  const fadeIn = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <motion.div className="flex items-start justify-between" {...fadeIn}>
        <div>
          <p className="text-sm text-[--text-tertiary] font-medium">
            {greeting()}, {user?.displayName?.split(' ')[0] || 'usuário'} 👋
          </p>
          <h1 className="text-2xl font-black text-[--text-primary] mt-0.5">
            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
        </div>
        <Link to="/transactions">
          <Button variant="primary" icon={<Plus />} size="sm">
            Nova transação
          </Button>
        </Link>
      </motion.div>

      {/* Balance Hero Card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[--brand-700] via-[--brand-600] to-[--brand-500] text-white"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium mb-1">Saldo total</p>
          {isLoading ? (
            <div className="h-10 w-48 rounded-xl bg-white/20 animate-pulse mb-4" />
          ) : (
            <p className="text-4xl font-black mb-4 tabular-nums">
              {formatCurrency(totalBalance)}
            </p>
          )}
          <div className="flex gap-6">
            <div>
              <p className="text-white/60 text-xs mb-0.5">Receitas do mês</p>
              <p className="text-lg font-bold">{formatCurrency(currentSummary.income)}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-white/60 text-xs mb-0.5">Despesas do mês</p>
              <p className="text-lg font-bold">{formatCurrency(currentSummary.expenses)}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-white/60 text-xs mb-0.5">Saldo do mês</p>
              <p className={`text-lg font-bold ${currentSummary.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatCurrency(currentSummary.balance)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard
          label="Receitas"
          value={isLoading ? '—' : formatCurrency(currentSummary.income, { compact: true })}
          icon={<TrendingUp />}
          color="#10b981"
          loading={isLoading}
        />
        <StatCard
          label="Despesas"
          value={isLoading ? '—' : formatCurrency(currentSummary.expenses, { compact: true })}
          icon={<TrendingDown />}
          color="#ef4444"
          loading={isLoading}
          trend={prevSummary.expenses > 0 ? {
            positive: expenseChange <= 0,
            label: `${Math.abs(expenseChange).toFixed(0)}% vs mês anterior`
          } : undefined}
        />
        <StatCard
          label="Saldo do mês"
          value={isLoading ? '—' : formatCurrency(currentSummary.balance, { compact: true })}
          icon={<Wallet />}
          color={currentSummary.balance >= 0 ? '#6366f1' : '#ef4444'}
          loading={isLoading}
        />
        <StatCard
          label="Previsão de gastos"
          value={isLoading ? '—' : formatCurrency(forecast, { compact: true })}
          icon={<Zap />}
          color="#f59e0b"
          loading={isLoading}
          trend={forecast > 0 ? { positive: false, label: 'Média 3 meses' } : undefined}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart — evolution */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[--text-primary]">Evolução financeira</h3>
                <p className="text-xs text-[--text-tertiary]">Últimos 6 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, { compact: true })}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Pie Chart — by category */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[--text-primary]">Por categoria</h3>
              <p className="text-xs text-[--text-tertiary]">Despesas do mês</p>
            </div>
            {categoryTotals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-[--text-tertiary]">Nenhuma despesa no mês</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="total"
                      nameKey="categoryName"
                      paddingAngle={2}
                    >
                      {categoryTotals.map((entry, i) => (
                        <Cell key={i} fill={entry.categoryColor || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => formatCurrency(v)}
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {categoryTotals.slice(0, 4).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.categoryColor }} />
                      <span className="text-xs text-[--text-secondary] flex-1 truncate">{cat.categoryName}</span>
                      <span className="text-xs font-semibold text-[--text-primary]">{formatCurrency(cat.total, { compact: true })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[--text-primary]">Transações recentes</h3>
              <Link to="/transactions" className="text-xs text-[--text-brand] hover:underline flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Nenhuma transação"
                description="Adicione sua primeira transação para começar o controle financeiro."
                action={
                  <Link to="/transactions">
                    <Button variant="primary" icon={<Plus />} size="sm">Adicionar</Button>
                  </Link>
                }
              />
            ) : (
              recentTransactions.map(tx => (
                <TxItem key={tx.id} tx={tx} categories={categories} />
              ))
            )}
          </Card>
        </motion.div>

        {/* Right column: Alerts + Goals */}
        <div className="space-y-4">
          {/* Budget Alerts */}
          {budgetAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-[--warning-icon]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Alertas de orçamento</h3>
                </div>
                <div className="space-y-4">
                  {budgetAlerts.map(({ budget, cat, spent }) => (
                    <BudgetAlert key={budget.id} budget={budget} spent={spent} category={cat} />
                  ))}
                </div>
                <Link to="/budgets" className="block mt-3 text-xs text-[--text-brand] hover:underline text-center">
                  Gerenciar orçamentos
                </Link>
              </Card>
            </motion.div>
          )}

          {/* Active Goals */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[--brand-500]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Metas</h3>
                </div>
                <Link to="/goals" className="text-xs text-[--text-brand] hover:underline">Ver todas</Link>
              </div>
              {goals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-[--text-tertiary] mb-2">Nenhuma meta definida</p>
                  <Link to="/goals">
                    <Button variant="ghost" size="xs" icon={<Plus />}>Criar meta</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.slice(0, 3).map(goal => {
                    const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-semibold text-[--text-primary] truncate">{goal.name}</span>
                          <span className="text-[--text-tertiary] ml-2 flex-shrink-0">{pct.toFixed(0)}%</span>
                        </div>
                        <ProgressBar value={goal.currentAmount} max={goal.targetAmount} animated />
                        <div className="flex justify-between text-xs mt-1 text-[--text-tertiary]">
                          <span>{formatCurrency(goal.currentAmount, { compact: true })}</span>
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
