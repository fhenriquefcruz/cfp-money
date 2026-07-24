// src/contexts/PlanContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, activatePremiumForUser, removePremiumForUser, blockUser } from '../services/firebase'
import { calculatePlanStatus } from '../domain/plan'
import { useAuth } from './AuthContext'

const PlanContext = createContext({})
export const usePlan = () => useContext(PlanContext)

export const PlanProvider = ({ children }) => {
  const { user, isAdmin } = useAuth()
  const [planData, setPlanData] = useState(null)
  const [planDocumentUid, setPlanDocumentUid] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(user?.uid))
  const [error, setError] = useState(null)

  useEffect(() => {
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

  const status = useMemo(
    () => calculatePlanStatus(planData, { isAdmin }),
    [isAdmin, planData],
  )

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
        activatePremium: (months) => activatePremiumForUser(user?.uid, months),
        removePremium: () => removePremiumForUser(user?.uid),
        blockCurrentUser: (blocked) => blockUser(user?.uid, blocked),
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}
