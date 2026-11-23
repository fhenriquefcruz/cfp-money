import { describe, expect, it } from 'vitest'
import { buildPdfTransactionRows, resolveExportSummary } from './index'

const summary = {
  income: 5000,
  expenses: 3200,
  balance: 1800,
  savings: 400,
}

describe('resolveExportSummary', () => {
  it('aceita a assinatura atual com o resumo no segundo argumento', () => {
    expect(resolveExportSummary(summary)).toEqual(summary)
  })

  it('mantém compatibilidade com categorias e resumo no terceiro argumento', () => {
    const categories = [{ id: 'food', name: 'Alimentação' }]
    expect(resolveExportSummary(categories, summary)).toEqual(summary)
  })

  it('não interpreta uma lista de categorias como resumo financeiro', () => {
    expect(resolveExportSummary([{ id: 'food' }])).toEqual({})
  })
})

describe('extrato PDF mensal', () => {
  it('mantém as datas e a numeração de parcelas em meses diferentes', () => {
    const items = ['2026-09-01', '2026-10-01', '2026-11-01'].map((date, index) => ({
      type: 'expense', paymentMethod: 'credit_card', isCreditPurchase: true,
      isInstallment: true, installmentNum: index + 1, installmentOf: 3,
      purchaseDate: '2026-07-25', dueDate: date, date,
      description: 'Notebook', amount: 400,
    }))
    const rows = buildPdfTransactionRows(items)
    expect(rows.map((row) => row[0])).toEqual(['01/09/2026', '01/10/2026', '01/11/2026'])
    expect(rows.map((row) => row[2])).toEqual([
      'Notebook (1/3)', 'Notebook (2/3)', 'Notebook (3/3)',
    ])
    expect(rows.every((row) => row[4].includes('400,00'))).toBe(true)
  })

  it('não omite silenciosamente transações após a linha 300', () => {
    const rows = buildPdfTransactionRows(Array.from({ length: 301 }, (_, i) => ({
      type: 'expense', paymentMethod: 'pix', date: '2026-11-23',
      description: `Lançamento ${i + 1}`, amount: 1,
    })))
    expect(rows).toHaveLength(301)
  })
})
