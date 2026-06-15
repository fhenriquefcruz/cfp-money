// src/contexts/AppContext.jsx — Firestore + addTransactionBatch
import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  onTransactionsChange,
  getCategories, getGoals, getBudgets,
  addTransaction, updateTransaction, deleteTransaction,
  addTransactionBatch as fbAddBatch,
  addCategory, updateCategory, deleteCategory,
  addGoal, updateGoal, deleteGoal,
  setBudget, deleteBudget,
  // seedDefaultCategories,  // <-- NÃO use mais aqui
} from '../services/firebase'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

const initialState = {
  transactions: [],
  categories:   [],
  goals:        [],
  budgets:      [],
  loading:      { transactions: true, categories: true, goals: true, budgets: true },
  notifications: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload, loading: { ...state.loading, transactions: false } }
    case 'SET_CATEGORIES':   return { ...state, categories:   action.payload, loading: { ...state.loading, categories:   false } }
    case 'SET_GOALS':        return { ...state, goals:        action.payload, loading: { ...state.loading, goals:        false } }
    case 'SET_BUDGETS':      return { ...state, budgets:      action.payload, loading: { ...state.loading, budgets:      false } }
    case 'ADD_NOTIFICATION':    return { ...state, notifications: [...state.notifications, action.payload] }
    case 'REMOVE_NOTIFICATION': return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) }
    case 'RESET': return { ...initialState }
    default: return state
  }
}

export const AppProvider = ({ children }) => {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Notificações ──
  const showNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, kind: type } })
    setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 4000)
  }, [])

  const dismissNotification = useCallback((id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  // ── Dados por usuário ──
  useEffect(() => {
    if (!user?.uid) { dispatch({ type: 'RESET' }); return }
    const uid = user.uid

    // ⚠️ REMOVIDO: seedDefaultCategories() NÃO é mais chamado aqui

    // Listener em tempo real (Firestore onSnapshot)
    const unsubTx = onTransactionsChange(uid, (txs) => {
      dispatch({ type: 'SET_TRANSACTIONS', payload: txs })
    })

    const loadStatic = async () => {
      try {
        const [cats, goals, budgets] = await Promise.all([
          getCategories(uid),
          getGoals(uid),
          getBudgets(uid),
        ])
        dispatch({ type: 'SET_CATEGORIES', payload: cats })
        dispatch({ type: 'SET_GOALS',      payload: goals })
        dispatch({ type: 'SET_BUDGETS',    payload: budgets })
      } catch (err) {
        console.error('[CFP] Erro ao carregar dados:', err)
        // Não mostrar erro de permissão para o usuário, apenas log
        if (err.code === 'permission-denied') {
          console.warn('Permissão negada ao carregar dados. Verifique as regras do Firestore.')
        }
      }
    }

    loadStatic()
    return () => { if (typeof unsubTx === 'function') unsubTx() }
  }, [user?.uid])

  // ── Alerta de orçamento ──
  const checkBudgetAlert = useCallback((newTx) => {
    if (newTx.type !== 'expense') return
    const { budgets, transactions } = stateRef.current
    const budget = budgets.find(b => b.categoryId === newTx.categoryId)
    if (!budget) return
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const spent = transactions
      .filter(t => t.type === 'expense' && t.categoryId === newTx.categoryId && new Date(t.date) >= monthStart)
      .reduce((s, t) => s + t.amount, 0) + newTx.amount
    const pct = (spent / budget.amount) * 100
    if      (pct > 100) showNotification(`🚨 Orçamento de ${newTx.categoryName} EXCEDIDO! (${pct.toFixed(0)}%)`, 'error')
    else if (pct >= 90) showNotification(`⚠️ ${pct.toFixed(0)}% do orçamento de ${newTx.categoryName} atingido!`, 'warning')
    else if (pct >= 70) showNotification(`📊 ${pct.toFixed(0)}% do orçamento de ${newTx.categoryName} utilizado.`, 'info')
  }, [showNotification])

  // ── Transactions ──
  const createTransaction = useCallback(async (data) => {
    if (!user?.uid) return
    try {
      await addTransaction(user.uid, data)
      showNotification('Transação adicionada!')
      checkBudgetAlert(data)
    } catch (e) { showNotification('Erro ao adicionar.', 'error'); throw e }
  }, [user?.uid, showNotification, checkBudgetAlert])

  const addTransactionBatch = useCallback(async (items) => {
    if (!user?.uid) return
    try {
      await fbAddBatch(user.uid, items)
      const label = items[0]?.isInstallment
        ? `${items.length} parcelas criadas!`
        : `${items.length} entradas recorrentes criadas!`
      showNotification(label)
    } catch (e) { showNotification('Erro ao criar transações.', 'error'); throw e }
  }, [user?.uid, showNotification])

  const editTransaction = useCallback(async (id, data) => {
    if (!user?.uid) return
    try {
      await updateTransaction(user.uid, id, data)
      showNotification('Transação atualizada!')
    } catch (e) { showNotification('Erro ao atualizar.', 'error'); throw e }
  }, [user?.uid, showNotification])

  const removeTransaction = useCallback(async (id) => {
    if (!user?.uid) return
    try {
      await deleteTransaction(user.uid, id)
      showNotification('Transação removida.', 'info')
    } catch (e) { showNotification('Erro ao remover.', 'error'); throw e }
  }, [user?.uid, showNotification])

  // ── Categories ──
  const refreshCats = useCallback(async () => {
    if (!user?.uid) return
    dispatch({ type: 'SET_CATEGORIES', payload: await getCategories(user.uid) })
  }, [user?.uid])

  const createCategory = useCallback(async (data) => {
    if (!user?.uid) return
    try { await addCategory(user.uid, data); await refreshCats(); showNotification('Categoria criada!') }
    catch (e) { showNotification('Erro ao criar categoria.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshCats])

  const editCategory = useCallback(async (id, data) => {
    if (!user?.uid) return
    try { await updateCategory(user.uid, id, data); await refreshCats(); showNotification('Categoria atualizada!') }
    catch (e) { showNotification('Erro ao atualizar categoria.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshCats])

  const removeCategory = useCallback(async (id) => {
    if (!user?.uid) return
    try { await deleteCategory(user.uid, id); await refreshCats(); showNotification('Categoria removida.', 'info') }
    catch (e) { showNotification('Erro ao remover categoria.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshCats])

  // ── Goals ──
  const refreshGoals = useCallback(async () => {
    if (!user?.uid) return
    dispatch({ type: 'SET_GOALS', payload: await getGoals(user.uid) })
  }, [user?.uid])

  const createGoal = useCallback(async (data) => {
    if (!user?.uid) return
    try { await addGoal(user.uid, data); await refreshGoals(); showNotification('Meta criada!') }
    catch (e) { showNotification('Erro ao criar meta.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshGoals])

  const editGoal = useCallback(async (id, data) => {
    if (!user?.uid) return
    try { await updateGoal(user.uid, id, data); await refreshGoals(); showNotification('Meta atualizada!') }
    catch (e) { showNotification('Erro ao atualizar meta.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshGoals])

  const removeGoal = useCallback(async (id) => {
    if (!user?.uid) return
    try { await deleteGoal(user.uid, id); await refreshGoals(); showNotification('Meta removida.', 'info') }
    catch (e) { showNotification('Erro ao remover meta.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshGoals])

  // ── Budgets ──
  const refreshBudgets = useCallback(async () => {
    if (!user?.uid) return
    dispatch({ type: 'SET_BUDGETS', payload: await getBudgets(user.uid) })
  }, [user?.uid])

  const saveBudget = useCallback(async (categoryId, amount) => {
    if (!user?.uid) return
    try { await setBudget(user.uid, categoryId, amount); await refreshBudgets(); showNotification('Orçamento salvo!') }
    catch (e) { showNotification('Erro ao salvar orçamento.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshBudgets])

  const removeBudget = useCallback(async (categoryId) => {
    if (!user?.uid) return
    try { await deleteBudget(user.uid, categoryId); await refreshBudgets(); showNotification('Orçamento removido.', 'info') }
    catch (e) { showNotification('Erro ao remover orçamento.', 'error'); throw e }
  }, [user?.uid, showNotification, refreshBudgets])

  // ── Cálculos derivados (mantidos iguais) ──
  const getMonthTransactions = useCallback((year, month) => {
    return stateRef.current.transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [])

  const getSummary = useCallback((year, month) => {
    const txs      = getMonthTransactions(year, month)
    const income   = txs.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses, count: txs.length }
  }, [getMonthTransactions])

  const getCategoryTotals = useCallback((year, month) => {
    const txs    = getMonthTransactions(year, month).filter(t => t.type === 'expense')
    const totals = {}
    txs.forEach(t => {
      if (!totals[t.categoryId]) totals[t.categoryId] = {
        categoryId: t.categoryId, categoryName: t.categoryName,
        categoryColor: t.categoryColor, categoryIcon: t.categoryIcon,
        total: 0, count: 0,
      }
      totals[t.categoryId].total += t.amount
      totals[t.categoryId].count++
    })
    return Object.values(totals).sort((a, b) => b.total - a.total)
  }, [getMonthTransactions])

  const getSpendingForecast = useCallback(() => {
    const now = new Date()
    const months = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const { expenses } = getSummary(d.getFullYear(), d.getMonth())
      if (expenses > 0) months.push(expenses)
    }
    return months.length ? months.reduce((s, v) => s + v, 0) / months.length : 0
  }, [getSummary])

  const getTotalBalance = useCallback(() => {
    return stateRef.current.transactions.reduce(
      (s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0
    )
  }, [])

  const filterTransactions = useCallback(({ year, month, categoryId, paymentMethod, type } = {}) => {
    return stateRef.current.transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00')
      if (year      && d.getFullYear()  !== year)         return false
      if (month     !== undefined && d.getMonth() !== month) return false
      if (categoryId    && t.categoryId    !== categoryId)    return false
      if (paymentMethod && t.paymentMethod !== paymentMethod) return false
      if (type      && t.type          !== type)          return false
      return true
    })
  }, [])

  return (
    <AppContext.Provider value={{
      ...state,
      createTransaction, editTransaction, removeTransaction, addTransactionBatch,
      createCategory, editCategory, removeCategory,
      createGoal, editGoal, removeGoal,
      saveBudget, removeBudget,
      showNotification, dismissNotification,
      getMonthTransactions, getSummary, getCategoryTotals,
      getSpendingForecast, getTotalBalance, filterTransactions,
    }}>
      {children}
    </AppContext.Provider>
  )
}
