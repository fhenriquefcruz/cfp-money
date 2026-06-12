// src/contexts/PlanContext.jsx
// Chave do plano baseada no EMAIL do usuário (mais legível para o admin)
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const PlanContext = createContext({})
export const usePlan = () => useContext(PlanContext)

const TRIAL_DAYS = 7
// Chave no localStorage usa email (sanitizado) em vez de uid opaco
const planKey = (email) => `cfp_plan_${email?.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

function loadPlan(email) {
  try {
    const raw = localStorage.getItem(planKey(email))
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function savePlan(email, data) {
  localStorage.setItem(planKey(email), JSON.stringify(data))
}

export const PlanProvider = ({ children }) => {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    if (!user?.email) { setPlan(null); return }
    let p = loadPlan(user.email)
    if (!p) {
      p = {
        email: user.email,
        name: user.displayName || '',
        type: 'trial',
        trialStart: new Date().toISOString(),
        premiumUntil: null,
        blocked: false,
        limited: false,
      }
      savePlan(user.email, p)
    } else {
      // Garante que email e nome estão sempre atualizados
      p = { ...p, email: user.email, name: user.displayName || p.name || '' }
      savePlan(user.email, p)
    }
    setPlan(p)
  }, [user])

  const save = (updated) => {
    if (!user?.email) return
    savePlan(user.email, updated)
    setPlan(updated)
  }

  const getStatus = () => {
    if (!plan) return { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }
    if (plan.blocked) return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0, blocked: true }

    const now = new Date()

    if (plan.type === 'premium' && plan.premiumUntil) {
      const daysLeft = Math.ceil((new Date(plan.premiumUntil) - now) / 86400000)
      if (daysLeft > 0) return { isPremium: true, isTrial: false, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
    }

    if (plan.type === 'trial' && plan.trialStart) {
      const daysLeft = TRIAL_DAYS - Math.floor((now - new Date(plan.trialStart)) / 86400000)
      if (daysLeft > 0) return { isPremium: true, isTrial: true, isExpired: false, daysLeft }
      return { isPremium: false, isTrial: true, isExpired: true, daysLeft: 0 }
    }

    return { isPremium: false, isTrial: false, isExpired: true, daysLeft: 0 }
  }

  const activatePremium = (months = 1) => {
    const premiumUntil = new Date()
    premiumUntil.setDate(premiumUntil.getDate() + months * 30)
    save({ ...plan, type: 'premium', premiumUntil: premiumUntil.toISOString(), blocked: false, limited: false })
  }

  const blockUser   = ()        => save({ ...plan, blocked: true })
  const unblockUser = ()        => save({ ...plan, blocked: false })
  const limitUser   = (limited) => save({ ...plan, limited })

  const status = plan ? getStatus() : { isPremium: false, isTrial: false, isExpired: false, daysLeft: 0 }

  return (
    <PlanContext.Provider value={{ plan, status, activatePremium, blockUser, unblockUser, limitUser }}>
      {children}
    </PlanContext.Provider>
  )
}

// ── Utilitário global para o Admin ──
// Lê todos os planos salvos no localStorage deste dispositivo
export function getAllPlansFromStorage() {
  const plans = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('cfp_plan_')) {
      try {
        const plan = JSON.parse(localStorage.getItem(key))
        if (plan?.email) plans.push(plan)
      } catch {}
    }
  }
  return plans.sort((a, b) => (a.email > b.email ? 1 : -1))
}

// Ativa premium para qualquer email (chamado pelo Admin)
export function activatePremiumForEmail(email, months = 1) {
  const key = `cfp_plan_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  const existing = (() => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } })()
  const premiumUntil = new Date()
  premiumUntil.setDate(premiumUntil.getDate() + months * 30)
  localStorage.setItem(key, JSON.stringify({
    ...existing, email,
    type: 'premium',
    premiumUntil: premiumUntil.toISOString(),
    blocked: false, limited: false
  }))
}

export function blockEmailInStorage(email, blocked) {
  const key = `cfp_plan_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  const existing = (() => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } })()
  localStorage.setItem(key, JSON.stringify({ ...existing, email, blocked }))
}

// Remove premium — reverte para free
export function removePremiumForEmail(email) {
  const key = `cfp_plan_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  const existing = (() => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } })()
  localStorage.setItem(key, JSON.stringify({
    ...existing, email,
    type: 'free',
    premiumUntil: null,
    blocked: false,
  }))
}
