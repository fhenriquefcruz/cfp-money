// src/services/firebase.js
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'

// ── Valida configuração antes de inicializar ──
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
]
const missing = requiredEnvVars.filter(k => !import.meta.env[k] || import.meta.env[k].includes('seu-projeto'))
if (missing.length > 0) {
  console.error('[CFP] Firebase não configurado. Verifique o arquivo .env:', missing)
}

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// ── AUTH ──
export const signInEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const registerEmail = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName })
  try { await sendEmailVerification(credential.user) } catch (_) {}
  return credential
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email)
export const logOut        = () => signOut(auth)
export const onAuthChange  = (callback) => onAuthStateChanged(auth, callback)

// ══════════════════════════════════════════════════════════════
// INDEXEDDB — DADOS ISOLADOS POR USUÁRIO
// • Banco do usuário: CFPMoneyDB_<uid>  → transactions, goals, budgets
// • Banco compartilhado: CFPMoneyCats   → categories (padrão + customizadas)
// ══════════════════════════════════════════════════════════════

function openUserDB(uid) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(`CFPMoneyDB_${uid}`, 3)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      ;['transactions', 'goals', 'budgets'].forEach(name => {
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { autoIncrement: true })
      })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function openCatsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('CFPMoneyCats', 2)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('categories'))
        db.createObjectStore('categories', { autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ── CRUD genérico ──
function dbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readonly')
    const results = []
    const cursor  = tx.objectStore(storeName).openCursor()
    cursor.onsuccess = (e) => {
      const c = e.target.result
      if (c) { results.push({ ...c.value, id: c.key }); c.continue() }
      else resolve(results)
    }
    cursor.onerror = () => reject(cursor.error)
  })
}

function dbAdd(db, storeName, item) {
  // eslint-disable-next-line no-unused-vars
  const { id: _id, ...data } = item
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).add(data)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function dbUpdate(db, storeName, id, data) {
  // eslint-disable-next-line no-unused-vars
  const { id: _id, ...rest } = data
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(rest, id)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function dbRemove(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

// ── TRANSACTIONS ──
export const getTransactions = async (uid) =>
  dbGetAll(await openUserDB(uid), 'transactions')

export const addTransaction = async (uid, data) =>
  dbAdd(await openUserDB(uid), 'transactions', { ...data, createdAt: new Date().toISOString() })

export const updateTransaction = async (uid, id, data) =>
  dbUpdate(await openUserDB(uid), 'transactions', id, data)

export const deleteTransaction = async (uid, id) =>
  dbRemove(await openUserDB(uid), 'transactions', id)

let _txInterval = null
export const onTransactionsChange = (uid, callback) => {
  const run = async () => {
    try { callback(await getTransactions(uid)) }
    catch (err) { console.error('[CFP] onTransactionsChange:', err) }
  }
  run()
  if (_txInterval) clearInterval(_txInterval)
  _txInterval = setInterval(run, 2000)
  return () => { clearInterval(_txInterval); _txInterval = null }
}

// ── CATEGORIES (compartilhadas — padrão para todos + customizadas por uid) ──
export const getCategories = async (uid) => {
  const db  = await openCatsDB()
  const all = await dbGetAll(db, 'categories')
  return all.filter(c => c.isDefault || c.ownerUid === uid)
}

export const addCategory = async (uid, data) =>
  dbAdd(await openCatsDB(), 'categories', { ...data, ownerUid: data.isDefault ? null : uid })

export const updateCategory = async (uid, id, data) =>
  dbUpdate(await openCatsDB(), 'categories', id, { ...data, ownerUid: data.isDefault ? null : uid })

export const deleteCategory = async (_uid, id) =>
  dbRemove(await openCatsDB(), 'categories', id)

// ── GOALS ──
export const getGoals = async (uid) =>
  dbGetAll(await openUserDB(uid), 'goals')

export const addGoal = async (uid, data) =>
  dbAdd(await openUserDB(uid), 'goals', {
    ...data, currentAmount: data.currentAmount ?? 0, createdAt: new Date().toISOString(),
  })

export const updateGoal = async (uid, id, data) =>
  dbUpdate(await openUserDB(uid), 'goals', id, data)

export const deleteGoal = async (uid, id) =>
  dbRemove(await openUserDB(uid), 'goals', id)

// ── BUDGETS ──
export const getBudgets = async (uid) =>
  dbGetAll(await openUserDB(uid), 'budgets')

export const setBudget = async (uid, categoryId, amount) => {
  const db       = await openUserDB(uid)
  const budgets  = await dbGetAll(db, 'budgets')
  const existing = budgets.find(b => b.categoryId === categoryId)
  if (existing) await dbUpdate(db, 'budgets', existing.id, { categoryId, amount })
  else          await dbAdd(db, 'budgets', { categoryId, amount })
}

export const deleteBudget = async (uid, categoryId) => {
  const db       = await openUserDB(uid)
  const budgets  = await dbGetAll(db, 'budgets')
  const existing = budgets.find(b => b.categoryId === categoryId)
  if (existing) await dbRemove(db, 'budgets', existing.id)
}

// ── SEED categorias padrão (roda uma vez globalmente) ──
const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',      icon: '🍔', color: '#f97316', type: 'expense', isDefault: true },
  { name: 'Transporte',       icon: '🚗', color: '#3b82f6', type: 'expense', isDefault: true },
  { name: 'Moradia',          icon: '🏠', color: '#f59e0b', type: 'expense', isDefault: true },
  { name: 'Saúde',            icon: '❤️', color: '#10b981', type: 'expense', isDefault: true },
  { name: 'Educação',         icon: '📚', color: '#06b6d4', type: 'expense', isDefault: true },
  { name: 'Lazer',            icon: '🎮', color: '#8b5cf6', type: 'expense', isDefault: true },
  { name: 'Roupas',           icon: '👕', color: '#ec4899', type: 'expense', isDefault: true },
  { name: 'Tecnologia',       icon: '💻', color: '#6366f1', type: 'expense', isDefault: true },
  { name: 'Outros',           icon: '📦', color: '#6b7280', type: 'expense', isDefault: true },
  { name: 'Salário',          icon: '💰', color: '#22c55e', type: 'income',  isDefault: true },
  { name: 'Freelance',        icon: '🖥️', color: '#0ea5e9', type: 'income',  isDefault: true },
  { name: 'Investimentos',    icon: '📈', color: '#a855f7', type: 'income',  isDefault: true },
  { name: 'Outros (receita)', icon: '✅', color: '#14b8a6', type: 'income',  isDefault: true },
]

let _seeded = false
export const seedDefaultCategories = async () => {
  if (_seeded) return
  try {
    const db       = await openCatsDB()
    const existing = await dbGetAll(db, 'categories')
    if (existing.some(c => c.isDefault)) { _seeded = true; return }
    for (const cat of DEFAULT_CATEGORIES) await dbAdd(db, 'categories', cat)
    _seeded = true
    console.log('[CFP] Categorias padrão criadas.')
  } catch (err) {
    console.error('[CFP] Erro ao semear categorias:', err)
  }
}
