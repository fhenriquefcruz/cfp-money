const required = {
  VITE_LEGAL_CONTROLLER_NAME: process.env.VITE_LEGAL_CONTROLLER_NAME,
  VITE_LEGAL_REGISTRATION: process.env.VITE_LEGAL_REGISTRATION,
  VITE_LEGAL_ADDRESS: process.env.VITE_LEGAL_ADDRESS,
  VITE_LEGAL_CONTACT_EMAIL: process.env.VITE_LEGAL_CONTACT_EMAIL,
}

const missing = Object.entries(required)
  .filter(([, value]) => !String(value || '').trim())
  .map(([name]) => name)

if (missing.length > 0) {
  console.error(`Prontidão comercial: variáveis jurídicas ausentes: ${missing.join(', ')}.`)
  process.exit(1)
}

function onlyDigits(value) {
  return String(value).replace(/\D/g, '')
}

function allDigitsEqual(value) {
  return /^(\d)\1+$/.test(value)
}

function isValidCpf(value) {
  const cpf = onlyDigits(value)

  if (cpf.length !== 11 || allDigitsEqual(cpf)) return false

  const calculateDigit = (base, initialWeight) => {
    const sum = [...base].reduce(
      (total, digit, index) => total + Number(digit) * (initialWeight - index),
      0,
    )

    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const first = calculateDigit(cpf.slice(0, 9), 10)
  const second = calculateDigit(`${cpf.slice(0, 9)}${first}`, 11)

  return cpf.endsWith(`${first}${second}`)
}

function isValidCnpj(value) {
  const cnpj = onlyDigits(value)

  if (cnpj.length !== 14 || allDigitsEqual(cnpj)) return false

  const calculateDigit = (base, weights) => {
    const sum = [...base].reduce((total, digit, index) => total + Number(digit) * weights[index], 0)

    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const first = calculateDigit(cnpj.slice(0, 12), firstWeights)
  const second = calculateDigit(`${cnpj.slice(0, 12)}${first}`, secondWeights)

  return cnpj.endsWith(`${first}${second}`)
}

const registration = onlyDigits(required.VITE_LEGAL_REGISTRATION)

if (
  (registration.length === 11 && !isValidCpf(required.VITE_LEGAL_REGISTRATION)) ||
  (registration.length === 14 && !isValidCnpj(required.VITE_LEGAL_REGISTRATION)) ||
  ![11, 14].includes(registration.length)
) {
  console.error('Prontidão comercial: CPF/CNPJ inválido.')
  process.exit(1)
}

const email = required.VITE_LEGAL_CONTACT_EMAIL

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Prontidão comercial: VITE_LEGAL_CONTACT_EMAIL inválido.')
  process.exit(1)
}

console.log('Prontidão comercial: identidade jurídica configurada.')
