import React from 'react'
import { ArrowDownRight, ArrowUpRight, ReceiptText, WalletCards } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatCurrency } from '../utils'
import { Card } from './ui'

const COLORS = [
  '#c49d6b',
  '#4e8066',
  '#a7804e',
  '#b64c43',
  '#786c8d',
  '#9a6671',
  '#5f8587',
  '#b87645',
]

function Insight({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary]">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-black text-[--text-primary]">{value}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export default function ReportExecutiveOverview({ highlights, categoryData }) {
  const hasCategories = categoryData.length > 0

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="h-full">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[--brand-600]">
            Distribuição
          </p>
          <h3 className="mt-1 text-sm font-black text-[--text-primary]">
            Para onde foram as despesas
          </h3>
          <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
            Participação das categorias no total gasto do período selecionado.
          </p>
        </div>

        {hasCategories ? (
          <div className="grid items-center gap-3 min-[480px]:grid-cols-[160px_minmax(0,1fr)]">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={43}
                  outerRadius={68}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                >
                  {categoryData.map((category, index) => (
                    <Cell
                      key={category.name || index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {categoryData.slice(0, 4).map((category, index) => (
                <div key={category.name || index} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-[--text-secondary]">
                    {category.name}
                  </span>
                  <span className="text-xs font-black text-[--text-primary]">
                    {formatCurrency(category.value, { compact: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-xs text-[--text-tertiary]">
            Ainda não há despesas para distribuir neste período.
          </p>
        )}
      </Card>

      <Card className="h-full">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[--brand-600]">
            Leitura rápida
          </p>
          <h3 className="mt-1 text-sm font-black text-[--text-primary]">
            O que os números dizem
          </h3>
          <p className="mt-1 text-[10px] leading-relaxed text-[--text-tertiary]">
            Indicadores objetivos para entender o período sem navegar por várias abas.
          </p>
        </div>

        <div className="grid gap-2 min-[480px]:grid-cols-2">
          <Insight
            icon={ReceiptText}
            label="Média mensal de despesas"
            value={formatCurrency(highlights.averageMonthlyExpenses)}
            helper="Média calculada sobre o período escolhido."
          />
          <Insight
            icon={WalletCards}
            label="Despesas sobre receitas"
            value={
              highlights.expenseIncomeRatio === null
                ? 'Sem base'
                : `${highlights.expenseIncomeRatio.toFixed(1)}%`
            }
            helper={
              highlights.expenseIncomeRatio === null
                ? 'Não há receita suficiente para calcular a relação.'
                : 'Percentual da receita consumido pelas despesas.'
            }
          />
          <Insight
            icon={ArrowUpRight}
            label="Maior saldo mensal"
            value={
              highlights.bestMonth
                ? formatCurrency(highlights.bestMonth.balance)
                : 'Sem histórico'
            }
            helper={highlights.bestMonth?.month || 'Ainda sem meses suficientes.'}
          />
          <Insight
            icon={ArrowDownRight}
            label="Categoria com maior peso"
            value={
              highlights.topCategory
                ? `${highlights.topCategory.name} · ${highlights.topCategory.share.toFixed(0)}%`
                : 'Sem despesas'
            }
            helper={
              highlights.topCategory
                ? formatCurrency(highlights.topCategory.value)
                : 'Nenhuma categoria com gasto no período.'
            }
          />
        </div>
      </Card>
    </div>
  )
}
