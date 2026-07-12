// src/components/Dashboard.jsx
import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Plus, ArrowRight,
  Target, AlertTriangle, Zap, Heart, ChevronLeft, ChevronRight, PiggyBank,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Card, Button, ProgressBar, EmptyState } from './ui'
import InfoTooltip from './InfoTooltip'
import { formatCurrency, formatRelativeDate, getMonthlyData } from '../utils'
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns'
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
  const isIncome = tx.type === 'income' && !tx.isSavings
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[--border-subtle] last:border-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: tx.isSavings ? '#6366f115' : (cat?.color || '#6366f1') + '18' }}>
        {tx.isSavings ? '🐷' : cat?.icon || (isIncome ? '💰' : '💸')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {tx.description || (tx.isSavings ? 'Poupança' : cat?.name) || 'Sem descrição'}
        </p>
        <p className="text-xs text-[--text-tertiary]">
          {formatRelativeDate(tx.date)}{cat && !tx.isSavings ? ` · ${cat.name}` : ''}
        </p>
      </div>
      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${
        tx.isSavings ? 'text-[--brand-500]' : isIncome ? 'text-[--success-icon]' : 'text-[--danger-icon]'
      }`}>
        {tx.isSavings ? '🐷' : isIncome ? '+' : '−'}{formatCurrency(tx.amount)}
      </span>
    </div>
  )
}

function calcHealthScore({ balance, income, budgetsOk, goalsActive, savingRate }) {
  let s = 0
  if (balance >= 0)       s += 30
  if (savingRate >= 20)   s += 25
  else if (savingRate >= 10) s += 12
  else if (savingRate >= 0)  s += 5
  if (budgetsOk)  s += 20
  if (goalsActive) s += 15
  if (income > 0)  s += 10
  return Math.min(100, s)
}

function HealthScore({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Ótima' : score >= 50 ? 'Regular' : 'Atenção'
  const emoji = score >= 75 ? '💚' : score >= 50 ? '💛' : '❤️'
  const r = 28, circ = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1">
          <p className="text-sm font-bold text-[--text-primary]">Saúde {label} {emoji}</p>
          <InfoTooltip text="Calculado com saldo, poupança, orçamentos e metas. Meta: acima de 75." />
        </div>
        <p className="text-xs text-[--text-tertiary] mt-0.5">
          {score >= 75 ? 'Finanças equilibradas.' : score >= 50 ? 'Há pontos a melhorar.' : 'Revise seus gastos.'}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { transactions, categories, goals, budgets, loading, getSummary, getCategoryTotals, getSpendingForecast } = useApp()

  const [viewDate, setViewDate] = useState(new Date())
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()
  const prevD = subMonths(viewDate, 1)

  const currentSummary = useMemo(() => getSummary(year, month), [year, month, transactions])
  const prevSummary    = useMemo(() => getSummary(prevD.getFullYear(), prevD.getMonth()), [prevD, transactions])
  const categoryTotals = useMemo(() => getCategoryTotals(year, month), [year, month, transactions])
  const monthlyData    = useMemo(() => getMonthlyData(transactions, 6, viewDate), [transactions, viewDate])
  const forecast       = useMemo(() => getSpendingForecast(), [transactions])

  const monthStart = startOfMonth(viewDate).toISOString().slice(0,10)
  const monthEnd   = endOfMonth(viewDate).toISOString().slice(0,10)

  const monthTx = useMemo(() =>
    transactions.filter(tx => tx.date >= monthStart && tx.date <= monthEnd && !tx.isSavings).slice(0,6),
    [transactions, monthStart, monthEnd]
  )

  const savingsBalance = useMemo(() =>
    transactions.filter(t => t.isSavings).reduce((s,t) => s + t.amount, 0), [transactions])

  const budgetAlerts = useMemo(() => budgets.map(b => {
    const cat   = categories.find(c => c.id === b.categoryId)
    const spent = transactions.filter(t => t.type==='expense' && t.categoryId===b.categoryId && t.date>=monthStart && t.date<=monthEnd).reduce((s,t)=>s+t.amount,0)
    return { budget:b, cat, spent, pct:(spent/b.amount)*100 }
  }).filter(b=>b.pct>=70).sort((a,b)=>b.pct-a.pct).slice(0,3), [budgets,transactions,categories,monthStart,monthEnd])

  const healthScore = useMemo(() => {
    const savingRate = currentSummary.income > 0 ? ((currentSummary.income-currentSummary.expenses)/currentSummary.income)*100 : 0
    return calcHealthScore({ balance:currentSummary.balance, income:currentSummary.income,
      budgetsOk: budgets.length>0 && budgetAlerts.filter(b=>b.pct>100).length===0,
      goalsActive: goals.length>0, savingRate })
  }, [currentSummary, budgets, budgetAlerts, goals])

  const expenseChange = prevSummary.expenses > 0
    ? ((currentSummary.expenses - prevSummary.expenses)/prevSummary.expenses)*100 : 0

  const greeting = () => { const h=new Date().getHours(); return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite' }
  const isLoading = loading.transactions
  const fade = { initial:{opacity:0,y:12}, animate:{opacity:1,y:0} }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">

      {/* Header — mês com destaque, saudação secundária */}
      <motion.div className="flex items-start justify-between" {...fade}>
        <div>
          {/* Mês é o destaque principal */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <button onClick={() => setViewDate(d => subMonths(d,1))}
              className="p-1 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-2xl font-black text-[--text-primary] capitalize">
              {format(viewDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </h1>
            <button onClick={() => setViewDate(d => addMonths(d,1))}
              className="p-1 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] transition-colors">
              <ChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <button onClick={() => setViewDate(new Date())}
                className="text-xs text-[--text-brand] hover:underline">Hoje</button>
            )}
          </div>
          {/* Saudação secundária */}
          <p className="text-xs text-[--text-tertiary]">
            {greeting()}, {user?.displayName?.split(' ')[0] || 'usuário'} 👋
          </p>
        </div>
        <Link to="/transactions">
          <Button variant="primary" icon={<Plus />} size="sm">Nova transação</Button>
        </Link>
      </motion.div>

      {/* Hero — saldo do mês como principal, sem duplicar nos cards abaixo */}
      <motion.div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-[--brand-700] via-[--brand-600] to-[--brand-500] text-white"
        initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{delay:0.05}}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white/70 text-sm">Saldo do mês</p>
            <InfoTooltip text="Receitas menos despesas do mês visualizado. Não inclui outros meses." className="text-white/60 hover:text-white" />
          </div>
          {isLoading
            ? <div className="h-12 w-44 rounded-xl bg-white/20 animate-pulse mb-4" />
            : <p className={`text-4xl sm:text-5xl font-black tabular-nums mb-4 ${currentSummary.balance >= 0 ? 'text-white' : 'text-red-300'}`}>
                {formatCurrency(currentSummary.balance)}
              </p>
          }
          {/* Receitas / Despesas / Poupança — linha secundária */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15">
            <div>
              <p className="text-white/55 text-[11px] mb-0.5">↑ Receitas</p>
              <p className="text-sm font-bold text-green-300">{formatCurrency(currentSummary.income)}</p>
            </div>
            <div>
              <p className="text-white/55 text-[11px] mb-0.5">↓ Despesas</p>
              <p className="text-sm font-bold text-red-300">{formatCurrency(currentSummary.expenses)}</p>
            </div>
            <div>
              <p className="text-white/55 text-[11px] mb-0.5 flex items-center gap-1"><PiggyBank size={10} /> Poupança</p>
              <p className="text-sm font-bold text-yellow-300">{formatCurrency(savingsBalance)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cards — apenas Previsão e Saúde (receitas/despesas já estão no hero) */}
      <motion.div className="grid grid-cols-2 gap-3" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}>
        <div className="bg-[--bg-surface] border border-[--border-default] rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={14} className="text-[#f59e0b]" />
            <p className="text-xs text-[--text-tertiary]">Previsão de gastos</p>
            <InfoTooltip text="Média das despesas dos últimos 3 meses." />
          </div>
          {isLoading ? <div className="h-6 w-24 bg-[--bg-hover] rounded animate-pulse" />
            : <p className="text-xl font-black text-[--text-primary] tabular-nums">{formatCurrency(forecast)}</p>}
          {forecast > 0 && <p className="text-[10px] text-[--text-tertiary] mt-0.5">média 3 meses</p>}
        </div>
        <div className="bg-[--bg-surface] border border-[--border-default] rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart size={14} className="text-[--danger-icon]" />
            <p className="text-xs text-[--text-tertiary]">Saúde financeira</p>
          </div>
          <HealthScore score={healthScore} />
        </div>
      </motion.div>

      {/* Gráficos — altura maior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" {...fade} transition={{delay:0.15}}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[--text-primary]">Evolução financeira</h3>
                <p className="text-xs text-[--text-tertiary]">Últimos 6 meses</p>
              </div>
              <InfoTooltip text="Receitas (verde) vs Despesas (vermelho) mês a mês." />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData} margin={{top:5,right:5,left:0,bottom:5}}>
                <defs>
                  <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:11,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false}
                  tickFormatter={v => formatCurrency(v, {compact:true})} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="income"   name="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#incG)" dot={false} activeDot={{r:4}} />
                <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#expG)" dot={false} activeDot={{r:4}} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div {...fade} transition={{delay:0.2}}>
          <Card className="h-full">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-[--text-primary]">Por categoria</h3>
              <InfoTooltip text="Distribuição das despesas do mês." />
            </div>
            {categoryTotals.length === 0
              ? <p className="text-xs text-[--text-tertiary] text-center py-8">Nenhuma despesa no mês</p>
              : <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={categoryTotals} cx="50%" cy="50%" innerRadius={38} outerRadius={62}
                        dataKey="total" nameKey="categoryName" paddingAngle={2}>
                        {categoryTotals.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(v)}
                        contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:12,fontSize:11}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {categoryTotals.slice(0,4).map((cat,i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}} />
                        <span className="text-xs text-[--text-secondary] flex-1 truncate">{cat.categoryName}</span>
                        <span className="text-xs font-semibold text-[--text-primary]">{formatCurrency(cat.total, {compact:true})}</span>
                      </div>
                    ))}
                  </div>
                </>
            }
          </Card>
        </motion.div>
      </div>

      {/* Linha inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" {...fade} transition={{delay:0.25}}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[--text-primary]">
                  Transações de {format(viewDate, 'MMMM', {locale:ptBR})}
                </h3>
                <InfoTooltip text="Últimas 6 transações do mês visualizado." />
              </div>
              <Link to="/transactions" className="text-xs text-[--text-brand] hover:underline flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {monthTx.length === 0
              ? <EmptyState icon={<Wallet />} title="Nenhuma transação no mês"
                  description="Adicione transações para visualizar aqui."
                  action={<Link to="/transactions"><Button variant="primary" icon={<Plus />} size="sm">Adicionar</Button></Link>} />
              : monthTx.map(tx => <TxItem key={tx.id} tx={tx} categories={categories} />)
            }
          </Card>
        </motion.div>

        <div className="space-y-4">
          {budgetAlerts.length > 0 && (
            <motion.div {...fade} transition={{delay:0.3}}>
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-[--warning-icon]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Alertas de orçamento</h3>
                  <InfoTooltip text="Categorias acima de 70% do limite mensal." />
                </div>
                <div className="space-y-3">
                  {budgetAlerts.map(({budget,cat,spent}) => (
                    <div key={budget.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{background:(cat?.color||'#ef4444')+'20'}}>{cat?.icon||'📦'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[--text-primary] truncate">{cat?.name}</span>
                          <span className={spent>budget.amount?'text-[--danger-text] font-bold':'text-[--text-secondary]'}>
                            {formatCurrency(spent,{compact:true})} / {formatCurrency(budget.amount,{compact:true})}
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
          <motion.div {...fade} transition={{delay:0.35}}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-[--brand-500]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Metas</h3>
                </div>
                <Link to="/goals" className="text-xs text-[--text-brand] hover:underline">Ver todas</Link>
              </div>
              {goals.length === 0
                ? <div className="text-center py-4">
                    <p className="text-xs text-[--text-tertiary] mb-2">Nenhuma meta</p>
                    <Link to="/goals"><Button variant="ghost" size="xs" icon={<Plus />}>Criar meta</Button></Link>
                  </div>
                : <div className="space-y-4">
                    {goals.slice(0,3).map(goal => {
                      const pct = Math.min(100,((goal.currentAmount||0)/goal.targetAmount)*100)
                      return (
                        <div key={goal.id}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-[--text-primary] truncate">{goal.emoji} {goal.name}</span>
                            <span className="text-[--text-tertiary] ml-2 flex-shrink-0">{pct.toFixed(0)}%</span>
                          </div>
                          <ProgressBar value={goal.currentAmount||0} max={goal.targetAmount} animated />
                          <div className="flex justify-between text-xs mt-1 text-[--text-tertiary]">
                            <span>{formatCurrency(goal.currentAmount||0)}</span>
                            <span>{formatCurrency(goal.targetAmount)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
              }
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
