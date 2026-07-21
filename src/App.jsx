// src/App.jsx
import React, { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PlanProvider } from './contexts/PlanContext'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import PlanAlert from './components/PlanAlert'
import Onboarding from './components/Onboarding'

// Notificações globais
import NotificationStack from './components/NotificationStack'
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './components/NotFound'

const Dashboard = lazy(() => import('./components/Dashboard'))
const TransactionList = lazy(() => import('./components/TransactionList'))
const Categories = lazy(() => import('./components/Categories'))
const Goals = lazy(() => import('./components/Goals'))
const Budgets = lazy(() => import('./components/Budgets'))
const Reports = lazy(() => import('./components/Reports'))
const Profile = lazy(() => import('./components/Profile'))
const Admin = lazy(() => import('./components/Admin'))

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-[--bg-app]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-[--brand-500] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[--text-tertiary]">Carregando...</p>
    </div>
  </div>
)

const AppRoutes = () => {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Login />

  return (
    <div className="flex min-h-screen bg-[--bg-app]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto min-w-0">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<TransactionList />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/404" replace />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <PlanAlert />
      <Onboarding />
      <NotificationStack />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}
