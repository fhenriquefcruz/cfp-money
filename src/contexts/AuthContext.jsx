// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { E2E_MODE } from '../e2e/runtime'
import { e2eUser } from '../e2e/fixtures'
import {
  onAuthChange,
  signInEmail,
  signInGoogle,
  registerEmail,
  resetPassword,
  logOut,
} from '../services/firebase'

const AuthContext = createContext({})

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(E2E_MODE ? e2eUser : null)
  const [loading, setLoading] = useState(!E2E_MODE)
  const [claims, setClaims] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (E2E_MODE) return undefined

    const unsubscribe = onAuthChange(async (u) => {
      setUser(u)
      setClaims(u ? (await u.getIdTokenResult()).claims : {})
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const clearError = () => setError(null)

  const handleError = (err) => {
    const messages = {
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/email-already-in-use': 'E-mail já cadastrado.',
      'auth/weak-password': 'Senha muito fraca. Use ao menos 6 caracteres.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
      'auth/network-request-failed': 'Sem conexão com a internet.',
      'auth/configuration-not-found': 'Configuração do Firebase inválida. Verifique o .env.',
      'auth/operation-not-allowed': 'O login com Google ainda não foi ativado no Firebase.',
      'auth/popup-blocked':
        'O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.',
      'auth/popup-closed-by-user': 'O login com Google foi cancelado.',
      'auth/cancelled-popup-request': 'Já existe uma janela de login em andamento.',
      'auth/unauthorized-domain':
        'Este endereço ainda não foi autorizado no Firebase Authentication.',
      'auth/account-exists-with-different-credential':
        'Este e-mail já possui uma conta. Entre com e-mail e senha para vinculá-lo ao Google sem perder seus dados.',
      'auth/credential-already-in-use': 'Esta Conta do Google já está vinculada a outro usuário.',
    }
    setError(messages[err.code] || err.message || 'Erro desconhecido.')
    throw err
  }

  const loginEmail = async (email, password) => {
    clearError()
    try {
      return await signInEmail(email, password)
    } catch (e) {
      handleError(e)
    }
  }

  const loginGoogle = async () => {
    clearError()
    try {
      return await signInGoogle()
    } catch (e) {
      handleError(e)
    }
  }

  const register = async (email, password, name) => {
    clearError()
    try {
      return await registerEmail(email, password, name)
    } catch (e) {
      handleError(e)
    }
  }

  const forgotPassword = async (email) => {
    clearError()
    try {
      return await resetPassword(email)
    } catch (e) {
      handleError(e)
    }
  }

  const logout = async () => {
    if (E2E_MODE) return
    await logOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        claims,
        isAdmin: claims.admin === true,
        loading,
        error,
        clearError,
        loginEmail,
        loginGoogle,
        register,
        forgotPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
