import admin from 'firebase-admin'
import { readFileSync } from 'fs'

// Se você não tem um arquivo de chave de serviço, pode usar variáveis de ambiente
// ou usar o SDK da web com autenticação de usuário (menos recomendado para seed).
// Para simplificar, vou usar o método com service account.

// Baixe o arquivo JSON da sua conta de serviço no Firebase Console
// (Configurações do projeto -> Contas de serviço -> Gerar nova chave privada)
// Coloque-o na raiz como serviceAccountKey.json

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',      icon: '🍔', color: '#f97316', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Transporte',       icon: '🚗', color: '#3b82f6', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Moradia',          icon: '🏠', color: '#f59e0b', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Saúde',            icon: '❤️', color: '#10b981', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Educação',         icon: '📚', color: '#06b6d4', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Lazer',            icon: '🎮', color: '#8b5cf6', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Roupas',           icon: '👕', color: '#ec4899', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Tecnologia',       icon: '💻', color: '#6366f1', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Outros',           icon: '📦', color: '#6b7280', type: 'expense', isDefault: true, ownerUid: null },
  { name: 'Salário',          icon: '💰', color: '#22c55e', type: 'income',  isDefault: true, ownerUid: null },
  { name: 'Freelance',        icon: '🖥️', color: '#0ea5e9', type: 'income',  isDefault: true, ownerUid: null },
  { name: 'Investimentos',    icon: '📈', color: '#a855f7', type: 'income',  isDefault: true, ownerUid: null },
  { name: 'Outros (receita)', icon: '✅', color: '#14b8a6', type: 'income',  isDefault: true, ownerUid: null },
]

async function seed() {
  const snapshot = await db.collection('categories').where('isDefault', '==', true).get()
  if (!snapshot.empty) {
    console.log('✅ Categorias padrão já existem. Nada a fazer.')
    return
  }

  const batch = db.batch()
  DEFAULT_CATEGORIES.forEach(cat => {
    const ref = db.collection('categories').doc()
    batch.set(ref, cat)
  })
  await batch.commit()
  console.log(`🎉 ${DEFAULT_CATEGORIES.length} categorias padrão criadas com sucesso!`)
}

seed().catch(console.error)
