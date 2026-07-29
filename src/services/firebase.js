// src/services/firebase.js
import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithCredential,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { resolveFirebaseConfig } from '../config/firebaseConfig'

const firebaseConfig = resolveFirebaseConfig(import.meta.env)

export const app = initializeApp(firebaseConfig)

const appCheckSiteKey = String(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim()

export const appCheck =
  appCheckSiteKey && typeof window !== 'undefined'
    ? initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      })
    : null

export const auth = getAuth(app)
export const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

let pendingGoogleCredential = null

const ensureUserDocument = async (user) => {
  const ref = doc(db, 'users', user.uid)
  const snapshot = await getDoc(ref)

  if (snapshot.exists()) return

  await setDoc(ref, {
    email: user.email || '',
    displayName: user.displayName || '',
    plan: 'trial',
    trialStart: serverTimestamp(),
    premiumUntil: null,
    blocked: false,
    createdAt: serverTimestamp(),
  })
}

// ── AUTH ──
export const signInEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password)

  if (pendingGoogleCredential) {
    const credential = pendingGoogleCredential
    pendingGoogleCredential = null
    await linkWithCredential(result.user, credential)
  }

  return result
}

export const signInGoogle = async () => {
  pendingGoogleCredential = null

  try {
    const result = await signInWithPopup(auth, googleProvider)
    await ensureUserDocument(result.user)
    return result
  } catch (error) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      pendingGoogleCredential = GoogleAuthProvider.credentialFromError(error)
    }
    throw error
  }
}

export const registerEmail = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  try {
    await sendEmailVerification(cred.user)
  } catch (_) {}
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    displayName,
    plan: 'trial',
    trialStart: serverTimestamp(),
    premiumUntil: null,
    blocked: false,
    createdAt: serverTimestamp(),
  })
  return cred
}

export const resetPassword = (e) => sendPasswordResetEmail(auth, e)
export const logOut = () => signOut(auth)
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb)

export const getMoneySettings = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data().moneySettings || {} : {}
}

export const onMoneySettingsChange = (uid, callback, onError) =>
  onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data().moneySettings || {} : {}),
    onError,
  )

export const updateMoneySettings = async (uid, settings) =>
  setDoc(
    doc(db, 'users', uid),
    { moneySettings: settings, moneySettingsUpdatedAt: serverTimestamp() },
    { merge: true },
  )

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const userCol = (uid, sub) => collection(db, 'users', uid, sub)
const userDoc = (uid, sub, id) => doc(db, 'users', uid, sub, id)

// ── TRANSACTIONS ──
export const getTransactions = async (uid) => {
  const snap = await getDocs(query(userCol(uid, 'transactions'), orderBy('date', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const onTransactionsChange = (uid, callback) => {
  const q = query(userCol(uid, 'transactions'), orderBy('date', 'desc'))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export const addTransaction = async (uid, data) => {
  const ref = await addDoc(userCol(uid, 'transactions'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export const updateTransaction = async (uid, id, data) =>
  updateDoc(userDoc(uid, 'transactions', id), { ...data, updatedAt: serverTimestamp() })

export const deleteTransaction = async (uid, id) => deleteDoc(userDoc(uid, 'transactions', id))

// ── INVOICE EVENTS ──
export const onInvoiceEventsChange = (uid, callback) => {
  const q = query(userCol(uid, 'invoiceEvents'), orderBy('eventDate', 'desc'))

  return onSnapshot(q, (snapshot) =>
    callback(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })),
    ),
  )
}

export const addInvoiceEvent = async (uid, data) => {
  const ref = await addDoc(userCol(uid, 'invoiceEvents'), {
    ...data,
    createdAt: serverTimestamp(),
  })

  return ref.id
}

// ── CREDIT CARDS ──
export const getCreditCards = async (uid) => {
  const snap = await getDocs(userCol(uid, 'creditCards'))
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export const addCreditCard = async (uid, data) => {
  const ref = await addDoc(userCol(uid, 'creditCards'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const updateCreditCard = async (uid, id, data) =>
  updateDoc(userDoc(uid, 'creditCards', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })

export const deleteCreditCard = async (uid, id) => deleteDoc(userDoc(uid, 'creditCards', id))

export const addTransactionBatch = async (uid, items) => {
  const batch = writeBatch(db)
  const refs = items.map(() => doc(userCol(uid, 'transactions')))

  refs.forEach((ref, index) => {
    batch.set(ref, {
      ...items[index],
      createdAt: serverTimestamp(),
    })
  })

  await batch.commit()
  return refs.map((ref) => ref.id)
}

export const deleteTransactionBatch = async (uid, ids) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (!uniqueIds.length) return

  const batch = writeBatch(db)
  uniqueIds.forEach((id) => {
    batch.delete(userDoc(uid, 'transactions', id))
  })
  await batch.commit()
}

export const commitTransactionSeriesOperation = async (
  uid,
  { updates = [], deletes = [] } = {},
) => {
  const deleteIds = new Set(deletes.filter(Boolean))
  const updateMap = new Map()

  updates.forEach((item) => {
    if (!item?.id || deleteIds.has(item.id)) return
    updateMap.set(item.id, {
      ...(updateMap.get(item.id) || {}),
      ...(item.data || {}),
    })
  })

  const writeCount = updateMap.size + deleteIds.size
  if (!writeCount) return
  if (writeCount > 450) {
    throw new Error('A série excede o limite seguro de alterações.')
  }

  const batch = writeBatch(db)

  updateMap.forEach((data, id) => {
    batch.update(userDoc(uid, 'transactions', id), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  })

  deleteIds.forEach((id) => {
    batch.delete(userDoc(uid, 'transactions', id))
  })

  await batch.commit()
}

// ── CATEGORIES ──
export const getCategories = async (uid) => {
  const [defSnap, cusSnap] = await Promise.all([
    getDocs(query(collection(db, 'categories'), where('isDefault', '==', true))),
    getDocs(query(collection(db, 'categories'), where('ownerUid', '==', uid))),
  ])
  return [
    ...defSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    ...cusSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  ]
}

export const addCategory = async (uid, data) =>
  addDoc(collection(db, 'categories'), {
    ...data,
    ownerUid: data.isDefault ? null : uid,
    isDefault: data.isDefault ?? false,
  })

export const updateCategory = async (_uid, id, data) => updateDoc(doc(db, 'categories', id), data)

export const deleteCategory = async (_uid, id) => deleteDoc(doc(db, 'categories', id))

// ── GOALS ──
export const getGoals = async (uid) => {
  const snap = await getDocs(userCol(uid, 'goals'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const addGoal = async (uid, data) =>
  addDoc(userCol(uid, 'goals'), {
    ...data,
    currentAmount: data.currentAmount ?? 0,
    createdAt: serverTimestamp(),
  })

export const updateGoal = async (uid, id, data) => updateDoc(userDoc(uid, 'goals', id), data)

export const deleteGoal = async (uid, id) => deleteDoc(userDoc(uid, 'goals', id))

// ── BUDGETS ──
export const getBudgets = async (uid) => {
  const snap = await getDocs(userCol(uid, 'budgets'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
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
// Listener em tempo real para todos os usuários (apenas admin)
export const onAllUsersChange = (callback, onError) => {
  const q = query(collection(db, 'users'), orderBy('email'))
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }))
      callback(users)
    },
    (error) => {
      console.error('[Meu Real] Erro no listener de usuários:', error)
      if (onError) onError(error)
    },
  )
  return unsubscribe
}

// ══════════════════════════════════════════════════════════════
// SEED CATEGORIAS PADRÃO
// ══════════════════════════════════════════════════════════════
const DEFAULT_CATEGORIES = [
  {
    name: 'Alimentação',
    icon: '🍔',
    color: '#f97316',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Transporte',
    icon: '🚗',
    color: '#3b82f6',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Moradia',
    icon: '🏠',
    color: '#f59e0b',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  { name: 'Saúde', icon: '❤️', color: '#10b981', type: 'expense', isDefault: true, ownerUid: null },
  {
    name: 'Educação',
    icon: '📚',
    color: '#06b6d4',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  { name: 'Lazer', icon: '🎮', color: '#8b5cf6', type: 'expense', isDefault: true, ownerUid: null },
  {
    name: 'Roupas',
    icon: '👕',
    color: '#ec4899',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Tecnologia',
    icon: '💻',
    color: '#6366f1',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Outros',
    icon: '📦',
    color: '#6b7280',
    type: 'expense',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Salário',
    icon: '💰',
    color: '#22c55e',
    type: 'income',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Freelance',
    icon: '🖥️',
    color: '#0ea5e9',
    type: 'income',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Investimentos',
    icon: '📈',
    color: '#a855f7',
    type: 'income',
    isDefault: true,
    ownerUid: null,
  },
  {
    name: 'Outros (receita)',
    icon: '✅',
    color: '#14b8a6',
    type: 'income',
    isDefault: true,
    ownerUid: null,
  },
]

let _seeded = false
export const seedDefaultCategories = async () => {
  if (_seeded) return
  try {
    const snap = await getDocs(query(collection(db, 'categories'), where('isDefault', '==', true)))
    if (!snap.empty) {
      _seeded = true
      return
    }

    const batch = writeBatch(db)
    DEFAULT_CATEGORIES.forEach((cat) => {
      batch.set(doc(collection(db, 'categories')), cat)
    })
    await batch.commit()
    _seeded = true
    console.log('[Meu Real] ✅ Categorias padrão criadas no Firestore.')
  } catch (err) {
    console.error('[Meu Real] Erro ao semear categorias:', err.code, err.message)
  }
}
