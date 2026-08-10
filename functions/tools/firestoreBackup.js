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
  if (backup?.schemaVersion !== 1 || !Array.isArray(backup.documents)) {
    throw new Error('Backup Firestore inválido ou incompatível.')
  }

  for (const document of backup.documents) {
    if (!document?.path || !document?.data) {
      throw new Error('Documento inválido encontrado no backup.')
    }

    await db.doc(document.path).set(decodeValue(document.data, db))
  }

  return backup.documents.length
}

module.exports = {
  buildFirestoreBackup,
  decodeValue,
  encodeValue,
  restoreFirestoreBackup,
}
