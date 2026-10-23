// Comprovantes opcionais no plano Spark. O Firestore NÃO é armazenamento de
// objetos: limite pequeno por arquivo para preservar cotas e custo previsível.
// Substituir por R2/Cloud Storage privado quando houver provedor configurado.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024
export const ATTACHMENTS_PER_TRANSACTION = 6
const CHUNK_BYTES = 192 * 1024
const EXTENSION_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  csv: 'text/csv',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
}
export const ATTACHMENT_ACCEPT = Object.keys(EXTENSION_TYPES)
  .map((ext) => `.${ext}`)
  .join(',')

export function validateReceiptFile(file, currentCount = 0) {
  if (!file?.name || !Number.isFinite(file.size) || file.size <= 0)
    throw new Error('Selecione um arquivo válido.')
  if (file.size > ATTACHMENT_MAX_BYTES)
    throw new Error('O arquivo excede 2 MB. Reduza-o antes de anexar.')
  if (currentCount >= ATTACHMENTS_PER_TRANSACTION)
    throw new Error('Limite de seis arquivos por transação.')
  const extension = String(file.name).split('.').at(-1)?.toLowerCase() || ''
  if (!EXTENSION_TYPES[extension])
    throw new Error('Formato não permitido. Use PDF, imagem, planilha ou documento.')
  return {
    name: file.name
      .slice(0, 140)
      .replace(/[\\/]/g, '_')
      .split('')
      .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
      .join(''),
    contentType: EXTENSION_TYPES[extension],
    size: file.size,
  }
}

const chunkCollection = (uid) => collection(db, 'users', uid, 'transactionAttachmentChunks')
const transactionRef = (uid, txId) => doc(db, 'users', uid, 'transactions', txId)

function asBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x4000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x4000))
  }
  return btoa(binary)
}

function fromBase64(encoded) {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// O limite por arquivo mantém a transação abaixo de 10 MiB mesmo com a
// codificação Base64. Geramos os fragmentos antes da transação para que
// eventuais tentativas automáticas reutilizem exatamente os mesmos bytes.
export async function uploadTransactionAttachment(uid, txId, file, kind = 'transaction') {
  if (!uid || !txId) throw new Error('Identificação da transação indisponível.')
  if (!['transaction', 'payment'].includes(kind)) throw new Error('Tipo de comprovante inválido.')
  const normalized = validateReceiptFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length !== normalized.size) throw new Error('O arquivo foi alterado durante o envio.')
  const chunkRefs = chunkCollection(uid)
  const attachmentId = doc(chunkRefs).id
  const chunks = []
  for (let index = 0; index < bytes.length; index += CHUNK_BYTES) {
    chunks.push(asBase64(bytes.subarray(index, index + CHUNK_BYTES)))
  }
  const metadata = {
    id: attachmentId,
    ...normalized,
    kind,
    chunkCount: chunks.length,
    uploadedAt: new Date().toISOString(),
  }
  const parent = transactionRef(uid, txId)

  // Metadados e fragmentos são gravados juntos: falhas de rede e disputas
  // pelo sexto arquivo não deixam arquivos órfãos nem itens incompletos.
  await runTransaction(db, async (operation) => {
    const snapshot = await operation.get(parent)
    if (!snapshot.exists()) throw new Error('A transação não existe.')
    const current = Array.isArray(snapshot.data().attachments) ? snapshot.data().attachments : []
    if (current.length >= ATTACHMENTS_PER_TRANSACTION) {
      throw new Error('Limite de seis arquivos por transação.')
    }
    chunks.forEach((data, index) => {
      operation.set(doc(chunkRefs, `${attachmentId}_${index}`), {
        txId,
        attachmentId,
        chunkIndex: index,
        data,
      })
    })
    operation.update(parent, { attachments: [...current, metadata] })
  })
  return metadata
}

export async function downloadTransactionAttachment(uid, txId, metadata) {
  if (
    !metadata?.id ||
    !Number.isInteger(metadata.chunkCount) ||
    metadata.chunkCount < 1 ||
    metadata.chunkCount > 12
  )
    throw new Error('Arquivo com metadados inválidos.')
  const parent = await getDoc(transactionRef(uid, txId))
  if (
    !parent.exists() ||
    !(parent.data().attachments || []).some((item) => item.id === metadata.id)
  )
    throw new Error('Comprovante não encontrado nesta transação.')
  const documents = await Promise.all(
    Array.from({ length: metadata.chunkCount }, (_, index) =>
      getDoc(doc(chunkCollection(uid), `${metadata.id}_${index}`)),
    ),
  )
  if (
    documents.some(
      (item, index) =>
        !item.exists() || item.data().txId !== txId || item.data().chunkIndex !== index,
    )
  )
    throw new Error('Não foi possível reconstruir o arquivo.')
  const parts = documents.map((item) => fromBase64(item.data().data))
  const blob = new Blob(parts, { type: 'application/octet-stream' })
  if (blob.size !== metadata.size)
    throw new Error('O arquivo não passou na verificação de tamanho.')
  return blob
}

export async function removeTransactionAttachment(uid, txId, metadata) {
  if (!uid || !txId || !metadata?.id) throw new Error('Comprovante inválido.')
  const parent = transactionRef(uid, txId)
  const fragments = chunkCollection(uid)
  await runTransaction(db, async (operation) => {
    const snapshot = await operation.get(parent)
    if (!snapshot.exists()) throw new Error('Transação não encontrada.')
    const current = Array.isArray(snapshot.data().attachments) ? snapshot.data().attachments : []
    const stored = current.find((item) => item.id === metadata.id)
    if (!stored) return
    if (
      !Number.isInteger(stored.chunkCount) ||
      stored.chunkCount < 1 ||
      stored.chunkCount > 12
    ) {
      throw new Error('Comprovante com metadados inválidos.')
    }
    for (let index = 0; index < stored.chunkCount; index++) {
      operation.delete(doc(fragments, `${stored.id}_${index}`))
    }
    operation.update(parent, {
      attachments: current.filter((item) => item.id !== stored.id),
    })
  })
}

// Busca todos os fragmentos, inclusive de anexos que tiveram upload interrompido.
// Chamar após excluir transações, para não bloquear a exclusão financeira.
export async function purgeTransactionAttachmentChunks(uid, txId) {
  const snapshot = await getDocs(query(chunkCollection(uid), where('txId', '==', txId)))
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = writeBatch(db)
    snapshot.docs.slice(offset, offset + 400).forEach((item) => batch.delete(item.ref))
    await batch.commit()
  }
}
