// src/contexts/AppContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import {
  onTransactionsChange,
  getCategories,
  getGoals,
  getBudgets,
  addTransaction,
  updateTransaction,
  updateTransactionPaymentStatus,
  updateTransactionPaymentStatuses,
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
import { enqueueBudgetNotification } from '../services/notificationService'
import { E2E_MODE } from '../e2e/runtime'
import { createE2EAppState } from '../e2e/fixtures'
import {
  createPaymentStatusChange,
  ensureTransactionPaymentDefaults,
} from '../domain/paymentControl'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

const GoalsContext = createContext({ goals: [], loading: true })
export const useGoals = () => useContext(GoalsContext)

export const GoalsProvider = ({ children, notify, userId }) => {
  const [goals, setGoals] = useState(() => (E2E_MODE ? createE2EAppState().goals : null))

  useEffect(() => {
    if (E2E_MODE) return undefined
    if (!userId) {
      setGoals([])
      return undefined
    }

    setGoals(null)
    getGoals(userId)
      .then(setGoals)
      .catch((error) => {
        console.error('[Meu Real] metas:', error)
        setGoals([])
      })

    return undefined
  }, [userId])

  const mutateGoal = async (action, message, type) => {
    if (!userId) return
    try {
      await action()
      setGoals(await getGoals(userId))
      notify?.(message, type)
    } catch (error) {
      notify?.('Erro na meta.', 'error')
      throw error
    }
  }

  return (
    <GoalsContext.Provider
      value={{
        goals: goals ?? [],
        loading: goals === null,
        createGoal: (data) => mutateGoal(() => addGoal(userId, data), 'Meta criada!'),
        editGoal: (id, data) => mutateGoal(() => updateGoal(userId, id, data), 'Meta salva!'),
        removeGoal: (id) => mutateGoal(() => deleteGoal(userId, id), 'Meta removida.', 'info'),
      }}
    >
      {children}
    </GoalsContext.Provider>
  )
}

const CategoriesContext = createContext({ categories: [], loading: true })
export const useCategories = () => useContext(CategoriesContext)

export const CategoriesProvider = ({ children, notify, userId }) => {
  const [categories, setCategories] = useState(() =>
    E2E_MODE ? createE2EAppState().categories : null,
  )

  useEffect(() => {
    if (E2E_MODE) return undefined
    if (!userId) {
      setCategories([])
      return undefined
    }

    setCategories(null)
    getCategories(userId)
      .then(setCategories)
      .catch((error) => {
        console.error('[Meu Real] categorias:', error)
        setCategories([])
      })

    return undefined
  }, [userId])

  const mutateCategory = async (action, message, type) => {
    if (!userId) return
    try {
      await action()
      setCategories(await getCategories(userId))
      notify?.(message, type)
    } catch (error) {
      notify?.('Erro na categoria.', 'error')
      throw error
    }
  }

  return (
    <CategoriesContext.Provider
      value={{
        categories: categories ?? [],
        loading: categories === null,
        createCategory: (data) =>
          mutateCategory(() => addCategory(userId, data), 'Categoria criada!'),
        editCategory: (id, data) =>
          mutateCategory(() => updateCategory(userId, id, data), 'Categoria salva!'),
        removeCategory: (id) =>
          mutateCategory(() => deleteCategory(userId, id), 'Categoria removida.', 'info'),
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

const CreditCardsContext = createContext({ creditCards: [], loading: true })
export const useCreditCards = () => useContext(CreditCardsContext)

export const CreditCardsProvider = ({ children, notify, userId }) => {
  const [creditCards, setCreditCards] = useState(() =>
    E2E_MODE ? createE2EAppState().creditCards : null,
  )

  useEffect(() => {
    if (E2E_MODE) return undefined
    if (!userId) {
      setCreditCards([])
      return undefined
    }

    setCreditCards(null)
    getCreditCards(userId)
      .then(setCreditCards)
      .catch((error) => {
        console.error('[Meu Real] cartões:', error)
        setCreditCards([])
      })

    return undefined
  }, [userId])

  const mutateCreditCard = async (action, message, type) => {
    if (!userId) return undefined
    try {
      const result = await action()
      setCreditCards(await getCreditCards(userId))
      notify?.(message, type)
      return result
    } catch (error) {
      notify?.('Erro no cartão.', 'error')
      throw error
    }
  }

  return (
    <CreditCardsContext.Provider
      value={{
        creditCards: creditCards ?? [],
        loading: creditCards === null,
        createCreditCard: (data) =>
          mutateCreditCard(() => addCreditCard(userId, data), 'Cartão cadastrado!'),
        editCreditCard: (id, data) =>
          mutateCreditCard(() => updateCreditCard(userId, id, data), 'Cartão salvo!'),
        removeCreditCard: (id) =>
          mutateCreditCard(() => deleteCreditCard(userId, id), 'Cartão removido.', 'info'),
      }}
    >
      {children}
    </CreditCardsContext.Provider>
  )
}

const InvoiceEventsContext = createContext({ invoiceEvents: [], loading: true })
export const useInvoiceEvents = () => useContext(InvoiceEventsContext)

export const InvoiceEventsProvider = ({ children, notify, userId }) => {
  const [invoiceEvents, setInvoiceEvents] = useState(() =>
    E2E_MODE ? createE2EAppState().invoiceEvents : null,
  )

  useEffect(() => {
    if (E2E_MODE) return undefined
    if (!userId) {
      setInvoiceEvents([])
      return undefined
    }

    setInvoiceEvents(null)
    return onInvoiceEventsChange(userId, setInvoiceEvents)
  }, [userId])

  const createInvoiceEvent = async (data) => {
    if (!userId) throw new Error('Usuário não autenticado.')

    try {
      const id = await addInvoiceEvent(userId, data)
      notify?.(
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
      notify?.('Não foi possível registrar o evento da fatura.', 'error')
      throw error
    }
  }

  return (
    <InvoiceEventsContext.Provider
      value={{
        invoiceEvents: invoiceEvents ?? [],
        loading: invoiceEvents === null,
      }}
    >
      {children}
    </InvoiceEventsContext.Provider>
  )
}

const initialState = {
  transactions: [],
  budgets: [],
  loading: {
    transactions: true,
    budgets: true,
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
    case 'SET_BUDGETS':
      return { ...state, budgets: action.payload, loading: { ...state.loading, budgets: false } }
    case 'E2E_ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] }
    case 'E2E_ADD_TRANSACTION_BATCH':
      return { ...state, transactions: [...action.payload, ...state.transactions] }
    case 'E2E_UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.payload.id
            ? { ...transaction, ...action.payload.data }
            : transaction,
        ),
      }
    case 'E2E_REMOVE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.payload),
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
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    E2E_MODE ? createE2EAppState() : initialState,
  )
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
    if (E2E_MODE) return undefined

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
    // Carrega o resto em paralelo
    const load = async () => {
      try {
        dispatch({ type: 'SET_BUDGETS', payload: await getBudgets(uid) })
      } catch (err) {
        console.error('[Meu Real] Erro ao carregar dados:', err.code, err.message)
      }
    }

    load()
    return () => {
      if (typeof unsubTx === 'function') unsubTx()
    }
  }, [user?.uid])

  // ── Alerta de orçamento ──
  const checkBudgetAlert = useCallback(
    async (newTx, replacingId = '') => {
      if (newTx.type !== 'expense' || newTx.isSavings || newTx.paymentStatus === 'cancelled') {
        return
      }

      const { budgetMonthKey, getBudgetForMonth, getBudgetSpent, getBudgetTransactionMonth } =
        await import('../domain/budgetPeriods')
      const { budgets, transactions } = stateRef.current
      const currentMonthKey = budgetMonthKey()
      const monthKey = getBudgetTransactionMonth(newTx)

      if (!monthKey || monthKey !== currentMonthKey) return

      const budget = getBudgetForMonth(budgets, newTx.categoryId, monthKey, currentMonthKey)
      if (!budget) return

      const baseTransactions = replacingId
        ? transactions.filter((transaction) => transaction.id !== replacingId)
        : transactions
      const spent = getBudgetSpent([...baseTransactions, newTx], newTx.categoryId, monthKey)
      const pct = (spent / budget.amount) * 100

      let threshold = null
      let notificationType = 'info'
      let notificationMessage = ''

      if (pct > 100) {
        threshold = 'over'
        notificationType = 'error'
        notificationMessage = `🚨 Orçamento de ${newTx.categoryName} EXCEDIDO! (${pct.toFixed(0)}%)`
      } else if (pct >= 100) {
        threshold = 100
        notificationType = 'error'
        notificationMessage = `⛔ Limite de ${newTx.categoryName} atingido!`
      } else if (pct >= 90) {
        threshold = 90
        notificationType = 'warning'
        notificationMessage = `⚠️ ${pct.toFixed(0)}% do orçamento de ${newTx.categoryName} atingido!`
      } else if (pct >= 70) {
        threshold = 70
        notificationMessage = `📊 ${pct.toFixed(0)}% do orçamento de ${newTx.categoryName} utilizado.`
      }

      if (!threshold) return

      showNotification(notificationMessage, notificationType)

      if (user?.uid) {
        enqueueBudgetNotification(user.uid, {
          categoryId: newTx.categoryId,
          categoryName: newTx.categoryName || 'Categoria',
          threshold,
          percentage: pct,
          spent,
          limit: budget.amount,
          monthKey,
        }).catch((error) => {
          console.error('[Meu Real] Fila de alerta por e-mail:', error)
        })
      }
    },
    [showNotification, user?.uid],
  )

  // ── TRANSACTIONS ──
  const createTransaction = useCallback(
    async (data) => {
      if (!user?.uid) return
      const preparedData = ensureTransactionPaymentDefaults(data)
      try {
        const transactionId = E2E_MODE
          ? `e2e-transaction-${Date.now()}`
          : await addTransaction(user.uid, preparedData)

        if (E2E_MODE) {
          dispatch({
            type: 'E2E_ADD_TRANSACTION',
            payload: {
              ...preparedData,
              id: transactionId,
              createdAt: new Date().toISOString(),
            },
          })
        }

        showNotification('Transação adicionada!')
        checkBudgetAlert(preparedData)
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
      const preparedItems = items.map(ensureTransactionPaymentDefaults)
      try {
        const transactionIds = E2E_MODE
          ? preparedItems.map((_, index) => `e2e-batch-${Date.now()}-${index}`)
          : await fbAddBatch(user.uid, preparedItems)

        if (E2E_MODE) {
          dispatch({
            type: 'E2E_ADD_TRANSACTION_BATCH',
            payload: preparedItems.map((item, index) => ({
              ...item,
              id: transactionIds[index],
              createdAt: new Date().toISOString(),
            })),
          })
        }

        preparedItems.forEach(checkBudgetAlert)
        showNotification(
          preparedItems[0]?.isInstallment
            ? `${preparedItems.length} parcelas criadas!`
            : `${preparedItems.length} entradas recorrentes criadas!`,
        )
        return transactionIds
      } catch (e) {
        showNotification('Erro ao criar transações.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, checkBudgetAlert],
  )

  const importTransactionBatch = useCallback(
    async (items) => {
      if (!user?.uid) return []
      if (!Array.isArray(items) || items.length === 0) return []
      if (items.length > 400) {
        throw new Error('A importação excede o limite seguro de 400 transações.')
      }

      const preparedItems = items.map(ensureTransactionPaymentDefaults)

      try {
        const transactionIds = E2E_MODE
          ? preparedItems.map((_, index) => `e2e-import-${Date.now()}-${index}`)
          : await fbAddBatch(user.uid, preparedItems)

        if (E2E_MODE) {
          dispatch({
            type: 'E2E_ADD_TRANSACTION_BATCH',
            payload: preparedItems.map((item, index) => ({
              ...item,
              id: transactionIds[index],
              createdAt: new Date().toISOString(),
            })),
          })
        }

        preparedItems.forEach(checkBudgetAlert)
        showNotification(
          `${preparedItems.length} ${preparedItems.length === 1 ? 'transação importada' : 'transações importadas'}!`,
        )
        return transactionIds
      } catch (error) {
        showNotification('Não foi possível concluir a importação.', 'error')
        throw error
      }
    },
    [user?.uid, showNotification, checkBudgetAlert],
  )

  const editTransaction = useCallback(
    async (id, data) => {
      if (!user?.uid) return
      try {
        if (E2E_MODE) {
          dispatch({ type: 'E2E_UPDATE_TRANSACTION', payload: { id, data } })
        } else {
          await updateTransaction(user.uid, id, data)
        }
        checkBudgetAlert({ ...data, id }, id)
        showNotification('Transação atualizada!')
      } catch (e) {
        showNotification('Erro ao atualizar transação.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, checkBudgetAlert],
  )

  const setTransactionPaymentStatus = useCallback(
    async (id, isPaid) => {
      if (!user?.uid) return
      try {
        if (E2E_MODE) {
          dispatch({
            type: 'E2E_UPDATE_TRANSACTION',
            payload: { id, data: createPaymentStatusChange(isPaid) },
          })
        } else {
          await updateTransactionPaymentStatus(user.uid, id, isPaid)
        }
        showNotification(isPaid ? 'Despesa marcada como paga.' : 'Despesa marcada como pendente.')
      } catch (error) {
        showNotification('Erro ao atualizar o pagamento.', 'error')
        throw error
      }
    },
    [user?.uid, showNotification],
  )

  const commitPaymentStatusOperation = useCallback(
    async (operation) => {
      if (!user?.uid) {
        throw new Error('Usuário não autenticado.')
      }

      const changes = Array.isArray(operation?.changes) ? operation.changes : []

      if (!changes.length) return null

      try {
        if (E2E_MODE) {
          changes.forEach((change) => {
            dispatch({
              type: 'E2E_UPDATE_TRANSACTION',
              payload: {
                id: change.id,
                data: change.data,
              },
            })
          })
        } else {
          await updateTransactionPaymentStatuses(user.uid, operation)
        }

        showNotification(
          operation.kind === 'undo'
            ? 'Última ação de pagamentos desfeita.'
            : `${changes.length} ${changes.length === 1 ? 'pagamento atualizado' : 'pagamentos atualizados'}.`,
        )

        return operation
      } catch (error) {
        showNotification(
          operation.kind === 'undo'
            ? 'Não foi possível desfazer a ação.'
            : 'Erro ao atualizar pagamentos em massa.',
          'error',
        )
        throw error
      }
    },
    [user?.uid, showNotification],
  )

  const removeTransaction = useCallback(
    async (id) => {
      if (!user?.uid) return
      try {
        if (E2E_MODE) {
          dispatch({ type: 'E2E_REMOVE_TRANSACTION', payload: id })
        } else {
          await deleteTransaction(user.uid, id)
        }
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
        showNotification(ids.length > 1 ? 'Transações removidas.' : 'Transação removida.', 'info')
      } catch (e) {
        showNotification('Erro ao remover transações.', 'error')
        throw e
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

        showNotification(message, operation?.action === 'delete' ? 'info' : 'success')
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
    async (categoryId, amount, monthKey) => {
      if (!user?.uid) return
      try {
        const items = Array.isArray(categoryId) ? categoryId : [{ categoryId, amount }]
        await Promise.all(
          items.map((item) => setBudget(user.uid, item.categoryId, item.amount, monthKey)),
        )
        await refreshBudgets()
        showNotification('Orçamento salvo!')
      } catch (e) {
        showNotification('Erro ao salvar.', 'error')
        throw e
      }
    },
    [user?.uid, showNotification, refreshBudgets],
  )

  const removeBudget = useCallback(
    async (categoryId, monthKey, budgetId = '') => {
      if (!user?.uid) return
      try {
        await deleteBudget(user.uid, categoryId, monthKey, budgetId)
        await refreshBudgets()
        showNotification('Orçamento mensal removido.', 'info')
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
        setTransactionPaymentStatus,
        commitPaymentStatusOperation,
        removeTransaction,
        removeTransactionBatch,
        addTransactionBatch,
        importTransactionBatch,
        createInvoiceEvent,
        applyTransactionSeriesOperation,
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
