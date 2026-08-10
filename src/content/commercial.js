export const COMMERCIAL_OFFER = Object.freeze({
  trialDays: 7,
  premiumPrice: 'R$ 19,90',
  premiumPeriodDays: 30,
  paymentMethod: 'Pix',
  renewal: 'manual',
})

export const SUPPORT_POLICY = Object.freeze({
  contactEmail:
    import.meta.env.VITE_SUPPORT_EMAIL ||
    import.meta.env.VITE_LEGAL_CONTACT_EMAIL ||
    'fhenriquefcruz@gmail.com',
  responseDeadline: 'até 5 dias corridos',
  responseTarget: 'até 2 dias úteis',
  timezone: 'America/Campo_Grande',
})

export const PREMIUM_FEATURES = Object.freeze([
  'Money, seu assistente financeiro pessoal',
  'Dashboard avançado com previsões',
  'Relatórios completos + exportação PDF e CSV',
  'Alertas inteligentes de orçamento',
  'Metas, orçamentos, cartões e faturas em uma visão integrada',
])
