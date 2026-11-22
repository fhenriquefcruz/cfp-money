const { GeoPoint, Timestamp } = require('firebase-admin/firestore')

function encodeValue(value) {
  if (value === null || value === undefined) return value

  if (value instanceof Timestamp) {
    return {
      __meuRealType: 'timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    }
  }

  if (value instanceof GeoPoint) {
    return {
      __meuRealType: 'geoPoint',
      latitude: value.latitude,
      longitude: value.longitude,
    }
  }

  if (Buffer.isBuffer(value)) {
    return {
      __meuRealType: 'bytes',
      value: value.toString('base64'),
    }
  }

  if (value instanceof Date) {
    return {
      __meuRealType: 'date',
      value: value.toISOString(),
    }
  }

  if (value && typeof value === 'object' && typeof value.path === 'string' && value.firestore) {
    return {
      __meuRealType: 'reference',
      path: value.path,
    }
  }

  if (Array.isArray(value)) {
    return value.map(encodeValue)
  }

  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]))
  }

  return value
}

function decodeValue(value, db) {
  if (value === null || value === undefined) return value

  if (Array.isArray(value)) {
    return value.map((item) => decodeValue(item, db))
  }

  if (typeof value !== 'object') return value

  if (value.__meuRealType === 'timestamp') {
    return new Timestamp(value.seconds, value.nanoseconds)
  }

  if (value.__meuRealType === 'geoPoint') {
    return new GeoPoint(value.latitude, value.longitude)
  }

  if (value.__meuRealType === 'bytes') {
    return Buffer.from(value.value, 'base64')
  }

  if (value.__meuRealType === 'date') {
    return new Date(value.value)
  }

  if (value.__meuRealType === 'reference') {
    return db.doc(value.path)
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, decodeValue(item, db)]),
  )
}

async function readCollection(collectionRef, documents) {
  const snapshot = await collectionRef.get()

  for (const document of snapshot.docs) {
    documents.push({
      path: document.ref.path,
      data: encodeValue(document.data()),
    })

    const subcollections = await document.ref.listCollections()

    for (const subcollection of subcollections) {
      await readCollection(subcollection, documents)
    }
  }
}

async function buildFirestoreBackup(db, projectId) {
  const documents = []
  const collections = await db.listCollections()

  for (const collection of collections) {
    await readCollection(collection, documents)
  }

  documents.sort((a, b) => a.path.localeCompare(b.path))

  return {
    schemaVersion: 1,
    projectId,
    generatedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
  }
}

async function restoreFirestoreBackup(db, backup) {
  if (
    backup?.schemaVersion !== 1 ||
    !Array.isArray(backup.documents) ||
    !Number.isSafeInteger(backup.documentCount) ||
    backup.documentCount !== backup.documents.length
  ) {
    throw new Error('Backup Firestore inválido ou incompatível.')
  }

  // Validar o inventário completo ANTES da primeira gravação. Sem isso, um
  // arquivo truncado ou com caminho duplicado poderia gerar restore parcial.
  const paths = new Set()
  const writes = backup.documents.map((document) => {
    const path = document?.path
    const segments = typeof path === 'string' ? path.split('/') : []
    if (
      segments.length < 2 ||
      segments.length % 2 !== 0 ||
      segments.some((part) => !part || part === '.' || part === '..') ||
      paths.has(path) ||
      !document?.data ||
      typeof document.data !== 'object' ||
      Array.isArray(document.data)
    ) {
      throw new Error('Documento inválido ou duplicado encontrado no backup.')
    }
    paths.add(path)

    // Também antecipa falhas de desserialização e de referência Firestore.
    return { reference: db.doc(path), data: decodeValue(document.data, db) }
  })

  // Não há atomicidade global entre coleções; uma falha de rede durante o
  // restore ainda exige recuperação operacional, nunca sucesso presumido.
  for (const document of writes) {
    await document.reference.set(document.data)
  }

  return writes.length
}

module.exports = {
  buildFirestoreBackup,
  decodeValue,
  encodeValue,
  restoreFirestoreBackup,
}
