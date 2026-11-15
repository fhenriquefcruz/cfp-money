import { addMoneyCents, fromMoneyCents, toMoneyCents } from './moneyCents'

test('MR-006: valores legados e BRL explícito são convertidos em centavos exatos', () => {
  expect(toMoneyCents(0.1)).toBe(10)
  expect(toMoneyCents(0.2)).toBe(20)
  expect(toMoneyCents('120.25')).toBe(12025)
  expect(toMoneyCents('120,25')).toBe(12025)
  expect(toMoneyCents('R$ 1.234,56')).toBe(123456)
  expect(toMoneyCents('R$ -1.234,56')).toBe(-123456)
  expect(toMoneyCents('-0.05')).toBe(-5)
  expect(toMoneyCents(null)).toBe(0)
  expect(toMoneyCents(undefined)).toBe(0)
  expect(toMoneyCents('')).toBe(0)
  expect(toMoneyCents('  ')).toBe(0)
})

test('MR-006: soma sem concatenação e sem erros de ponto flutuante', () => {
  const cents = ['0.10', 0.2, '120.25', '0,05'].reduce(
    (sum, value) => addMoneyCents(sum, toMoneyCents(value)),
    0,
  )
  expect(cents).toBe(12060)
  expect(fromMoneyCents(cents)).toBe(120.6)
  expect(fromMoneyCents(-5)).toBe(-0.05)
})

test('MR-006: rejeita separadores ambíguos, precisão fracionária e campos corruptos', () => {
  for (const value of ['1.234', '1,234', '1,234.56', 'NaN', 'Infinity', 'R$ 1.234', '1 234,56']) {
    expect(() => toMoneyCents(value)).toThrow('Valor monetário inválido')
  }
  expect(() => toMoneyCents(1.001)).toThrow('Valor monetário inválido')
  expect(() => toMoneyCents(Number.POSITIVE_INFINITY)).toThrow('Valor monetário inválido')
  expect(() => toMoneyCents(true)).toThrow('tipo de dado não suportado')
  expect(() => toMoneyCents('90071992547409.92')).toThrow('precisão segura')
  expect(() => addMoneyCents(Number.MAX_SAFE_INTEGER, 1)).toThrow('precisão segura')
  expect(() => fromMoneyCents(1.5)).toThrow('Centavos inválidos')
})
