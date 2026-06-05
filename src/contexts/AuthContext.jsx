// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange, signInEmail, registerEmail, resetPassword, logOut } from '../services/firebase'
import { seedDefaultCategories } from '../services/firebase'

const AuthContext = createContext({})

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (u) => {
      setUser(u)
      if (u) {
        // Seed default categories for new users (apenas uma vez)
        try {
          await seedDefaultCategories()
        } catch (e) {
          console.warn('Erro ao semear categorias:', e)
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const clearError = () => setError(null)

  const handleError = (err) => {
    const messages = {
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/email-already-in-use': 'E-mail já cadastrado.',
      'auth/weak-password': 'Senha muito fraca. Use ao menos 6 caracteres.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
      'auth/network-request-failed': 'Sem conexão com a internet.',
    }
    setError(messages[err.code] || err.message || 'Erro desconhecido.')
    throw err
  }

  const loginEmail = async (email, password) => {
    clearError()
    try {
      return await signInEmail(email, password)
    } catch (e) { handleError(e) }
  }

  const register = async (email, password, name) => {
    clearError()
    try {
      return await registerEmail(email, password, name)
    } catch (e) { handleError(e) }
  }

  const forgotPassword = async (email) => {
    clearError()
    try {
      return await resetPassword(email)
    } catch (e) { handleError(e) }
  }

  const logout = async () => {
    await logOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      clearError,
      loginEmail,
      register,
      forgotPassword,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
