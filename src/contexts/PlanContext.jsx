// src/contexts/PlanContext.jsx
// Gerencia plano do usuário (free/premium), trial de 7 dias, assinatura Pix e alertas
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const PlanContext = createContext({})
export const usePlan = () => useContext(PlanContext)

const TRIAL_DAYS = 7
const PLAN_KEY = (uid) => `cfp_plan_${uid}`

function loadPlan(uid) {
  try {
    const raw = localStorage.getItem(PLAN_KEY(uid))
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function savePlan(uid, data) {
  localStorage.setItem(PLAN_KEY(uid), JSON.stringify(data))
}

export const PlanProvider = ({ children }) => {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null) // null = carregando

  useEffect(() => {
    if (!user) { setPlan(null); return }
    let p = loadPlan(user.uid)
    if (!p) {
      // Novo usuário — inicia trial
      p = {
        type: 'trial',
        trialStart: new Date().toISOString(),
        premiumUntil: null,
        blocked: false,
        limited: false,
      }
      savePlan(user.uid, p)
    }
    setPlan(p)
  }, [user])

  const save = (updated) => {
    if (!user) return
    savePlan(user.uid, updated)
    setPlan(updated)
  }

  // ── Calcula status atual ──
  const getStatus = () => {
    if (!plan) return { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }
    if (plan.blocked) return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0, blocked: true }

    const now = new Date()

    // Assinatura Premium ativa
    if (plan.type === 'premium' && plan.premiumUntil) {
      const until = new Date(plan.premiumUntil)
      const daysLeft = Math.ceil((until - now) / (1000 * 60 * 60 * 24))
      if (daysLeft > 0) return { isPremium: true, isTrial: false, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
    }

    // Trial
    if (plan.type === 'trial' && plan.trialStart) {
      const start = new Date(plan.trialStart)
      const daysUsed = Math.floor((now - start) / (1000 * 60 * 60 * 24))
      const daysLeft = TRIAL_DAYS - daysUsed
      if (daysLeft > 0) return { isPremium: true, isTrial: true, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: true, isExpired: true, daysLeft: 0 }
    }

    return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
  }

  // Chamado pelo admin ao confirmar pagamento Pix
  const activatePremium = (months = 1) => {
    const premiumUntil = new Date()
    premiumUntil.setDate(premiumUntil.getDate() + months * 30)
    save({ ...plan, type: 'premium', premiumUntil: premiumUntil.toISOString(), blocked: false, limited: false })
  }

  const blockUser = () => save({ ...plan, blocked: true })
  const unblockUser = () => save({ ...plan, blocked: false })
  const limitUser = (limited) => save({ ...plan, limited })

  const status = plan ? getStatus() : { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }

  return (
    <PlanContext.Provider value={{ plan, status, activatePremium, blockUser, unblockUser, limitUser }}>
      {children}
    </PlanContext.Provider>
  )
}
