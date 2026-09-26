function asDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getLastSeenPresentation(lastSeenAt, now = new Date()) {
  const lastSeen = asDate(lastSeenAt)

  if (!lastSeen) {
    return {
      label: 'Ainda não registrado',
      detail: 'A atividade será registrada no próximo uso do sistema.',
      status: 'unknown',
    }
  }

  const diffMs = Math.max(0, now.getTime() - lastSeen.getTime())
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 2) {
    return {
      label: 'Agora',
      detail: lastSeen.toLocaleString('pt-BR'),
      status: 'active',
    }
  }

  if (minutes < 60) {
    return {
      label: `Há ${minutes} min`,
      detail: lastSeen.toLocaleString('pt-BR'),
      status: 'active',
    }
  }

  if (hours < 24) {
    return {
      label: `Há ${hours} h`,
      detail: lastSeen.toLocaleString('pt-BR'),
      status: 'recent',
    }
  }

  if (days === 1) {
    return {
      label: 'Ontem',
      detail: lastSeen.toLocaleString('pt-BR'),
      status: 'recent',
    }
  }

  if (days < 7) {
    return {
      label: `Há ${days} dias`,
      detail: lastSeen.toLocaleString('pt-BR'),
      status: 'recent',
    }
  }

  return {
    label: lastSeen.toLocaleDateString('pt-BR'),
    detail: lastSeen.toLocaleString('pt-BR'),
    status: 'inactive',
  }
}

export function wasActiveWithin(lastSeenAt, days, now = new Date()) {
  const lastSeen = asDate(lastSeenAt)
  if (!lastSeen) return false

  return now.getTime() - lastSeen.getTime() <= days * 86400000
}
