import { describe, expect, test } from 'vitest'
import {
  buildSavingsHistory,
  getSavingsHistoryDestinations,
  savingsMovementDate,
} from './savingsHistory'

const movements = [
  {
    id: 'a',
    isSavings: true,
    amount: 100,
    savingsMovement: 'deposit',
    date: '2026-11-05',
    savingsDestination: 'Emergência',
    savingsInstitution: 'Banco A',
    description: 'Aporte mensal',
    attachments: [{ id: 'receipt' }],
  },
  {
    id: 'b',
    isSavings: true,
    amount: '35.5',
    savingsMovement: 'withdrawal',
    date: '2026-11-04',
    savingsDestination: 'Emergência',
    savingsInstitution: 'Banco A',
    description: 'Retirada emergencial',
  },
  {
    id: 'c',
    isSavings: true,
    amount: 50,
    date: '2026-10-15',
    description: 'Legado sem destino',
  },
  { id: 'cancelled', isSavings: true, amount: 70, paymentStatus: 'cancelled', date: '2026-11-06' },
  { id: 'transfer', isSavings: true, amount: 800, flowType: 'transfer', date: '2026-11-07' },
  { id: 'expense', type: 'expense', amount: 12, date: '2026-11-08' },
]

describe('histórico de reservas', () => {
  test('não mistura despesas e eventos cancelados; agrupa por competência da atividade', () => {
    const result = buildSavingsHistory(movements)
    expect(result.total).toBe(3)
    expect(result.groups.map((group) => group.month)).toEqual(['2026-11', '2026-10'])
    expect(result.groups[0].movements.map((movement) => movement.id)).toEqual(['a', 'b'])
    expect(result.groups[1].movements[0].id).toBe('c')
  })

  test('separa aportes, retiradas e movimentações legadas positivas', () => {
    expect(buildSavingsHistory(movements, { type: 'deposit' }).total).toBe(2)
    expect(buildSavingsHistory(movements, { type: 'withdrawal' }).groups[0].movements[0].id).toBe('b')
  })

  test('filtra por destino estruturado, busca e presença de anexos sem alterar valores', () => {
    const destinations = getSavingsHistoryDestinations(movements)
    expect(destinations).toContain('Banco A · Emergência')
    expect(destinations).toContain('Reserva não classificada')
    expect(buildSavingsHistory(movements, { destination: 'Banco A · Emergência' }).total).toBe(2)
    expect(buildSavingsHistory(movements, { search: 'emergencial' }).total).toBe(1)
    const onlyReceipts = buildSavingsHistory(movements, { attachmentsOnly: true })
    expect(onlyReceipts.total).toBe(1)
    expect(onlyReceipts.groups[0].movements[0].id).toBe('a')
    expect(movements[0].amount).toBe(100)
  })

  test('pagina sem omitir a contagem total e preserva data original da compra', () => {
    const result = buildSavingsHistory(movements, { limit: 1 })
    expect(result.total).toBe(3)
    expect(result.shown).toBe(1)
    expect(result.groups[0].movements.map((item) => item.id)).toEqual(['a'])
    expect(savingsMovementDate({
      purchaseDate: '2026-09-01',
      date: '2026-10-01',
    })).toBe('2026-09-01')
  })

  test('mantém movimentos sem data visíveis e classificados como históricos sem data', () => {
    const result = buildSavingsHistory([{ id: 'old', isSavings: true, amount: 1 }])
    expect(result.groups[0].month).toBe('')
    expect(result.groups[0].movements[0].id).toBe('old')
  })
})
