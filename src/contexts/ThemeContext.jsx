// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})
export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('finwise-theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('finwise-theme', theme)
  }, [theme])

  // Auto-follow system preference if no manual override
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('finwise-theme-manual')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    localStorage.setItem('finwise-theme-manual', '1')
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}
