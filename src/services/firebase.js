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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// ========== AUTH ==========
export const signInEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const registerEmail = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName })
  await sendEmailVerification(credential.user)
  return credential
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email)
export const logOut = () => signOut(auth)
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)

// ========== INDEXEDDB CORE ==========
const DB_NAME = 'CFPMoneyDB'
const DB_VERSION = 5

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      const stores = ['transactions', 'categories', 'goals', 'budgets']
      stores.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          // autoIncrement gera a chave; NÃO usar keyPath para evitar conflito
          db.createObjectStore(name, { autoIncrement: true })
        }
      })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Retorna todos os registros com o id injetado como propriedade
async function dbGetAll(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const results = []

    const cursorReq = store.openCursor()
    cursorReq.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        results.push({ ...cursor.value, id: cursor.key })
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
}

// Adiciona um registro sem id (autoIncrement cuida disso)
async function dbAdd(storeName, item) {
  const db = await openDB()
  // Remove id do objeto para não conflitar com autoIncrement
  // eslint-disable-next-line no-unused-vars
  const { id: _id, ...data } = item
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.add(data)
    req.onsuccess = () => resolve(req.result) // retorna a nova chave gerada
    req.onerror = () => reject(req.error)
  })
}

// Atualiza um registro existente pela chave numérica
async function dbUpdate(storeName, id, data) {
  const db = await openDB()
  // eslint-disable-next-line no-unused-vars
  const { id: _id, ...rest } = data
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(rest, id) // segundo argumento é a key
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Remove um registro pela chave
async function dbRemove(storeName, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ========== TRANSACTIONS ==========
export const getTransactions = () => dbGetAll('transactions')

export const addTransaction = (data) =>
  dbAdd('transactions', { ...data, createdAt: new Date().toISOString() })

export const updateTransaction = (id, data) => dbUpdate('transactions', id, data)

export const deleteTransaction = (id) => dbRemove('transactions', id)

let _txInterval = null
export const onTransactionsChange = (_uid, callback) => {
  // Dispara imediatamente e depois a cada 2s
  const run = async () => {
    try {
      const txs = await getTransactions()
      callback(txs)
    } catch (err) {
      console.error('onTransactionsChange error:', err)
    }
  }
  run()
  if (_txInterval) clearInterval(_txInterval)
  _txInterval = setInterval(run, 2000)
  return () => {
    clearInterval(_txInterval)
    _txInterval = null
  }
}

// ========== CATEGORIES ==========
export const getCategories = () => dbGetAll('categories')

export const addCategory = (data) => dbAdd('categories', data)

export const updateCategory = (id, data) => dbUpdate('categories', id, data)

export const deleteCategory = (id) => dbRemove('categories', id)

// ========== GOALS ==========
export const getGoals = () => dbGetAll('goals')

export const addGoal = (data) =>
  dbAdd('goals', { ...data, currentAmount: data.currentAmount ?? 0, createdAt: new Date().toISOString() })

export const updateGoal = (id, data) => dbUpdate('goals', id, data)

export const deleteGoal = (id) => dbRemove('goals', id)

// ========== BUDGETS ==========
export const getBudgets = () => dbGetAll('budgets')

export const setBudget = async (categoryId, amount) => {
  const budgets = await getBudgets()
  const existing = budgets.find((b) => b.categoryId === categoryId)
  if (existing) {
    await dbUpdate('budgets', existing.id, { categoryId, amount })
  } else {
    await dbAdd('budgets', { categoryId, amount })
  }
}

export const deleteBudget = async (categoryId) => {
  const budgets = await getBudgets()
  const existing = budgets.find((b) => b.categoryId === categoryId)
  if (existing) await dbRemove('budgets', existing.id)
}

// ========== SEED DEFAULT CATEGORIES ==========
const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',    icon: '🍔', color: '#f97316', type: 'expense', isDefault: true },
  { name: 'Transporte',     icon: '🚗', color: '#3b82f6', type: 'expense', isDefault: true },
  { name: 'Moradia',        icon: '🏠', color: '#f59e0b', type: 'expense', isDefault: true },
  { name: 'Saúde',          icon: '❤️', color: '#10b981', type: 'expense', isDefault: true },
  { name: 'Educação',       icon: '📚', color: '#06b6d4', type: 'expense', isDefault: true },
  { name: 'Lazer',          icon: '🎮', color: '#8b5cf6', type: 'expense', isDefault: true },
  { name: 'Roupas',         icon: '👕', color: '#ec4899', type: 'expense', isDefault: true },
  { name: 'Tecnologia',     icon: '💻', color: '#6366f1', type: 'expense', isDefault: true },
  { name: 'Outros',         icon: '📦', color: '#6b7280', type: 'expense', isDefault: true },
  { name: 'Salário',        icon: '💰', color: '#22c55e', type: 'income',  isDefault: true },
  { name: 'Freelance',      icon: '🖥️', color: '#0ea5e9', type: 'income',  isDefault: true },
  { name: 'Investimentos',  icon: '📈', color: '#a855f7', type: 'income',  isDefault: true },
  { name: 'Outros (receita)', icon: '✅', color: '#14b8a6', type: 'income', isDefault: true },
]

export const seedDefaultCategories = async () => {
  try {
    const existing = await getCategories()
    if (existing.length > 0) return
    for (const cat of DEFAULT_CATEGORIES) {
      await addCategory(cat)
    }
    console.log('Categorias padrão criadas!')
  } catch (err) {
    console.error('Erro ao semear categorias:', err)
  }
}
