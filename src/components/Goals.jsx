// src/components/Reports.jsx
import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button, Badge } from './ui'
import { formatCurrency, getMonthlyData, exportToCSV, exportToPDF } from '../utils'
import PremiumGate from './PremiumGate'
import InfoTooltip from './InfoTooltip'
import { subMonths } from 'date-fns'

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

function KPICard({ label, value, positive, sub, tooltip }) {
  return (
    <div className="text-center p-4">
      <div className="flex items-center justify-center gap-1 mb-1">
        <p className="text-xs text-[--text-tertiary]">{label}</p>
        {tooltip && <InfoTooltip text={tooltip} size={12} />}
      </div>
      <p className={`text-xl font-black tabular-nums ${
        positive === true  ? 'text-[--success-icon]' :
        positive === false ? 'text-[--danger-icon]'  : 'text-[--text-primary]'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[--text-tertiary] mt-0.5">{sub}</p>}
    </div>
  )
}

function ReportsContent() {
  const { transactions, categories, getSummary } = useApp()
  const [period, setPeriod]       = useState(6)
  const [exporting, setExporting] = useState(false)

  const now        = new Date()
  const monthlyData = useMemo(() => getMonthlyData(transactions, period), [transactions, period])

  const periodTotals = useMemo(() => {
    let income = 0, expenses = 0
    for (let i = 0; i < period; i++) {
      const d = subMonths(now, i)
      const s = getSummary(d.getFullYear(), d.getMonth())
      income   += s.income
      expenses += s.expenses
    }
    const balance    = income - expenses
    const avg        = expenses / (period || 1)
    const savingRate = income > 0 ? ((income - expenses) / income) * 100 : 0
    return { income, expenses, balance, avg, savingRate }
  }, [transactions, period])

  const categoryData = useMemo(() => {
    const totals = {}
    const cutoff = subMonths(now, period)
    transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= cutoff)
      .forEach(t => {
        if (!totals[t.categoryId]) totals[t.categoryId] = {
          name:  t.categoryName || 'Sem categoria',
          value: 0, count: 0,
          color: t.categoryColor || '#6366f1',
        }
        totals[t.categoryId].value += t.amount
        totals[t.categoryId].count++
      })
    return Object.values(totals).sort((a, b) => b.value - a.value)
  }, [transactions, period])

  const handleExportCSV = () => {
    exportToCSV(transactions, categories)
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await exportToPDF(transactions, categories, periodTotals)
    } catch (e) {
      console.error('Erro ao gerar PDF:', e)
    } finally {
      setExporting(false)
    }
  }

  const hasTx = transactions.length > 0

  return (
    <div className="space-y-5 pb-24 lg:pb-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[--text-primary]">Relatórios</h1>
          <p className="text-sm text-[--text-tertiary]">Análise financeira detalhada do período</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            className="text-sm border border-[--border-default] rounded-xl px-3 py-2 bg-[--bg-elevated] text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-500]"
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último ano</option>
          </select>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExportCSV} disabled={!hasTx}>
            CSV
          </Button>
          <Button variant="primary" size="sm" icon={<FileText size={14} />} onClick={handleExportPDF}
            loading={exporting} disabled={!hasTx}>
            {exporting ? 'Gerando...' : 'PDF'}
          </Button>
        </div>
      </div>

      {!hasTx ? (
        <Card>
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-base font-bold text-[--text-primary] mb-1">Nenhuma transação ainda</p>
            <p className="text-sm text-[--text-tertiary]">Adicione transações para ver os relatórios.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">
                Resumo — últimos {period} meses
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-[--border-subtle]">
              <KPICard label="Receitas"       value={formatCurrency(periodTotals.income,   { compact: true })} positive={true}
                tooltip="Total de entradas no período selecionado." />
              <KPICard label="Despesas"       value={formatCurrency(periodTotals.expenses, { compact: true })} positive={false}
                tooltip="Total de saídas no período selecionado." />
              <KPICard label="Saldo"          value={formatCurrency(periodTotals.balance,  { compact: true })}
                positive={periodTotals.balance >= 0}
                tooltip="Diferença entre receitas e despesas no período." />
              <KPICard label="Média mensal"   value={formatCurrency(periodTotals.avg,      { compact: true })}
                sub="de gastos"
                tooltip="Média de despesas por mês no período selecionado." />
              <KPICard label="Taxa de poupança"
                value={`${periodTotals.savingRate.toFixed(1)}%`}
                positive={periodTotals.savingRate >= 20}
                sub={periodTotals.savingRate >= 20 ? 'Ótimo! 🎉' : periodTotals.savingRate >= 10 ? 'Razoável' : 'Atenção ⚠️'}
                tooltip="Percentual da sua renda que você está poupando. Meta saudável: acima de 20%." />
            </div>
          </Card>

          {/* Evolução mensal */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[--text-primary]">Evolução mensal</h3>
                <p className="text-xs text-[--text-tertiary]">Receitas vs Despesas</p>
              </div>
              <InfoTooltip text="Compare entradas e saídas mês a mês. Barras verdes acima das vermelhas indicam saúde financeira." />
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

          {/* Saldo mensal */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[--text-primary]">Saldo mês a mês</h3>
                <p className="text-xs text-[--text-tertiary]">Positivo = sobrou · Negativo = gastou mais que ganhou</p>
              </div>
              <InfoTooltip text="Quando a linha fica abaixo de zero, suas despesas superaram as receitas naquele mês." />
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
                <div className="flex items-center gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[--text-primary]">Despesas por categoria</h3>
                    <p className="text-xs text-[--text-tertiary]">Distribuição no período</p>
                  </div>
                  <InfoTooltip text="Proporção de cada categoria no total de gastos. Clique nas fatias para ver o valor." />
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={2}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)}
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {categoryData.slice(0, 6).map((cat, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[--text-secondary] truncate">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[--text-primary]">Ranking de gastos</h3>
                    <p className="text-xs text-[--text-tertiary]">
                      Maior: <strong className="text-[--text-primary]">{categoryData[0]?.name}</strong>
                    </p>
                  </div>
                  <InfoTooltip text="Categorias ordenadas do maior para o menor gasto no período. A barra mostra proporção em relação ao maior gasto." />
                </div>
                <div className="space-y-3">
                  {categoryData.slice(0, 7).map((cat, i) => {
                    const pct = (cat.value / categoryData[0].value) * 100
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="font-medium text-[--text-primary] truncate max-w-[140px]">{cat.name}</span>
                            <span className="text-[--text-tertiary]">{cat.count}x</span>
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
