// src/contexts/PlanContext.jsx — Firestore-basedxx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, activatePremiumForUser, removePremiumForUser, blockUser } from '../services/firebase'
import { useAuth } from './AuthContext'

const PlanContext = createContext({})
export const usePlan = () => useContext(PlanContext)

const TRIAL_DAYS = 7

export const PlanProvider = ({ children }) => {
  const { user } = useAuth()
  const [planData, setPlanData] = useState(null)

  useEffect(() => {
    if (!user?.uid) { setPlanData(null); return }
    // Listener em tempo real no documento do usuário
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setPlanData(snap.data())
    })
    return unsub
  }, [user?.uid])

  const getStatus = () => {
    if (!planData) return { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }
    if (planData.blocked) return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0, blocked: true }

    const now = new Date()

    if (planData.plan === 'premium' && planData.premiumUntil) {
      const daysLeft = Math.ceil((new Date(planData.premiumUntil) - now) / 86400000)
      if (daysLeft > 0) return { isPremium: true, isTrial: false, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
    }

    if (planData.plan === 'trial' || !planData.plan) {
      const trialStart = planData.trialStart?.toDate?.() || new Date(planData.trialStart)
      const daysLeft = TRIAL_DAYS - Math.floor((now - trialStart) / 86400000)
      if (daysLeft > 0) return { isPremium: true, isTrial: true, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: true, isExpired: true, daysLeft: 0 }
    }

    return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
  }

  const status = planData ? getStatus() : { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }

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
