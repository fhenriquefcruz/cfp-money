// src/components/Reports.jsx
import React, { useState, useMemo } from 'react'
import { BarChart, TrendingUp, Download } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { Card, Button } from './ui'
import { formatCurrency, getMonthlyData, exportToPDF } from '../utils'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function Reports() {
  const { transactions, categories } = useApp()
  const monthlyData = useMemo(() => getMonthlyData(transactions, 12), [transactions])
  const [loading, setLoading] = useState(false)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const handleExportPDF = async () => {
    setLoading(true)
    await exportToPDF(transactions, categories, { income: totalIncome, expenses: totalExpense, balance: totalIncome - totalExpense })
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-[--text-primary]">Relatórios</h1>
        <Button variant="primary" size="sm" icon={<Download />} onClick={handleExportPDF} loading={loading}>Exportar PDF</Button>
      </div>
      <Card>
        <h3 className="text-sm font-bold text-[--text-primary] mb-4">Evolução anual</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
            <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" fill="url(#incomeGrad)" />
            <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" fill="url(#expenseGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><h3 className="text-sm font-bold mb-2">Resumo</h3><p>Total receitas: {formatCurrency(totalIncome)}</p><p>Total despesas: {formatCurrency(totalExpense)}</p><p>Saldo acumulado: {formatCurrency(totalIncome - totalExpense)}</p></Card>
        <Card><h3 className="text-sm font-bold mb-2">Médias</h3><p>Mensal receitas: {formatCurrency(totalIncome / 12)}</p><p>Mensal despesas: {formatCurrency(totalExpense / 12)}</p></Card>
      </div>
    </div>
  )
}
