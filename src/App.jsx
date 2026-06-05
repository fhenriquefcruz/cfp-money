// src/App.jsx
import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import Categories from './components/Categories'
import Goals from './components/Goals'
import Budgets from './components/Budgets'
import Reports from './components/Reports'
import Profile from './components/Profile'

const AppRoutes = () => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>
  if (!user) return <Login />
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
