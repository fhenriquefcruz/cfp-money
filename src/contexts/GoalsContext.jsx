import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { addGoal, deleteGoal, getGoals, updateGoal } from '../repositories/appRepository'
import { createE2EAppState } from '../e2e/fixtures'
import { E2E_MODE } from '../e2e/runtime'
import { useAuth } from './AuthContext'
import { useApp } from './AppContext'

const GoalsContext = createContext({ goals: [], loading: true })

export const useGoals = () => useContext(GoalsContext)

export const GoalsProvider = ({ children }) => {
  const { user } = useAuth()
  const { showNotification } = useApp()
  const [goals, setGoals] = useState(() => (E2E_MODE ? createE2EAppState().goals : []))
  const [loading, setLoading] = useState(!E2E_MODE)

  const refreshGoals = useCallback(async () => {
    if (!user?.uid) return
    setGoals(await getGoals(user.uid))
  }, [user?.uid])

  useEffect(() => {
    if (E2E_MODE) return undefined

    if (!user?.uid) {
      setGoals([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    refreshGoals()
      .catch((error) => console.error('[Meu Real] metas:', error))
      .finally(() => setLoading(false))

    return undefined
  }, [user?.uid, refreshGoals])

  const mutateGoal = useCallback(
    async (action, successMessage, type = 'success') => {
      if (!user?.uid) return
      try {
        await action()
        await refreshGoals()
        showNotification(successMessage, type)
      } catch (error) {
        showNotification('Erro ao atualizar meta.', 'error')
        throw error
      }
    },
    [user?.uid, refreshGoals, showNotification],
  )

  const createGoal = useCallback(
    (data) => mutateGoal(() => addGoal(user.uid, data), 'Meta criada!'),
    [user?.uid, mutateGoal],
  )

  const editGoal = useCallback(
    (id, data) => mutateGoal(() => updateGoal(user.uid, id, data), 'Meta atualizada!'),
    [user?.uid, mutateGoal],
  )

  const removeGoal = useCallback(
    (id) => mutateGoal(() => deleteGoal(user.uid, id), 'Meta removida.', 'info'),
    [user?.uid, mutateGoal],
  )

  return (
    <GoalsContext.Provider value={{ goals, loading, createGoal, editGoal, removeGoal }}>
      {children}
    </GoalsContext.Provider>
  )
}
