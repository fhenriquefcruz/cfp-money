// src/App.jsx
import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PlanProvider } from './contexts/PlanContext'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import Categories from './components/Categories'
import Goals from './components/Goals'
import Budgets from './components/Budgets'
import Reports from './components/Reports'
import Profile from './components/Profile'
import Admin from './components/Admin'
import PlanAlert from './components/PlanAlert'
import PremiumGate from './components/PremiumGate'

// Tela de loading inicial
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-[--bg-app]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-[--brand-500] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[--text-tertiary]">Carregando...</p>
    </div>
  </div>
)

const AppRoutes = () => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Login />

  return (
    <div className="flex min-h-screen bg-[--bg-app]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto min-w-0">
        <Routes>
          <Route path="/"             element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/categories"   element={<Categories />} />
          <Route path="/goals"        element={<Goals />} />
          <Route path="/budgets"      element={<Budgets />} />
          <Route path="/reports"      element={<Reports />} />
          <Route path="/profile"      element={<Profile />} />
          <Route path="/admin"        element={<Admin />} />
        </Routes>
      </main>
      <PlanAlert />
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <PlanProvider>
              <AppRoutes />
            </PlanProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
