const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER)

// Formatos legados inequívocos: número, "1234.56", "1234,56" ou
// "R$ 1.234,56". "1.234" isolado é ambíguo e não é convertido.
const DECIMAL = /^-?\d+(?:[.,]\d{1,2})?$/
const BRL_GROUPED = /^-?\d{1,3}(?:\.\d{3})+,\d{1,2}$/

export function toMoneyCents(value) {
  if (value == null || value === '') return 0

  if (typeof value === 'number') {
    const scaled = value * 100
    const cents = Math.round(scaled)
    if (
      !Number.isFinite(value) ||
      !Number.isSafeInteger(cents) ||
      Math.abs(scaled - cents) > 0.0000001
    ) {
      throw new Error('Valor monetário inválido: informe um valor em centavos exatos.')
    }
    return cents
  }

  if (typeof value !== 'string') {
    throw new Error('Valor monetário inválido: tipo de dado não suportado.')
  }

  const text = value.trim().replace(/^R\$\s*/, '')
  if (!text) return 0
  if (!DECIMAL.test(text) && !BRL_GROUPED.test(text)) {
    throw new Error('Valor monetário inválido ou ambíguo: revise o registro histórico.')
  }

  const normalized = BRL_GROUPED.test(text)
    ? text.replaceAll('.', '').replace(',', '.')
    : text.replace(',', '.')
  const negative = normalized.startsWith('-')
  const [integer, fraction = ''] = (negative ? normalized.slice(1) : normalized).split('.')
  const cents = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0') || '0')

  if (cents > MAX_SAFE_CENTS) {
    throw new Error('Valor monetário excede a precisão segura de centavos.')
  }

  return Number(negative ? -cents : cents)
}

export function addMoneyCents(left, right) {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    throw new Error('Soma monetária com centavos inválidos.')
  }
  const result = left + right
  if (!Number.isSafeInteger(result)) {
    throw new Error('Soma monetária excede a precisão segura.')
  }
  return result
}

export function fromMoneyCents(cents) {
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Centavos inválidos para apresentação.')
  }
  return cents / 100
}
