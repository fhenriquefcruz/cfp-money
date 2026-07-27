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
  onInvoiceEventsChange,
  addInvoiceEvent,
  addTransactionBatch as fbAddBatch,
  deleteTransactionBatch as fbDeleteBatch,
  commitTransactionSeriesOperation as fbCommitSeries,
  getCreditCards,
  addCreditCard,
  updateCreditCard,
  deleteCreditCard,
  addCategory,
  updateCategory,
  deleteCategory,
  addGoal,
  updateGoal,
  deleteGoal,
  setBudget,
  deleteBudget,
} from '../repositories/appRepository'
import {
  calculateCurrentBalance,
  summarizeTransactions,
  transactionsForMonth,
} from '../domain/finance'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

const initialState = {
  transactions: [],
  categories: [],
  goals: [],
  budgets: [],
  creditCards: [],
  invoiceEvents: [],
  loading: {
    transactions: true,
    categories: true,
    goals: true,
    budgets: true,
    creditCards: true,
    invoiceEvents: true,
  },
  notifications: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
        loading: { ...state.loading, transactions: false },
      }
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
        loading: { ...state.loading, categories: false },
      }
    case 'SET_GOALS':
      return { ...state, goals: action.payload, loading: { ...state.loading, goals: false } }
    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload, loading: { ...state.loading, budgets: false } }
    case 'SET_CREDIT_CARDS':
      return {
        ...state,
        creditCards: action.payload,
        loading: { ...state.loading, creditCards: false },
      }
    case 'SET_INVOICE_EVENTS':
      return {
        ...state,
        invoiceEvents: action.payload,
        loading: { ...state.loading, invoiceEvents: false },
      }
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
  const stateRef = useRef(state)
  stateRef.current = state

  const showNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, kind: type } })
    setTimeout(() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }), 4000)
  }, [])

  const dismissNotification = useCallback(
    (id) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
    [],
  )

  // ── Carrega dados ao logar ──
  useEffect(() => {
    if (!user?.uid) {
      dispatch({ type: 'RESET' })
      return
    }
    const uid = user.uid

    // Categorias padrão são lidas da coleção global; sua criação é administrativa.

    // Listener em tempo real para transações
    const unsubTx = onTransactionsChange(uid, (txs) =>
      dispatch({ type: 'SET_TRANSACTIONS', payload: txs }),
    )
    const unsubInvoiceEvents = onInvoiceEventsChange(
      uid,
      (events) =>
        dispatch({
          type: 'SET_INVOICE_EVENTS',
          payload: events,
        }),
    )

    // Carrega o resto em paralelo
    const load = async () => {
      try {
        const [cats, goals, budgets, creditCards] = await Promise.all([
          getCategories(uid),
          getGoals(uid),
          getBudgets(uid),
          getCreditCards(uid),
        ])
        dispatch({ type: 'SET_CATEGORIES', payload: cats })
        dispatch({ type: 'SET_GOALS', payload: goals })
        dispatch({ type: 'SET_BUDGETS', payload: budgets })
        dispatch({ type: 'SET_CREDIT_CARDS', payload: creditCards })
      } catch (err) {
        console.error('[Meu Real] Erro ao carregar dados:', err.code, err.message)
      }
    }

    load()
    return () => {
      if (typeof unsubTx === 'function') unsubTx()
      if (typeof unsubInvoiceEvents === 'function') {
        unsubInvoiceEvents()
      }
    }
  }, [user?.uid])

  // ── Alerta de orçamento ──
  const checkBudgetAlert = useCallback(
    (newTx) => {
      if (newTx.type !== 'expense') return
      const { budgets, transactions } = stateRef.current
      const budget = budgets.find((b) => b.categoryId === newTx.categoryId)
      if (!budget) return
      const now = new Date()
      const transactionDate = new Date(newTx.date + 'T00:00:00')
      if (
        transactionDate.getFullYear() !== now.getFullYear() ||
        transactionDate.getMonth() !== now.getMonth()
      ) {
        return
      }

      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const spent =
        transactions
          .filter(
            (t) =>
              t.type === 'expense' &&
              t.categoryId === newTx.categoryId &&
              new Date(t.date + 'T00:00:00') >= start,
          )
          .reduce((s, t) => s + t.amount, 0) + newTx.amount
      const pct = (spent / budget.amount) * 100
      if (pct > 100)
        showNotification(
          `🚨 Orçamento de ${newTx.categoryName} EXCEDIDO! (${pct.toFixed(0)}%)`,
          'error',
        )
      else if (pct >= 90)
        showNotification(
          `⚠️ ${pct.toFixed(0)}% do orçamento de ${newTx.categoryName} atingido!`,
          'warning',
        )
      else if (pct >= 70)
        showNotification(
          `📊 ${pct.toFixed(0)}% do orçamento de ${newTx.categoryName} utilizado.`,
          'info',
        )
    },
    [showNotification],
  )

  // ── TRANSACTIONS ──
  const createTransaction = useCallback(
    async (data) => {
      if (!user?.uid) return
      try {
        const transactionId = await addTransaction(user.uid, data)
        showNotification('Transação adicionada!')
        checkBudgetAlert(data)
        return transactionId
      } catch (e) {
        showNotification('Erro ao adicionar transação.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, checkBudgetAlert],
  )

  const addTransactionBatch = useCallback(
    async (items) => {
      if (!user?.uid) return
      try {
        const transactionIds = await fbAddBatch(user.uid, items)
        items.forEach(checkBudgetAlert)
        showNotification(
          items[0]?.isInstallment
            ? `${items.length} parcelas criadas!`
            : `${items.length} entradas recorrentes criadas!`,
        )
        return transactionIds
      } catch (e) {
        showNotification('Erro ao criar transações.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, checkBudgetAlert],
  )

  const editTransaction = useCallback(
    async (id, data) => {
      if (!user?.uid) return
      try {
        await updateTransaction(user.uid, id, data)
        showNotification('Transação atualizada!')
      } catch (e) {
        showNotification('Erro ao atualizar transação.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification],
  )

  const removeTransaction = useCallback(
    async (id) => {
      if (!user?.uid) return
      try {
        await deleteTransaction(user.uid, id)
        showNotification('Transação removida.', 'info')
      } catch (e) {
        showNotification('Erro ao remover transação.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification],
  )

  const removeTransactionBatch = useCallback(
    async (ids) => {
      if (!user?.uid) return
      try {
        await fbDeleteBatch(user.uid, ids)
        showNotification(
          ids.length > 1
            ? 'Compra parcelada removida.'
            : 'Compra removida.',
          'info',
        )
      } catch (e) {
        showNotification('Erro ao desfazer compra.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification],
  )

  const createInvoiceEvent = useCallback(
    async (data) => {
      if (!user?.uid) {
        throw new Error('Usuário não autenticado.')
      }

      try {
        const id = await addInvoiceEvent(user.uid, data)
        showNotification(
          data.type === 'payment'
            ? 'Pagamento registrado na fatura.'
            : data.type === 'reversal'
              ? 'Estorno registrado na fatura.'
              : data.type === 'adjustment'
                ? 'Ajuste registrado na fatura.'
                : 'Fatura marcada como fechada.',
        )
        return id
      } catch (error) {
        showNotification(
          'Não foi possível registrar o evento da fatura.',
          'error',
        )
        throw error
      }
    },
    [user?.uid, showNotification],
  )

  const applyTransactionSeriesOperation = useCallback(
    async (operation) => {
      if (!user?.uid) {
        throw new Error('Usuário não autenticado.')
      }

      try {
        await fbCommitSeries(user.uid, operation)

        const affected = operation?.summary?.affectedCount || 0
        const message =
          operation?.action === 'delete'
            ? `${affected} registro${affected === 1 ? '' : 's'} removido${affected === 1 ? '' : 's'} da série.`
            : `${affected} registro${affected === 1 ? '' : 's'} atualizado${affected === 1 ? '' : 's'} na série.`

        showNotification(
          message,
          operation?.action === 'delete' ? 'info' : 'success',
        )
        return operation?.summary
      } catch (error) {
        showNotification(
          'Não foi possível atualizar a série. Nenhum registro foi alterado parcialmente.',
          'error',
        )
        throw error
      }
    },
    [user?.uid, showNotification],
  )

  // ── CREDIT CARDS ──
  const refreshCreditCards = useCallback(async () => {
    if (!user?.uid) return
    try {
      const cards = await getCreditCards(user.uid)
      dispatch({ type: 'SET_CREDIT_CARDS', payload: cards })
    } catch (e) {
      console.error('[Meu Real] refreshCreditCards:', e.code)
    }
  }, [user?.uid])

  const createCreditCard = useCallback(
    async (data) => {
      if (!user?.uid) return
      try {
        const id = await addCreditCard(user.uid, data)
        await refreshCreditCards()
        showNotification('Cartão cadastrado!')
        return id
      } catch (e) {
        showNotification('Erro ao cadastrar cartão.', 'error')
        throw e
      }
    },
    [user?.uid, refreshCreditCards, showNotification],
  )

  const editCreditCard = useCallback(
    async (id, data) => {
      if (!user?.uid) return
      try {
        await updateCreditCard(user.uid, id, data)
        await refreshCreditCards()
        showNotification('Cartão atualizado!')
      } catch (e) {
        showNotification('Erro ao atualizar cartão.', 'error')
        throw e
      }
    },
    [user?.uid, refreshCreditCards, showNotification],
  )

  const removeCreditCard = useCallback(
    async (id) => {
      if (!user?.uid) return
      try {
        await deleteCreditCard(user.uid, id)
        await refreshCreditCards()
        showNotification('Cartão removido.', 'info')
      } catch (e) {
        showNotification('Erro ao remover cartão.', 'error')
        throw e
      }
    },
    [user?.uid, refreshCreditCards, showNotification],
  )

  // ── CATEGORIES ──
  const refreshCats = useCallback(async () => {
    if (!user?.uid) return
    try {
      const cats = await getCategories(user.uid)
      dispatch({ type: 'SET_CATEGORIES', payload: cats })
    } catch (e) {
      console.error('[Meu Real] refreshCats:', e.code)
    }
  }, [user?.uid])

  const createCategory = useCallback(
    async (data) => {
      if (!user?.uid) return
      try {
        await addCategory(user.uid, data)
        await refreshCats()
        showNotification('Categoria criada!')
      } catch (e) {
        showNotification('Erro ao criar categoria.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshCats],
  )

  const editCategory = useCallback(
    async (id, data) => {
      if (!user?.uid) return
      try {
        await updateCategory(user.uid, id, data)
        await refreshCats()
        showNotification('Categoria atualizada!')
      } catch (e) {
        showNotification('Erro ao atualizar categoria.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshCats],
  )

  const removeCategory = useCallback(
    async (id) => {
      if (!user?.uid) return
      try {
        await deleteCategory(user.uid, id)
        await refreshCats()
        showNotification('Categoria removida.', 'info')
      } catch (e) {
        showNotification('Erro ao remover categoria.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshCats],
  )

  // ── GOALS ──
  const refreshGoals = useCallback(async () => {
    if (!user?.uid) return
    try {
      dispatch({ type: 'SET_GOALS', payload: await getGoals(user.uid) })
    } catch (e) {
      console.error('[Meu Real] refreshGoals:', e.code)
    }
  }, [user?.uid])

  const createGoal = useCallback(
    async (data) => {
      if (!user?.uid) return
      try {
        await addGoal(user.uid, data)
        await refreshGoals()
        showNotification('Meta criada!')
      } catch (e) {
        showNotification('Erro ao criar meta.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshGoals],
  )

  const editGoal = useCallback(
    async (id, data) => {
      if (!user?.uid) return
      try {
        await updateGoal(user.uid, id, data)
        await refreshGoals()
        showNotification('Meta atualizada!')
      } catch (e) {
        showNotification('Erro ao atualizar meta.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshGoals],
  )

  const removeGoal = useCallback(
    async (id) => {
      if (!user?.uid) return
      try {
        await deleteGoal(user.uid, id)
        await refreshGoals()
        showNotification('Meta removida.', 'info')
      } catch (e) {
        showNotification('Erro ao remover meta.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshGoals],
  )

  // ── BUDGETS ──
  const refreshBudgets = useCallback(async () => {
    if (!user?.uid) return
    try {
      dispatch({ type: 'SET_BUDGETS', payload: await getBudgets(user.uid) })
    } catch (e) {
      console.error('[Meu Real] refreshBudgets:', e.code)
    }
  }, [user?.uid])

  const saveBudget = useCallback(
    async (categoryId, amount) => {
      if (!user?.uid) return
      try {
        await setBudget(user.uid, categoryId, amount)
        await refreshBudgets()
        showNotification('Orçamento salvo!')
      } catch (e) {
        showNotification('Erro ao salvar orçamento.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshBudgets],
  )

  const removeBudget = useCallback(
    async (categoryId) => {
      if (!user?.uid) return
      try {
        await deleteBudget(user.uid, categoryId)
        await refreshBudgets()
        showNotification('Orçamento removido.', 'info')
      } catch (e) {
        showNotification('Erro ao remover orçamento.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshBudgets],
  )

  // ── CÁLCULOS ──
  const getMonthTransactions = useCallback(
    (year, month) => transactionsForMonth(stateRef.current.transactions, year, month),
    [],
  )

  const getSummary = useCallback(
    (year, month) => {
      return summarizeTransactions(getMonthTransactions(year, month))
    },
    [getMonthTransactions],
  )

  const getCategoryTotals = useCallback(
    (year, month) => {
      const totals = {}
      getMonthTransactions(year, month)
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          if (!totals[t.categoryId])
            totals[t.categoryId] = {
              categoryId: t.categoryId,
              categoryName: t.categoryName,
              categoryColor: t.categoryColor,
              categoryIcon: t.categoryIcon,
              total: 0,
              count: 0,
            }
          totals[t.categoryId].total += t.amount
          totals[t.categoryId].count++
        })
      return Object.values(totals).sort((a, b) => b.total - a.total)
    },
    [getMonthTransactions],
  )

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

  const getTotalBalance = useCallback(
    () => calculateCurrentBalance(stateRef.current.transactions),
    [],
  )

  const filterTransactions = useCallback(
    ({ year, month, categoryId, paymentMethod, type } = {}) =>
      stateRef.current.transactions.filter((t) => {
        const d = new Date(t.date + 'T00:00:00')
        if (year && d.getFullYear() !== year) return false
        if (month !== undefined && d.getMonth() !== month) return false
        if (categoryId && t.categoryId !== categoryId) return false
        if (paymentMethod && t.paymentMethod !== paymentMethod) return false
        if (type && t.type !== type) return false
        return true
      }),
    [],
  )

  return (
    <AppContext.Provider
      value={{
        ...state,
        createTransaction,
        editTransaction,
        removeTransaction,
        removeTransactionBatch,
        addTransactionBatch,
        createInvoiceEvent,
        applyTransactionSeriesOperation,
        createCreditCard,
        editCreditCard,
        removeCreditCard,
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
        getTotalBalance,
        filterTransactions,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
