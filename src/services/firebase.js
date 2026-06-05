// src/services/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth'

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

// ========== AUTH FUNCTIONS ==========
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

// Generic CRUD helpers
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

// ========== TRANSACTIONS (compatível com AppContext) ==========
export const getTransactions = () => getAll('transactions')
export const addTransaction = (data) => add('transactions', { ...data, createdAt: new Date().toISOString() })
export const updateTransaction = (id, data) => update('transactions', id, data)
export const deleteTransaction = (id) => remove('transactions', id)

// Real-time simulation (polling)
let transactionInterval = null
export const onTransactionsChange = (callback) => {
  if (transactionInterval) clearInterval(transactionInterval)
  transactionInterval = setInterval(async () => {
    const txs = await getTransactions()
    callback(txs)
  }, 2000)
  return () => clearInterval(transactionInterval)
}

// ========== CATEGORIES ==========
export const getCategories = () => getAll('categories')
export const addCategory = (data) => add('categories', data)
export const updateCategory = (id, data) => update('categories', id, data)
export const deleteCategory = (id) => remove('categories', id)

// ========== GOALS ==========
export const getGoals = () => getAll('goals')
export const addGoal = (data) => add('goals', { ...data, currentAmount: 0, createdAt: new Date().toISOString() })
export const updateGoal = (id, data) => update('goals', id, data)
export const deleteGoal = (id) => remove('goals', id)

// ========== BUDGETS ==========
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

// ========== SEED DEFAULT CATEGORIES ==========
const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔', color: '#f97316', type: 'expense', isDefault: true },
  { name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense', isDefault: true },
  { name: 'Moradia', icon: '🏠', color: '#f59e0b', type: 'expense', isDefault: true },
  { name: 'Saúde', icon: '❤️', color: '#10b981', type: 'expense', isDefault: true },
  { name: 'Educação', icon: '📚', color: '#06b6d4', type: 'expense', isDefault: true },
  { name: 'Lazer', icon: '🎮', color: '#8b5cf6', type: 'expense', isDefault: true },
  { name: 'Roupas', icon: '👕', color: '#ec4899', type: 'expense', isDefault: true },
  { name: 'Tecnologia', icon: '💻', color: '#6366f1', type: 'expense', isDefault: true },
  { name: 'Outros', icon: '📦', color: '#6b7280', type: 'expense', isDefault: true },
  { name: 'Salário', icon: '💰', color: '#22c55e', type: 'income', isDefault: true },
  { name: 'Freelance', icon: '🖥️', color: '#0ea5e9', type: 'income', isDefault: true },
  { name: 'Investimentos', icon: '📈', color: '#a855f7', type: 'income', isDefault: true },
  { name: 'Outros (receita)', icon: '✅', color: '#14b8a6', type: 'income', isDefault: true },
]

export const seedDefaultCategories = async () => {
  const existing = await getCategories()
  if (existing.length > 0) return
  for (const cat of DEFAULT_CATEGORIES) {
    await addCategory(cat)
  }
  console.log('Categorias padrão criadas com sucesso!')
}
