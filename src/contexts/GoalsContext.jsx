import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { addGoal, deleteGoal, getGoals, updateGoal } from '../repositories/appRepository'
import { createE2EAppState } from '../e2e/fixtures'
import { E2E_MODE } from '../e2e/runtime'

const GoalsContext = createContext({ goals: [], loading: true })

export const useGoals = () => useContext(GoalsContext)

export const GoalsProvider = ({ children, notify, userId }) => {
  const [goals, setGoals] = useState(() => (E2E_MODE ? createE2EAppState().goals : []))
  const [loading, setLoading] = useState(!E2E_MODE)

  const refreshGoals = useCallback(async () => {
    if (!userId) return
    setGoals(await getGoals(userId))
  }, [userId])

  useEffect(() => {
    if (E2E_MODE) return undefined

    if (!userId) {
      setGoals([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    refreshGoals()
      .catch((error) => console.error('[Meu Real] metas:', error))
      .finally(() => setLoading(false))

    return undefined
  }, [userId, refreshGoals])

  const mutateGoal = useCallback(
    async (action, successMessage, type = 'success') => {
      if (!userId) return
      try {
        await action()
        await refreshGoals()
        notify?.(successMessage, type)
      } catch (error) {
        notify?.('Erro ao atualizar meta.', 'error')
        throw error
      }
    },
    [userId, refreshGoals, notify],
  )

  const createGoal = useCallback(
    (data) => mutateGoal(() => addGoal(userId, data), 'Meta criada!'),
    [userId, mutateGoal],
  )

  const editGoal = useCallback(
    (id, data) => mutateGoal(() => updateGoal(userId, id, data), 'Meta atualizada!'),
    [userId, mutateGoal],
  )

  const removeGoal = useCallback(
    (id) => mutateGoal(() => deleteGoal(userId, id), 'Meta removida.', 'info'),
    [userId, mutateGoal],
  )

  return (
    <GoalsContext.Provider value={{ goals, loading, createGoal, editGoal, removeGoal }}>
      {children}
    </GoalsContext.Provider>
  )
}
