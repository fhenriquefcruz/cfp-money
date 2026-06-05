// src/contexts/AppContext.jsx
import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  onTransactionsChange,
  getCategories,
  getGoals,
  getBudgets,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addCategory,
  updateCategory,
  deleteCategory,
  addGoal,
  updateGoal,
  deleteGoal,
  setBudget,
  deleteBudget,
} from '../services/firebase'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

// ── REDUCER ──
const initialState = {
  transactions: [],
  categories: [],
  goals: [],
  budgets: [],
  loading: { transactions: true, categories: true, goals: true, budgets: true },
  notifications: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, loading: { ...state.loading, transactions: false } }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload, loading: { ...state.loading, categories: false } }
    case 'SET_GOALS':
      return { ...state, goals: action.payload, loading: { ...state.loading, goals: false } }
    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload, loading: { ...state.loading, budgets: false } }
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, { id: Date.now(), ...action.payload }] }
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export const AppProvider = ({ children }) => {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── NOTIFICATIONS ──
  const notify = useCallback((message, type = 'success') => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { message, kind: type } })
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: Date.now() })
    }, 4000)
  }, [])

  // Need to track notification IDs properly
  const showNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, kind: type } })
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
    }, 4000)
  }, [])

  const dismissNotification = useCallback((id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  // ── DATA LOADING ──
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET' })
      return
    }

    // Real-time transactions listener
    const unsubTx = onTransactionsChange(user.uid, (txs) => {
      dispatch({ type: 'SET_TRANSACTIONS', payload: txs })
    })

    // Load categories, goals, budgets once
    const loadStatic = async () => {
      const [cats, goals, budgets] = await Promise.all([
        getCategories(user.uid),
        getGoals(user.uid),
        getBudgets(user.uid),
      ])
      dispatch({ type: 'SET_CATEGORIES', payload: cats })
      dispatch({ type: 'SET_GOALS', payload: goals })
      dispatch({ type: 'SET_BUDGETS', payload: budgets })
    }
    loadStatic()

    return () => unsubTx()
  }, [user])

  // ── TRANSACTION ACTIONS ──
  const createTransaction = async (data) => {
    try {
      await addTransaction(user.uid, data)
      showNotification('Transação adicionada!')
      // Check budget alerts
      checkBudgetAlert(data)
    } catch (e) {
      showNotification('Erro ao adicionar transação.', 'error')
      throw e
    }
  }

  const editTransaction = async (id, data) => {
    try {
      await updateTransaction(user.uid, id, data)
      showNotification('Transação atualizada!')
    } catch (e) {
      showNotification('Erro ao atualizar.', 'error')
      throw e
    }
  }

  const removeTransaction = async (id) => {
    try {
      await deleteTransaction(user.uid, id)
      showNotification('Transação removida.', 'info')
    } catch (e) {
      showNotification('Erro ao remover.', 'error')
      throw e
    }
  }

  // ── BUDGET ALERT ──
  const checkBudgetAlert = (newTx) => {
    if (newTx.type !== 'expense') return
    const budget = state.budgets.find(b => b.categoryId === newTx.categoryId)
    if (!budget) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const spent = state.transactions
      .filter(t =>
        t.type === 'expense' &&
        t.categoryId === newTx.categoryId &&
        new Date(t.date) >= monthStart
      )
      .reduce((sum, t) => sum + t.amount, 0) + newTx.amount

    const pct = (spent / budget.amount) * 100
    if (pct >= 90) {
      showNotification(
        `⚠️ ${pct >= 100 ? 'Orçamento excedido' : '90% do orçamento atingido'} em ${newTx.categoryName}!`,
        'warning'
      )
    }
  }

  // ── CATEGORY ACTIONS ──
  const createCategory = async (data) => {
    const doc = await addCategory(user.uid, data)
    const updated = await getCategories(user.uid)
    dispatch({ type: 'SET_CATEGORIES', payload: updated })
    showNotification('Categoria criada!')
    return doc
  }

  const editCategory = async (id, data) => {
    await updateCategory(user.uid, id, data)
    const updated = await getCategories(user.uid)
    dispatch({ type: 'SET_CATEGORIES', payload: updated })
    showNotification('Categoria atualizada!')
  }

  const removeCategory = async (id) => {
    await deleteCategory(user.uid, id)
    const updated = await getCategories(user.uid)
    dispatch({ type: 'SET_CATEGORIES', payload: updated })
    showNotification('Categoria removida.', 'info')
  }

  // ── GOAL ACTIONS ──
  const createGoal = async (data) => {
    await addGoal(user.uid, data)
    const updated = await getGoals(user.uid)
    dispatch({ type: 'SET_GOALS', payload: updated })
    showNotification('Meta criada!')
  }

  const editGoal = async (id, data) => {
    await updateGoal(user.uid, id, data)
    const updated = await getGoals(user.uid)
    dispatch({ type: 'SET_GOALS', payload: updated })
    showNotification('Meta atualizada!')
  }

  const removeGoal = async (id) => {
    await deleteGoal(user.uid, id)
    const updated = await getGoals(user.uid)
    dispatch({ type: 'SET_GOALS', payload: updated })
  }

  // ── BUDGET ACTIONS ──
  const saveBudget = async (categoryId, amount) => {
    await setBudget(user.uid, categoryId, amount)
    const updated = await getBudgets(user.uid)
    dispatch({ type: 'SET_BUDGETS', payload: updated })
    showNotification('Orçamento salvo!')
  }

  const removeBudget = async (categoryId) => {
    await deleteBudget(user.uid, categoryId)
    const updated = await getBudgets(user.uid)
    dispatch({ type: 'SET_BUDGETS', payload: updated })
  }

  // ── DERIVED DATA ──
  const getMonthTransactions = (year, month) => {
    return state.transactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }

  const getSummary = (year, month) => {
    const txs = getMonthTransactions(year, month)
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses }
  }

  const getCategoryTotals = (year, month) => {
    const txs = getMonthTransactions(year, month).filter(t => t.type === 'expense')
    const totals = {}
    txs.forEach(t => {
      if (!totals[t.categoryId]) {
        totals[t.categoryId] = {
          categoryId: t.categoryId,
          categoryName: t.categoryName,
          categoryColor: t.categoryColor,
          categoryIcon: t.categoryIcon,
          total: 0,
          count: 0,
        }
      }
      totals[t.categoryId].total += t.amount
      totals[t.categoryId].count++
    })
    return Object.values(totals).sort((a, b) => b.total - a.total)
  }

  // Spending forecast based on last 3 months average
  const getSpendingForecast = () => {
    const now = new Date()
    const months = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const { expenses } = getSummary(d.getFullYear(), d.getMonth())
      months.push(expenses)
    }
    const avg = months.reduce((s, v) => s + v, 0) / months.filter(v => v > 0).length
    return avg || 0
  }

  return (
    <AppContext.Provider value={{
      ...state,
      // Actions
      createTransaction,
      editTransaction,
      removeTransaction,
      createCategory,
      editCategory,
      removeCategory,
      createGoal,
      editGoal,
      removeGoal,
      saveBudget,
      removeBudget,
      // Notifications
      showNotification,
      dismissNotification,
      // Derived
      getMonthTransactions,
      getSummary,
      getCategoryTotals,
      getSpendingForecast,
    }}>
      {children}
    </AppContext.Provider>
  )
}
