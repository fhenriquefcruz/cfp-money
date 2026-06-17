// src/services/firebase.js
import { initializeApp } from 'firebase/app'
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut,
  onAuthStateChanged, updateProfile,
} from 'firebase/auth'
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, setDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, writeBatch,
} from 'firebase/firestore'

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
export const db   = getFirestore(app)

// ── AUTH ──
export const signInEmail  = (e, p) => signInWithEmailAndPassword(auth, e, p)

export const registerEmail = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  try { await sendEmailVerification(cred.user) } catch (_) {}
  await setDoc(doc(db, 'users', cred.user.uid), {
    email, displayName,
    plan: 'trial',
    trialStart: serverTimestamp(),
    premiumUntil: null,
    blocked: false,
    createdAt: serverTimestamp(),
  })
  return cred
}

export const resetPassword = (e) => sendPasswordResetEmail(auth, e)
export const logOut        = () => signOut(auth)
export const onAuthChange  = (cb) => onAuthStateChanged(auth, cb)

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const userCol = (uid, sub) => collection(db, 'users', uid, sub)
const userDoc = (uid, sub, id) => doc(db, 'users', uid, sub, id)

// ── TRANSACTIONS ──
export const getTransactions = async (uid) => {
  const snap = await getDocs(query(userCol(uid, 'transactions'), orderBy('date', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const onTransactionsChange = (uid, callback) => {
  const q = query(userCol(uid, 'transactions'), orderBy('date', 'desc'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export const addTransaction = async (uid, data) => {
  const ref = await addDoc(userCol(uid, 'transactions'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export const updateTransaction = async (uid, id, data) =>
  updateDoc(userDoc(uid, 'transactions', id), { ...data, updatedAt: serverTimestamp() })

export const deleteTransaction = async (uid, id) =>
  deleteDoc(userDoc(uid, 'transactions', id))

export const addTransactionBatch = async (uid, items) => {
  const batch = writeBatch(db)
  items.forEach(item => {
    batch.set(doc(userCol(uid, 'transactions')), { ...item, createdAt: serverTimestamp() })
  })
  await batch.commit()
}

// ── CATEGORIES ──
// Busca: padrão globais + customizadas do usuário
export const getCategories = async (uid) => {
  const [defSnap, cusSnap] = await Promise.all([
    getDocs(query(collection(db, 'categories'), where('isDefault', '==', true))),
    getDocs(query(collection(db, 'categories'), where('ownerUid', '==', uid))),
  ])
  return [
    ...defSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    ...cusSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  ]
}

export const addCategory = async (uid, data) =>
  addDoc(collection(db, 'categories'), {
    ...data,
    ownerUid:  data.isDefault ? null : uid,
    isDefault: data.isDefault ?? false,
  })

export const updateCategory = async (_uid, id, data) =>
  updateDoc(doc(db, 'categories', id), data)

export const deleteCategory = async (_uid, id) =>
  deleteDoc(doc(db, 'categories', id))

// ── GOALS ──
export const getGoals = async (uid) => {
  const snap = await getDocs(userCol(uid, 'goals'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addGoal = async (uid, data) =>
  addDoc(userCol(uid, 'goals'), {
    ...data,
    currentAmount: data.currentAmount ?? 0,
    createdAt: serverTimestamp(),
  })

export const updateGoal = async (uid, id, data) =>
  updateDoc(userDoc(uid, 'goals', id), data)

export const deleteGoal = async (uid, id) =>
  deleteDoc(userDoc(uid, 'goals', id))

// ── BUDGETS ──
export const getBudgets = async (uid) => {
  const snap = await getDocs(userCol(uid, 'budgets'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const setBudget = async (uid, categoryId, amount) => {
  const snap = await getDocs(query(userCol(uid, 'budgets'), where('categoryId', '==', categoryId)))
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { categoryId, amount })
  } else {
    await addDoc(userCol(uid, 'budgets'), { categoryId, amount })
  }
}

export const deleteBudget = async (uid, categoryId) => {
  const snap = await getDocs(query(userCol(uid, 'budgets'), where('categoryId', '==', categoryId)))
  if (!snap.empty) await deleteDoc(snap.docs[0].ref)
}

// ── ADMIN ──
export const onAllUsersChange = (callback) =>
  onSnapshot(collection(db, 'users'), snap =>
    callback(snap.docs.map(d => ({ uid: d.id, ...d.data() })))
  )

export const activatePremiumForUser = async (uid, months = 1) => {
  const until = new Date()
  until.setDate(until.getDate() + months * 30)
  await updateDoc(doc(db, 'users', uid), {
    plan: 'premium',
    premiumUntil: until.toISOString(),
    blocked: false,
  })
}

export const removePremiumForUser = async (uid) =>
  updateDoc(doc(db, 'users', uid), { plan: 'free', premiumUntil: null })

export const blockUser = async (uid, blocked) =>
  updateDoc(doc(db, 'users', uid), { blocked })

// ══════════════════════════════════════════════════════════════
// SEED CATEGORIAS PADRÃO
// Chamado uma única vez no primeiro login de qualquer usuário.
// Usa isDefault:true e ownerUid:null — compatível com as regras.
// ══════════════════════════════════════════════════════════════
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

let _seeded = false
export const seedDefaultCategories = async () => {
  if (_seeded) return
  try {
    const snap = await getDocs(
      query(collection(db, 'categories'), where('isDefault', '==', true))
    )
    if (!snap.empty) { _seeded = true; return }

    // Cria em lote — uma operação atômica
    const batch = writeBatch(db)
    DEFAULT_CATEGORIES.forEach(cat => {
      batch.set(doc(collection(db, 'categories')), cat)
    })
    await batch.commit()
    _seeded = true
    console.log('[CFP] ✅ Categorias padrão criadas no Firestore.')
  } catch (err) {
    console.error('[CFP] Erro ao semear categorias:', err.code, err.message)
  }
}
