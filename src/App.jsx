// src/App.jsx
import React, { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PlanProvider } from './contexts/PlanContext'
import { MoneyProvider } from './contexts/MoneyContext'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import PlanAlert from './components/PlanAlert'
import Onboarding from './components/Onboarding'
import LegalGate from './components/LegalGate'
import PwaUpdateNotice from './components/PwaUpdateNotice'

// Notificações globais
import NotificationStack from './components/NotificationStack'
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './components/NotFound'

const Dashboard = lazy(() => import('./components/Dashboard'))
const Money = lazy(() => import('./components/Money'))
const CreditCardsDashboard = lazy(() => import('./components/CreditCardsDashboard'))
const TransactionList = lazy(() => import('./components/TransactionList'))
const Categories = lazy(() => import('./components/Categories'))
const Goals = lazy(() => import('./components/Goals'))
const Budgets = lazy(() => import('./components/Budgets'))
const Reports = lazy(() => import('./components/Reports'))
const Profile = lazy(() => import('./components/Profile'))
const Admin = lazy(() => import('./components/Admin'))

const LoadingScreen = () => (
  <div className="aurora-app-shell flex h-screen items-center justify-center bg-[--bg-app]">
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
    <div className="aurora-app-shell flex h-dvh min-h-0 overflow-hidden bg-[--bg-app]">
      <Sidebar />
      <main className="aurora-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/money" element={<Money />} />
            <Route path="/cards" element={<CreditCardsDashboard />} />
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
      <LegalGate />
      <NotificationStack />
      <PwaUpdateNotice />
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
                <MoneyProvider>
                  <AppRoutes />
                </MoneyProvider>
              </PlanProvider>
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </HashRouter>
    </ErrorBoundary>
  )
}
