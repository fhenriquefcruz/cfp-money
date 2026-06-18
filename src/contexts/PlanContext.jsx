// src/contexts/PlanContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, activatePremiumForUser, removePremiumForUser, blockUser } from '../services/firebase'
import { useAuth } from './AuthContext'

const PlanContext = createContext({})
export const usePlan = () => useContext(PlanContext)

const TRIAL_DAYS = 7
const ADMIN_EMAIL = 'fhenriquefcruz@gmail.com'

export const PlanProvider = ({ children }) => {
  const { user } = useAuth()
  const [planData, setPlanData] = useState(null)

  useEffect(() => {
    if (!user?.uid) { setPlanData(null); return }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setPlanData(snap.data())
    })
    return unsub
  }, [user?.uid])

  const getStatus = (data) => {
    if (data.blocked) return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0, blocked: true }

    const now = new Date()

    if (data.plan === 'premium' && data.premiumUntil) {
      const daysLeft = Math.ceil((new Date(data.premiumUntil) - now) / 86400000)
      if (daysLeft > 0) return { isPremium: true, isTrial: false, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
    }

    if (data.plan === 'trial' || !data.plan) {
      const trialStart = data.trialStart?.toDate?.() || new Date(data.trialStart)
      const daysLeft = TRIAL_DAYS - Math.floor((now - trialStart) / 86400000)
      if (daysLeft > 0) return { isPremium: true, isTrial: true, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: true, isExpired: true, daysLeft: 0 }
    }

    return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
  }

  // Sobrescreve status para admin: sempre premium, com muitos dias restantes
  const status = useMemo(() => {
    if (user?.email === ADMIN_EMAIL) {
      return { isPremium: true, isTrial: false, isExpired: false, daysLeft: 999 }
    }
    return planData ? getStatus(planData) : { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }
  }, [planData, user])

  return (
    <PlanContext.Provider value={{
      planData, status,
      activatePremium: (months) => activatePremiumForUser(user?.uid, months),
      removePremium:   ()       => removePremiumForUser(user?.uid),
      blockCurrentUser:(blocked) => blockUser(user?.uid, blocked),
    }}>
      {children}
    </PlanContext.Provider>
  )
}
