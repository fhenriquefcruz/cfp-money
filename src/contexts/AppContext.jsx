// src/contexts/AppContext.jsx
import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react'
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
      return { ...state, notifications: [...state.notifications, action.payload] }
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.payload) }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

export const AppProvider = ({ children }) => {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  // Ref para acessar state atual em closures sem re-criar callbacks
  const stateRef = useRef(state)
  stateRef.current = state

  // ── NOTIFICATIONS ──
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

    // Ouvinte em tempo real para transações
    const unsubTx = onTransactionsChange(user.uid, (txs) => {
      dispatch({ type: 'SET_TRANSACTIONS', payload: txs })
    })

    // Carrega categorias, metas e orçamentos
    const loadStatic = async () => {
      try {
        const [cats, goals, budgets] = await Promise.all([
          getCategories(),
          getGoals(),
          getBudgets(),
        ])
        dispatch({ type: 'SET_CATEGORIES', payload: cats })
        dispatch({ type: 'SET_GOALS', payload: goals })
        dispatch({ type: 'SET_BUDGETS', payload: budgets })
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      }
    }

    loadStatic()

    return () => {
      if (typeof unsubTx === 'function') unsubTx()
    }
  }, [user])

  // ── TRANSACTION ACTIONS ──
  const createTransaction = useCallback(async (data) => {
    try {
      await addTransaction(data)
      showNotification('Transação adicionada!')
      checkBudgetAlert(data)
    } catch (e) {
      showNotification('Erro ao adicionar transação.', 'error')
      throw e
    }
  }, [showNotification]) // eslint-disable-line

  const editTransaction = useCallback(async (id, data) => {
    try {
      await updateTransaction(id, data)
      showNotification('Transação atualizada!')
    } catch (e) {
      showNotification('Erro ao atualizar.', 'error')
      throw e
    }
  }, [showNotification])

  const removeTransaction = useCallback(async (id) => {
    try {
      await deleteTransaction(id)
      showNotification('Transação removida.', 'info')
    } catch (e) {
      showNotification('Erro ao remover.', 'error')
      throw e
    }
  }, [showNotification])

  // ── BUDGET ALERT ──
  const checkBudgetAlert = useCallback((newTx) => {
    if (newTx.type !== 'expense') return
    const { budgets, transactions } = stateRef.current
    const budget = budgets.find((b) => b.categoryId === newTx.categoryId)
    if (!budget) return

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const spent =
      transactions
        .filter(
          (t) =>
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
  }, [showNotification])

  // ── CATEGORY ACTIONS ──
  const createCategory = useCallback(async (data) => {
    try {
      await addCategory(data)
      const updated = await getCategories()
      dispatch({ type: 'SET_CATEGORIES', payload: updated })
      showNotification('Categoria criada!')
    } catch (e) {
      showNotification('Erro ao criar categoria.', 'error')
      throw e
    }
  }, [showNotification])

  const editCategory = useCallback(async (id, data) => {
    try {
      await updateCategory(id, data)
      const updated = await getCategories()
      dispatch({ type: 'SET_CATEGORIES', payload: updated })
      showNotification('Categoria atualizada!')
    } catch (e) {
      showNotification('Erro ao atualizar categoria.', 'error')
      throw e
    }
  }, [showNotification])

  const removeCategory = useCallback(async (id) => {
    try {
      await deleteCategory(id)
      const updated = await getCategories()
      dispatch({ type: 'SET_CATEGORIES', payload: updated })
      showNotification('Categoria removida.', 'info')
    } catch (e) {
      showNotification('Erro ao remover categoria.', 'error')
      throw e
    }
  }, [showNotification])

  // ── GOAL ACTIONS ──
  const createGoal = useCallback(async (data) => {
    try {
      await addGoal(data)
      const updated = await getGoals()
      dispatch({ type: 'SET_GOALS', payload: updated })
      showNotification('Meta criada!')
    } catch (e) {
      showNotification('Erro ao criar meta.', 'error')
      throw e
    }
  }, [showNotification])

  const editGoal = useCallback(async (id, data) => {
    try {
      await updateGoal(id, data)
      const updated = await getGoals()
      dispatch({ type: 'SET_GOALS', payload: updated })
      showNotification('Meta atualizada!')
    } catch (e) {
      showNotification('Erro ao atualizar meta.', 'error')
      throw e
    }
  }, [showNotification])

  const removeGoal = useCallback(async (id) => {
    try {
      await deleteGoal(id)
      const updated = await getGoals()
      dispatch({ type: 'SET_GOALS', payload: updated })
      showNotification('Meta removida.', 'info')
    } catch (e) {
      showNotification('Erro ao remover meta.', 'error')
      throw e
    }
  }, [showNotification])

  // ── BUDGET ACTIONS ──
  const saveBudget = useCallback(async (categoryId, amount) => {
    try {
      await setBudget(categoryId, amount)
      const updated = await getBudgets()
      dispatch({ type: 'SET_BUDGETS', payload: updated })
      showNotification('Orçamento salvo!')
    } catch (e) {
      showNotification('Erro ao salvar orçamento.', 'error')
      throw e
    }
  }, [showNotification])

  const removeBudget = useCallback(async (categoryId) => {
    try {
      await deleteBudget(categoryId)
      const updated = await getBudgets()
      dispatch({ type: 'SET_BUDGETS', payload: updated })
      showNotification('Orçamento removido.', 'info')
    } catch (e) {
      showNotification('Erro ao remover orçamento.', 'error')
      throw e
    }
  }, [showNotification])

  // ── DERIVED DATA ──
  const getMonthTransactions = useCallback((year, month) => {
    return stateRef.current.transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [])

  const getSummary = useCallback((year, month) => {
    const txs = getMonthTransactions(year, month)
    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses }
  }, [getMonthTransactions])

  const getCategoryTotals = useCallback((year, month) => {
    const txs = getMonthTransactions(year, month).filter((t) => t.type === 'expense')
    const totals = {}
    txs.forEach((t) => {
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
  }, [getMonthTransactions])

  const getSpendingForecast = useCallback(() => {
    const now = new Date()
    const months = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const { expenses } = getSummary(d.getFullYear(), d.getMonth())
      if (expenses > 0) months.push(expenses)
    }
    if (!months.length) return 0
    return months.reduce((s, v) => s + v, 0) / months.length
  }, [getSummary])

  return (
    <AppContext.Provider
      value={{
        ...state,
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
        showNotification,
        dismissNotification,
        getMonthTransactions,
        getSummary,
        getCategoryTotals,
        getSpendingForecast,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
