export function parseCreationTime(rawUser) {
  const value =
    rawUser?.metadata?.creationTime ??
    rawUser?.creationTime ??
    rawUser?.createdAt ??
    rawUser?.created_at ??
    null

  if (value === null || value === undefined || value === '') {
    return null
  }

  const date =
    typeof value === 'number' || /^\d+$/.test(String(value))
      ? new Date(Number(value))
      : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeAuthUser(rawUser) {
  const uid = rawUser?.localId || rawUser?.uid || ''
  if (!uid) {
    throw new Error('Registro do Authentication sem UID.')
  }

  return {
    uid,
    email: rawUser?.email || '',
    displayName: rawUser?.displayName || '',
    creationTime: parseCreationTime(rawUser),
  }
}

export function normalizeAuthExport(payload) {
  const source = Array.isArray(payload) ? payload : payload?.users
  if (!Array.isArray(source)) {
    throw new Error('Export do Firebase Authentication sem array "users".')
  }

  return source.map(normalizeAuthUser)
}

export function firestoreDocumentToUser(document) {
  const uid = document?.name?.split('/').pop() || ''
  const fields = document?.fields || {}

  return {
    uid,
    email: fields.email?.stringValue || '',
    displayName: fields.displayName?.stringValue || '',
  }
}

function duplicateEmails(users) {
  const grouped = new Map()

  for (const user of users) {
    const email = String(user.email || '')
      .trim()
      .toLowerCase()
    if (!email) continue

    const current = grouped.get(email) || []
    current.push(user.uid)
    grouped.set(email, current)
  }

  return [...grouped.entries()]
    .filter(([, uids]) => uids.length > 1)
    .map(([email, uids]) => ({ email, uids }))
}

export function buildParityReport(authUsers, firestoreUsers) {
  const authByUid = new Map(authUsers.map((user) => [user.uid, user]))
  const firestoreByUid = new Map(firestoreUsers.map((user) => [user.uid, user]))

  const authOnly = authUsers.filter((user) => !firestoreByUid.has(user.uid))
  const firestoreOnly = firestoreUsers.filter((user) => !authByUid.has(user.uid))
  const presentInBoth = authUsers.filter((user) => firestoreByUid.has(user.uid))

  return {
    authTotal: authUsers.length,
    firestoreTotal: firestoreUsers.length,
    presentInBoth,
    authOnly,
    firestoreOnly,
    authDuplicateEmails: duplicateEmails(authUsers),
    firestoreDuplicateEmails: duplicateEmails(firestoreUsers),
  }
}

export function buildFirestoreUserDocument(user) {
  if (!user?.uid) {
    throw new Error('UID é obrigatório para criar o perfil.')
  }

  if (!user.creationTime) {
    throw new Error(
      `Conta ${user.uid} sem data original de criação; backfill interrompido para evitar trial incorreto.`,
    )
  }

  return {
    fields: {
      email: { stringValue: user.email || '' },
      displayName: { stringValue: user.displayName || '' },
      plan: { stringValue: 'trial' },
      trialStart: { timestampValue: user.creationTime },
      premiumUntil: { nullValue: null },
      blocked: { booleanValue: false },
      createdAt: { timestampValue: user.creationTime },
    },
  }
}


function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function validateOrphanDeletion({
  uid,
  confirmEmail,
  authUsers = [],
  firestoreOnly = [],
  audit,
}) {
  if (!uid) {
    throw new Error('Informe o UID órfão que será removido.')
  }

  const orphan = firestoreOnly.find((user) => user.uid === uid)
  if (!orphan) {
    throw new Error(`O UID ${uid} não está classificado como Firestore sem Auth.`)
  }

  if (!audit || audit.uid !== uid) {
    throw new Error('Auditoria do UID órfão ausente ou inconsistente.')
  }

  if (audit.relatedDocumentCount !== 0) {
    throw new Error(
      `Exclusão bloqueada: o UID ${uid} ainda possui ${audit.relatedDocumentCount} documento(s) relacionado(s).`,
    )
  }

  const profileEmail = normalizeEmail(audit.profile?.email || orphan.email)
  const confirmedEmail = normalizeEmail(confirmEmail)

  if (!profileEmail || confirmedEmail !== profileEmail) {
    throw new Error('E-mail de confirmação não corresponde ao perfil órfão.')
  }

  const replacementAuthUser = authUsers.find(
    (user) => user.uid !== uid && normalizeEmail(user.email) === profileEmail,
  )

  if (!replacementAuthUser) {
    throw new Error(
      'Exclusão bloqueada: não existe outra identidade ativa no Authentication com o mesmo e-mail.',
    )
  }

  return {
    uid,
    email: profileEmail,
    replacementAuthUid: replacementAuthUser.uid,
  }
}
