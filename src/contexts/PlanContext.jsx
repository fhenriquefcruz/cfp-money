// src/contexts/PlanContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { calculatePlanStatus } from '../domain/plan'
import { useAuth } from './AuthContext'
import { E2E_MODE } from '../e2e/runtime'
import { e2ePlanData, e2eUser } from '../e2e/fixtures'

const PlanContext = createContext({})
export const usePlan = () => useContext(PlanContext)

export const PlanProvider = ({ children }) => {
  const { user, isAdmin } = useAuth()
  const [planData, setPlanData] = useState(E2E_MODE ? e2ePlanData : null)
  const [planDocumentUid, setPlanDocumentUid] = useState(E2E_MODE ? e2eUser.uid : null)
  const [isLoading, setIsLoading] = useState(E2E_MODE ? false : Boolean(user?.uid))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (E2E_MODE) return undefined

    if (!user?.uid) {
      setPlanData(null)
      setPlanDocumentUid(null)
      setIsLoading(false)
      setError(null)
      return undefined
    }

    setIsLoading(true)
    setError(null)
    setPlanData(null)
    setPlanDocumentUid(null)

    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        setPlanDocumentUid(snapshot.id)
        setPlanData(snapshot.exists() ? snapshot.data() : null)
        setIsLoading(false)
      },
      (snapshotError) => {
        console.error('[Meu Real] Erro ao carregar plano do usuário:', snapshotError)
        setError(snapshotError)
        setPlanData(null)
        setPlanDocumentUid(null)
        setIsLoading(false)
      },
    )
  }, [user?.uid])

  const status = useMemo(() => calculatePlanStatus(planData, { isAdmin }), [isAdmin, planData])

  const isCurrentUserDocument = Boolean(
    user?.uid && planDocumentUid && user.uid === planDocumentUid,
  )

  return (
    <PlanContext.Provider
      value={{
        planData,
        planDocumentUid,
        isCurrentUserDocument,
        isLoading,
        error,
        status,
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}
