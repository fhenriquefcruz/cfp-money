import { getLastSeenPresentation, wasActiveWithin } from './adminActivity'

const now = new Date('2026-09-26T18:00:00-04:00')

test('apresenta atividade recente de forma humana', () => {
  expect(getLastSeenPresentation(new Date('2026-09-26T17:45:00-04:00'), now)).toMatchObject({
    label: 'Há 15 min',
    status: 'active',
  })

  expect(getLastSeenPresentation(new Date('2026-09-25T18:00:00-04:00'), now)).toMatchObject({
    label: 'Ontem',
    status: 'recent',
  })
})

test('diferencia usuário sem atividade registrada', () => {
  expect(getLastSeenPresentation(null, now)).toMatchObject({
    label: 'Ainda não registrado',
    status: 'unknown',
  })
})

test('identifica atividade dentro de uma janela administrativa', () => {
  expect(wasActiveWithin(new Date('2026-09-24T12:00:00-04:00'), 7, now)).toBe(true)
  expect(wasActiveWithin(new Date('2026-09-01T12:00:00-04:00'), 7, now)).toBe(false)
})
