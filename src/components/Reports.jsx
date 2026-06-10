// src/components/Reports.jsx — Premium only
import React, { useState, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, TrendingUp, TrendingDown, Calendar, Filter, BarChart2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Badge } from './ui'
import { formatCurrency, getMonthlyData } from '../utils'
import PremiumGate from './PremiumGate'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']

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

function StatItem({ label, value, sub, positive }) {
  return (
    <div className="text-center">
      <p className="text-xs text-[--text-tertiary] mb-0.5">{label}</p>
      <p className={`text-xl font-black tabular-nums ${positive === true ? 'text-[--success-icon]' : positive === false ? 'text-[--danger-icon]' : 'text-[--text-primary]'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[--text-tertiary] mt-0.5">{sub}</p>}
    </div>
  )
}

function ReportsContent() {
  const { transactions, categories, getSummary, getCategoryTotals } = useApp()
  const [period, setPeriod] = useState(6) // meses para análise

  const now = new Date()
  const monthlyData = useMemo(() => getMonthlyData(transactions, period), [transactions, period])

  const currentSummary = useMemo(() => getSummary(now.getFullYear(), now.getMonth()), [transactions])

  // Totais acumulados do período
  const periodTotals = useMemo(() => {
    let income = 0, expenses = 0
    for (let i = 0; i < period; i++) {
      const d = subMonths(now, i)
      const s = getSummary(d.getFullYear(), d.getMonth())
      income   += s.income
      expenses += s.expenses
    }
    return { income, expenses, balance: income - expenses, avg: expenses / period }
  }, [transactions, period])

  // Por categoria — período completo
  const categoryData = useMemo(() => {
    const totals = {}
    const cutoff = subMonths(now, period)
    transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= cutoff)
      .forEach(t => {
        if (!totals[t.categoryId]) totals[t.categoryId] = {
          name: t.categoryName || 'Sem categoria',
          value: 0, count: 0,
          color: t.categoryColor || '#6366f1',
        }
        totals[t.categoryId].value += t.amount
        totals[t.categoryId].count++
      })
    return Object.values(totals).sort((a, b) => b.value - a.value)
  }, [transactions, period])

  // Maior gasto
  const topCategory = categoryData[0]

  // Exportar CSV
  const exportCSV = () => {
    const rows = [
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
      ...transactions.map(t => [
        t.date, t.description || '', t.categoryName || '', t.type === 'income' ? 'Receita' : 'Despesa',
        t.amount.toFixed(2).replace('.', ',')
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `cfp_relatorio_${format(now, 'yyyy-MM')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Relatórios</h1>
          <p className="text-sm text-[--text-tertiary]">Análise financeira detalhada</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(Number(e.target.value))}
            className="text-sm border border-[--border-default] rounded-xl px-3 py-2 bg-[--bg-elevated] text-[--text-primary]">
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último ano</option>
          </select>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <Card>
        <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-4">
          Resumo dos últimos {period} meses
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-[--border-subtle]">
          <StatItem label="Total Receitas"  value={formatCurrency(periodTotals.income, { compact: true })}   positive={true} />
          <StatItem label="Total Despesas"  value={formatCurrency(periodTotals.expenses, { compact: true })} positive={false} />
          <StatItem label="Saldo do Período" value={formatCurrency(periodTotals.balance, { compact: true })}
            positive={periodTotals.balance >= 0} />
          <StatItem label="Média Mensal (gasto)" value={formatCurrency(periodTotals.avg, { compact: true })}
            sub="por mês" />
        </div>
      </Card>

      {/* Evolução mensal */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[--text-primary]">Evolução mensal</h3>
            <p className="text-xs text-[--text-tertiary]">Receitas vs Despesas</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCurrency(v, { compact: true })} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income"   name="Receitas" fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Saldo acumulado */}
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[--text-primary]">Saldo mês a mês</h3>
          <p className="text-xs text-[--text-tertiary]">Receita menos despesa</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCurrency(v, { compact: true })} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="balance" name="Saldo" stroke="#6366f1" strokeWidth={2.5}
              dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Por categoria */}
      {categoryData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[--text-primary]">Despesas por categoria</h3>
              <p className="text-xs text-[--text-tertiary]">Período completo selecionado</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[--text-primary]">Ranking de gastos</h3>
              {topCategory && (
                <p className="text-xs text-[--text-tertiary]">
                  Maior: <strong className="text-[--text-primary]">{topCategory.name}</strong> — {formatCurrency(topCategory.value, { compact: true })}
                </p>
              )}
            </div>
            <div className="space-y-3">
              {categoryData.slice(0, 6).map((cat, i) => {
                const pct = (cat.value / categoryData[0].value) * 100
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-[--text-primary] truncate max-w-[160px]">{cat.name}</span>
                        <span className="text-[--text-tertiary]">({cat.count}x)</span>
                      </div>
                      <span className="font-semibold text-[--text-primary] tabular-nums">
                        {formatCurrency(cat.value, { compact: true })}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[--bg-subtle] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
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
