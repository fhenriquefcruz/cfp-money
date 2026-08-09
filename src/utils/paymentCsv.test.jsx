import { describe, expect, test } from 'vitest'
import { parseCSVImport } from './index'

describe('CSV de pagamentos', () => {
  test('importa vencimento, forma e status de pagamento do formato novo', () => {
    const csv = [
      '"Data";"Vencimento";"Tipo";"Descrição";"Categoria";"Valor";"Forma de pagamento";"Status pagamento";"Pago em";"Poupança"',
      '"09/08/2026";"15/08/2026";"Despesa";"Internet";"Casa";"150,00";"Pix";"paid";"2026-08-09T12:00:00.000Z";"Não"',
    ].join('\n')

    const [transaction] = parseCSVImport(csv)

    expect(transaction).toMatchObject({
      date: '2026-08-09',
      dueDate: '2026-08-15',
      type: 'expense',
      amount: 150,
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      isPaid: true,
    })

    expect(transaction.paidAt).toBeInstanceOf(Date)
  })

  test('continua importando o formato CSV antigo', () => {
    const csv = [
      '"Data";"Tipo";"Descrição";"Categoria";"Valor";"Pagamento";"Poupança"',
      '"09/08/2026";"Despesa";"Mercado";"Alimentação";"75,50";"Pix";"Não"',
    ].join('\n')

    const [transaction] = parseCSVImport(csv)

    expect(transaction).toMatchObject({
      date: '2026-08-09',
      type: 'expense',
      amount: 75.5,
      paymentMethod: 'pix',
    })

    expect(transaction.paymentStatus).toBeUndefined()
  })
})
