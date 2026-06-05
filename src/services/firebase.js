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
  updateProfile
} from 'firebase/auth'

// Firebase config (pegue do seu projeto)
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

// ========== INDEXEDDB (armazenamento local) ==========
const DB_NAME = 'CFPMoneyDB'
const DB_VERSION = 2

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('goals')) {
        db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('budgets')) {
        db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getAll(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function add(storeName, item) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.add(item)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function update(storeName, id, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put({ ...data, id })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function remove(storeName, id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ── Transações ──
export const getTransactions = () => getAll('transactions')
export const addTransaction = (data) => add('transactions', { ...data, createdAt: new Date().toISOString() })
export const updateTransaction = (id, data) => update('transactions', id, data)
export const deleteTransaction = (id) => remove('transactions', id)

// Simula real-time com polling
let listeners = []
export const onTransactionsChange = (callback) => {
  listeners.push(callback)
  let interval
  const startPolling = () => {
    interval = setInterval(async () => {
      const txs = await getTransactions()
      listeners.forEach(cb => cb(txs))
    }, 2000)
  }
  startPolling()
  return () => {
    clearInterval(interval)
    listeners = listeners.filter(l => l !== callback)
  }
}

// ── Categorias ──
export const getCategories = () => getAll('categories')
export const addCategory = (data) => add('categories', data)
export const updateCategory = (id, data) => update('categories', id, data)
export const deleteCategory = (id) => remove('categories', id)

// ── Metas (goals) ──
export const getGoals = () => getAll('goals')
export const addGoal = (data) => add('goals', { ...data, currentAmount: 0 })
export const updateGoal = (id, data) => update('goals', id, data)
export const deleteGoal = (id) => remove('goals', id)

// ── Orçamentos ──
export const getBudgets = () => getAll('budgets')
export const setBudget = async (categoryId, amount) => {
  const budgets = await getBudgets()
  const existing = budgets.find(b => b.categoryId === categoryId)
  if (existing) {
    await update('budgets', existing.id, { categoryId, amount })
  } else {
    await add('budgets', { categoryId, amount })
  }
}
export const deleteBudget = (id) => remove('budgets', id)

// ── Seed de categorias padrão ──
export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Moradia', icon: '🏠', color: '#f59e0b', type: 'expense' },
  { name: 'Saúde', icon: '❤️', color: '#10b981', type: 'expense' },
  { name: 'Educação', icon: '📚', color: '#06b6d4', type: 'expense' },
  { name: 'Lazer', icon: '🎮', color: '#8b5cf6', type: 'expense' },
  { name: 'Roupas', icon: '👕', color: '#ec4899', type: 'expense' },
  { name: 'Tecnologia', icon: '💻', color: '#6366f1', type: 'expense' },
  { name: 'Outros', icon: '📦', color: '#6b7280', type: 'expense' },
  { name: 'Salário', icon: '💰', color: '#22c55e', type: 'income' },
  { name: 'Freelance', icon: '🖥️', color: '#0ea5e9', type: 'income' },
  { name: 'Investimentos', icon: '📈', color: '#a855f7', type: 'income' },
  { name: 'Outros (receita)', icon: '✅', color: '#14b8a6', type: 'income' },
]

export const seedDefaultCategories = async (userId) => {
  const existing = await getCategories()
  if (existing.length > 0) return
  for (const cat of DEFAULT_CATEGORIES) {
    await add('categories', cat)
  }
}
