import React, { createContext, useContext, useEffect, useState } from 'react'
import { addGoal, deleteGoal, getGoals, updateGoal } from '../repositories/appRepository'
import { createE2EAppState } from '../e2e/fixtures'
import { E2E_MODE } from '../e2e/runtime'

const GoalsContext = createContext({ goals: [], loading: true })

export const useGoals = () => useContext(GoalsContext)

export const GoalsProvider = ({ children, notify, userId }) => {
  const [goals, setGoals] = useState(() => (E2E_MODE ? createE2EAppState().goals : []))
  const [loading, setLoading] = useState(!E2E_MODE)

  useEffect(() => {
    if (E2E_MODE) return undefined

    if (!userId) {
      setGoals([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    getGoals(userId)
      .then(setGoals)
      .catch((error) => console.error('[Meu Real] metas:', error))
      .finally(() => setLoading(false))

    return undefined
  }, [userId])

  const mutateGoal = async (action, message, type = 'success') => {
    if (!userId) return
    try {
      await action()
      setGoals(await getGoals(userId))
      notify?.(message, type)
    } catch (error) {
      notify?.('Erro ao atualizar meta.', 'error')
      throw error
    }
  }

  const value = {
    goals,
    loading,
    createGoal: (data) => mutateGoal(() => addGoal(userId, data), 'Meta criada!'),
    editGoal: (id, data) => mutateGoal(() => updateGoal(userId, id, data), 'Meta atualizada!'),
    removeGoal: (id) => mutateGoal(() => deleteGoal(userId, id), 'Meta removida.', 'info'),
  }

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}
