// src/components/Reports.jsx
import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Download, FileText, TrendingUp, TrendingDown, PiggyBank, ArrowLeftRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button } from './ui'
import { formatCurrency, getMonthlyData, exportToCSV, exportToPDF } from '../utils'
import PremiumGate from './PremiumGate'
import InfoTooltip from './InfoTooltip'
import { subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[--bg-elevated] border border-[--border-default] rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-[--text-secondary] mb-2">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
          <span className="text-[--text-secondary]">{e.name}:</span>
          <span className="font-bold text-[--text-primary]">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

function KPI({ label, value, sub, color, icon, tooltip }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-[--bg-surface] border border-[--border-default] rounded-2xl">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '18', color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs text-[--text-tertiary]">{label}</p>
          {tooltip && <InfoTooltip text={tooltip} size={11} />}
        </div>
        <p className="text-lg font-black tabular-nums text-[--text-primary]">{value}</p>
        {sub && <p className="text-[10px] text-[--text-tertiary]">{sub}</p>}
      </div>
    </div>
  )
}

function SavingRateBadge({ rate }) {
  const color = rate >= 20 ? '#10b981' : rate >= 10 ? '#f59e0b' : '#ef4444'
  const label = rate >= 20 ? '🎉 Ótimo' : rate >= 10 ? '⚠️ Razoável' : '🚨 Atenção'
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border"
      style={{ background: color + '10', borderColor: color + '30' }}>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color }}>{label}</p>
        <p className="text-[10px] text-[--text-tertiary]">
          {rate >= 20 ? 'Você está poupando acima de 20% — excelente!' :
           rate >= 10 ? 'Poupança entre 10–20%. Tente aumentar.' :
                        'Abaixo de 10%. Revise seus gastos fixos.'}
        </p>
      </div>
      <p className="text-2xl font-black" style={{ color }}>{rate.toFixed(1)}%</p>
    </div>
  )
}

function ReportsContent() {
  const { transactions, categories, getSummary } = useApp()
  const [period, setPeriod]       = useState(6)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab]             = useState('overview') // 'overview' | 'categories' | 'savings'

  const now = new Date()

  const periodTotals = useMemo(() => {
    let income = 0, expenses = 0, savings = 0
    for (let i = 0; i < period; i++) {
      const d = subMonths(now, i)
      const s = getSummary(d.getFullYear(), d.getMonth())
      income   += s.income
      expenses += s.expenses
    }
    const balance    = income - expenses
    const avg        = expenses / (period || 1)
    const savingRate = income > 0 ? ((income - expenses) / income) * 100 : 0
    // Poupança no período
    const cutoff = subMonths(now, period)
    savings = transactions
      .filter(t => t.isSavings && new Date(t.date) >= cutoff)
      .reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance, avg, savingRate, savings }
  }, [transactions, period, getSummary])

  const monthlyData = useMemo(() => getMonthlyData(transactions, period), [transactions, period])

  // Dados de poupança mês a mês
  const savingsMonthly = useMemo(() => {
    return Array.from({ length: period }, (_, i) => {
      const d     = subMonths(now, period - 1 - i)
      const label = format(d, 'MMM', { locale: ptBR })
      const from  = format(d, 'yyyy-MM-01')
      const to    = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd')
      const value = transactions
        .filter(t => t.isSavings && t.date >= from && t.date <= to)
        .reduce((s, t) => s + t.amount, 0)
      return { month: label, value }
    })
  }, [transactions, period])

  const categoryData = useMemo(() => {
    const totals = {}
    const cutoff = subMonths(now, period).toISOString().slice(0, 10)
    transactions
      .filter(t => t.type === 'expense' && !t.isSavings && t.date >= cutoff)
      .forEach(t => {
        if (!totals[t.categoryId]) totals[t.categoryId] = {
          name: t.categoryName || 'Sem categoria',
          value: 0, count: 0, color: t.categoryColor || '#6366f1',
        }
        totals[t.categoryId].value += t.amount
        totals[t.categoryId].count++
      })
    return Object.values(totals).sort((a, b) => b.value - a.value)
  }, [transactions, period])

  const hasTx = transactions.length > 0

  const handleExportPDF = async () => {
    setExporting(true)
    try { await exportToPDF(transactions, categories, periodTotals) }
    catch (e) { console.error(e) }
    finally { setExporting(false) }
  }

  const TABS = [
    { id: 'overview',    label: 'Visão Geral' },
    { id: 'categories',  label: 'Categorias'  },
    { id: 'savings',     label: '🐷 Poupança' },
  ]

  return (
    <div className="space-y-5 pb-24 lg:pb-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Relatórios</h1>
          <p className="text-xs text-[--text-tertiary] mt-0.5">Análise do seu período financeiro</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={period} onChange={e => setPeriod(Number(e.target.value))}
            className="text-sm border border-[--border-default] rounded-xl px-3 py-2 bg-[--bg-elevated]
              text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]">
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
          <Button variant="secondary" size="sm" icon={<Download size={14} />}
            onClick={() => exportToCSV(transactions, categories)} disabled={!hasTx}>
            CSV
          </Button>
          <Button variant="primary" size="sm" icon={<FileText size={14} />}
            onClick={handleExportPDF} loading={exporting} disabled={!hasTx}>
            {exporting ? 'Gerando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {!hasTx ? (
        <Card>
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📊</p>
            <p className="text-base font-bold text-[--text-primary] mb-1">Nenhuma transação ainda</p>
            <p className="text-sm text-[--text-tertiary]">Adicione transações para ver os relatórios.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Receitas"     value={formatCurrency(periodTotals.income)} color="#10b981" icon={<TrendingUp size={16} />}   tooltip="Total de entradas no período." />
            <KPI label="Despesas"     value={formatCurrency(periodTotals.expenses)} color="#ef4444" icon={<TrendingDown size={16} />}  tooltip="Total de saídas no período." />
            <KPI label="Saldo"        value={formatCurrency(periodTotals.balance)} color={periodTotals.balance >= 0 ? '#6366f1' : '#ef4444'} icon={<ArrowLeftRight size={16} />} tooltip="Receitas menos despesas." />
            <KPI label="Poupança"     value={formatCurrency(periodTotals.savings)} color="#6366f1" icon={<PiggyBank size={16} />}     tooltip="Total depositado em poupança no período." />
          </div>

          {/* Taxa de poupança */}
          {periodTotals.income > 0 && <SavingRateBadge rate={periodTotals.savingRate} />}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[--bg-hover] rounded-2xl">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-150
                  ${tab === t.id
                    ? 'bg-[--bg-surface] text-[--text-primary] shadow-sm'
                    : 'text-[--text-tertiary] hover:text-[--text-secondary]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Visão Geral */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-[--text-primary]">Receitas vs Despesas</h3>
                  <InfoTooltip text="Comparativo mensal. Barras verdes = entradas, vermelhas = saídas." />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => formatCurrency(v, { compact: true })} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income"   name="Receitas" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-[--text-primary]">Saldo mês a mês</h3>
                  <InfoTooltip text="Linha abaixo de zero = despesas superaram receitas naquele mês." />
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="balG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => formatCurrency(v, { compact: true })} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="balance" name="Saldo" stroke="#6366f1" strokeWidth={2.5}
                      fill="url(#balG)" dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Média por mês */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <p className="text-xs text-[--text-tertiary] mb-1 flex items-center gap-1">
                    Gasto médio mensal <InfoTooltip text="Média de despesas por mês no período." size={11} />
                  </p>
                  <p className="text-xl font-black text-[--danger-icon]">{formatCurrency(periodTotals.avg)}</p>
                  <p className="text-[10px] text-[--text-tertiary] mt-0.5">por mês</p>
                </Card>
                <Card>
                  <p className="text-xs text-[--text-tertiary] mb-1 flex items-center gap-1">
                    Poupado por mês <InfoTooltip text="Média de depósitos em poupança por mês." size={11} />
                  </p>
                  <p className="text-xl font-black text-[--brand-500]">
                    {formatCurrency(periodTotals.savings / period)}
                  </p>
                  <p className="text-[10px] text-[--text-tertiary] mt-0.5">em média</p>
                </Card>
              </div>
            </div>
          )}

          {/* Categorias */}
          {tab === 'categories' && (
            <div className="space-y-4">
              {categoryData.length === 0 ? (
                <Card><p className="text-center text-sm text-[--text-tertiary] py-10">Nenhuma despesa no período.</p></Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <h3 className="text-sm font-bold text-[--text-primary] mb-4">Distribuição</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            dataKey="value" nameKey="name" paddingAngle={2}>
                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => formatCurrency(v)}
                            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card>
                      <h3 className="text-sm font-bold text-[--text-primary] mb-4">Ranking</h3>
                      <div className="space-y-3">
                        {categoryData.slice(0, 7).map((cat, i) => {
                          const pct = (cat.value / categoryData[0].value) * 100
                          return (
                            <div key={i}>
                              <div className="flex justify-between items-center text-xs mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                  <span className="font-medium text-[--text-primary] truncate max-w-[130px]">{cat.name}</span>
                                  <span className="text-[--text-tertiary]">{cat.count}x</span>
                                </div>
                                <span className="font-bold text-[--text-primary]">{formatCurrency(cat.value, { compact: true })}</span>
                              </div>
                              <div className="h-1.5 bg-[--bg-subtle] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Poupança */}
          {tab === 'savings' && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <PiggyBank size={16} className="text-[--brand-500]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Evolução da Poupança</h3>
                  <InfoTooltip text="Quanto você depositou em poupança a cada mês no período." />
                </div>
                {periodTotals.savings === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">🐷</p>
                    <p className="text-sm font-bold text-[--text-primary]">Nenhum depósito em poupança</p>
                    <p className="text-xs text-[--text-tertiary] mt-1">
                      Adicione uma transação do tipo "Poupança" para começar a acompanhar.
                    </p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={savingsMonthly} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
                          tickFormatter={v => formatCurrency(v, { compact: true })} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="value" name="Poupança" fill="#6366f1" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="text-center p-3 bg-[--brand-50] rounded-xl border border-[--brand-200]">
                        <p className="text-xs text-[--brand-600] mb-0.5">Total poupado</p>
                        <p className="text-xl font-black text-[--brand-700]">{formatCurrency(periodTotals.savings)}</p>
                      </div>
                      <div className="text-center p-3 bg-[--brand-50] rounded-xl border border-[--brand-200]">
                        <p className="text-xs text-[--brand-600] mb-0.5">Média mensal</p>
                        <p className="text-xl font-black text-[--brand-700]">{formatCurrency(periodTotals.savings / period)}</p>
                      </div>
                    </div>

                    {/* Progresso em relação à receita */}
                    <div className="mt-4 p-3 bg-[--bg-subtle] rounded-xl">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[--text-secondary]">Poupado vs Receita total</span>
                        <span className="font-bold text-[--text-primary]">
                          {periodTotals.income > 0 ? ((periodTotals.savings / periodTotals.income) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-[--bg-hover] rounded-full overflow-hidden">
                        <div className="h-full bg-[--brand-500] rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, periodTotals.income > 0 ? (periodTotals.savings / periodTotals.income) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Reports() {
  return (
    <PremiumGate feature="Relatórios">
      <ReportsContent />
    </PremiumGate>
  )
}
