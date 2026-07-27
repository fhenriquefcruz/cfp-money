import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { onMoneySettingsChange, updateMoneySettings } from '../services/firebase'
import { DEFAULT_MONEY_SETTINGS, normalizeMoneySettings } from '../domain/money'

const MoneyContext = createContext(null)

export const useMoney = () => {
  const context = useContext(MoneyContext)
  if (!context) throw new Error('useMoney must be used within MoneyProvider')
  return context
}

export const MoneyProvider = ({ children }) => {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_MONEY_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.uid) {
      setSettings(DEFAULT_MONEY_SETTINGS)
      setIsLoading(false)
      setError(null)
      return undefined
    }

    setIsLoading(true)
    setError(null)

    return onMoneySettingsChange(
      user.uid,
      (storedSettings) => {
        setSettings(normalizeMoneySettings(storedSettings))
        setIsLoading(false)
      },
      (listenerError) => {
        console.error('[Money] Erro ao carregar preferências:', listenerError)
        setSettings(DEFAULT_MONEY_SETTINGS)
        setError('Não foi possível carregar as preferências do Money.')
        setIsLoading(false)
      },
    )
  }, [user?.uid])

  const saveSettings = useCallback(
    async (nextSettings) => {
      if (!user?.uid) throw new Error('Usuário não autenticado.')
      const normalized = normalizeMoneySettings(nextSettings)
      setIsSaving(true)
      setError(null)

      try {
        await updateMoneySettings(user.uid, normalized)
        setSettings(normalized)
        return normalized
      } catch (saveError) {
        console.error('[Money] Erro ao salvar preferências:', saveError)
        setError('Não foi possível salvar as preferências do Money.')
        throw saveError
      } finally {
        setIsSaving(false)
      }
    },
    [user?.uid],
  )

  const value = useMemo(
    () => ({ settings, isLoading, isSaving, error, saveSettings }),
    [settings, isLoading, isSaving, error, saveSettings],
  )

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>
}
