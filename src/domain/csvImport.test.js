import { describe, expect, test } from 'vitest'
import { buildCsvImportPreview } from './csvImport'

const categories = [
  { id: 'food', name: 'Alimentação', color: '#111', icon: '🍽️' },
  { id: 'salary', name: 'Salário', color: '#222', icon: '💰' },
]

const paymentMethods = [
  { id: 'pix', label: 'PIX' },
  { id: 'transfer', label: 'Transferência' },
]

describe('buildCsvImportPreview', () => {
  test('normaliza CSV brasileiro e vincula categorias existentes', () => {
    const preview = buildCsvImportPreview(
      [
        'Data;Tipo;Descrição;Categoria;Valor;Pagamento',
        '01/09/2026;Despesa;Almoço;Alimentação;25,90;pix',
        '05/09/2026;Receita;Salário;Salário;5.000,00;Transferência',
      ].join('\n'),
      { categories, paymentMethods },
    )

    expect(preview.fatalIssues).toEqual([])
    expect(preview.summary.ready).toBe(2)
    expect(preview.rows[0].transaction).toMatchObject({
      date: '2026-09-01',
      type: 'expense',
      categoryId: 'food',
      amount: 25.9,
      paymentMethod: 'pix',
    })
    expect(preview.rows[1].transaction.amount).toBe(5000)
  })

  test('bloqueia linhas com data, tipo ou valor inválidos', () => {
    const preview = buildCsvImportPreview(
      [
        'Data;Tipo;Descrição;Categoria;Valor',
        '31/02/2026;Despesa;Teste;Alimentação;10,00',
        '01/09/2026;Outro;Teste;Alimentação;abc',
      ].join('\n'),
      { categories, paymentMethods },
    )

    expect(preview.summary.errors).toBe(2)
    expect(preview.rows.every((row) => row.importable === false)).toBe(true)
  })

  test('sinaliza categoria não cadastrada sem bloquear a importação', () => {
    const preview = buildCsvImportPreview(
      'Data;Tipo;Descrição;Categoria;Valor\n01/09/2026;Despesa;Pet shop;Pets;120,00',
      { categories, paymentMethods },
    )

    expect(preview.rows[0].status).toBe('warning')
    expect(preview.rows[0].importable).toBe(true)
    expect(preview.rows[0].transaction.categoryId).toBe('')
    expect(preview.rows[0].issues[0].code).toBe('unmatched_category')
  })

  test('marca duplicidade existente e não a seleciona por padrão', () => {
    const existingTransactions = [
      {
        date: '2026-09-01',
        type: 'expense',
        isSavings: false,
        amount: 25.9,
        description: 'Almoço',
        categoryName: 'Alimentação',
      },
    ]

    const preview = buildCsvImportPreview(
      'Data;Tipo;Descrição;Categoria;Valor\n01/09/2026;Despesa;Almoço;Alimentação;25,90',
      { categories, existingTransactions, paymentMethods },
    )

    expect(preview.rows[0].duplicate).toBe(true)
    expect(preview.rows[0].selectedByDefault).toBe(false)
    expect(preview.summary.duplicates).toBe(1)
  })

  test('exige as colunas mínimas antes de produzir a prévia', () => {
    const preview = buildCsvImportPreview('Descrição;Categoria\nAlmoço;Alimentação', {
      categories,
      paymentMethods,
    })

    expect(preview.rows).toEqual([])
    expect(preview.fatalIssues[0].code).toBe('missing_headers')
  })

  test('limita o tamanho para manter uma importação em lote segura', () => {
    const rows = Array.from(
      { length: 3 },
      (_, index) => `01/09/2026;Despesa;Linha ${index};Alimentação;10,00`,
    )
    const preview = buildCsvImportPreview(
      ['Data;Tipo;Descrição;Categoria;Valor', ...rows].join('\n'),
      { categories, paymentMethods, maxRows: 2 },
    )

    expect(preview.rows).toEqual([])
    expect(preview.fatalIssues[0].code).toBe('too_many_rows')
  })

  test('rejeita datas ISO impossíveis e mantém datas bissextas válidas', () => {
    const preview = buildCsvImportPreview(
      [
        'Data;Tipo;Descrição;Categoria;Valor;Vencimento',
        '2026-02-31;Despesa;Data inválida;Alimentação;20,00;',
        '2026-02-28;Despesa;Vencimento inválido;Alimentação;20,00;2026-02-31',
        '2028-02-29;Despesa;Bissexto válido;Alimentação;20,00;2028-03-01',
      ].join('\\n'),
      { categories, paymentMethods },
    )

    expect(preview.rows[0].importable).toBe(false)
    expect(preview.rows[0].issues.some((issue) => issue.code === 'invalid_date')).toBe(true)
    expect(preview.rows[1].transaction.dueDate).toBeUndefined()
    expect(preview.rows[1].issues.some((issue) => issue.code === 'invalid_due_date')).toBe(true)
    expect(preview.rows[2].status).toBe('ready')
    expect(preview.rows[2].transaction).toMatchObject({
      date: '2028-02-29',
      dueDate: '2028-03-01',
    })
  })

  test('rejeita frações de centavo sem arredondamento silencioso', () => {
    const preview = buildCsvImportPreview(
      [
        'Data;Tipo;Descrição;Categoria;Valor',
        '01/09/2026;Despesa;Milésimo;Alimentação;0,001',
        '02/09/2026;Despesa;Decimal ambíguo;Alimentação;1.234',
        '03/09/2026;Despesa;Notação científica;Alimentação;1e3',
        '04/09/2026;Despesa;Centavos exatos;Alimentação;0,29',
        '05/09/2026;Despesa;Milhar brasileiro;Alimentação;1.234,56',
      ].join('\\n'),
      { categories, paymentMethods },
    )

    expect(preview.summary.errors).toBe(3)
    for (const row of preview.rows.slice(0, 3)) {
      expect(row.importable).toBe(false)
      expect(row.issues.some((issue) => issue.code === 'invalid_amount')).toBe(true)
    }
    expect(preview.rows[3].transaction.amount).toBe(0.29)
    expect(preview.rows[4].transaction.amount).toBe(1234.56)
    expect(preview.rows.slice(3).every((row) => row.status === 'ready')).toBe(true)
  })
})
