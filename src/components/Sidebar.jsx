// src/components/Sidebar.jsx
import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Target,
  PieChart,
  BarChart3,
  User,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Bot,
  Crown,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePlan } from '../contexts/PlanContext'
import { Button } from './ui'
import ThemeToggle from './ThemeToggle'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/money', icon: Bot, label: 'Money', premium: true },
  { to: '/cards', icon: CreditCard, label: 'Cartões', premium: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/categories', icon: Tags, label: 'Categorias' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

const NavItem = ({ to, icon: Icon, label, premium, collapsed, onClick }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={clsx(
        'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-all duration-150',
        isActive
          ? 'bg-[--brand-600] text-white shadow-sm'
          : 'text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]',
      )}
    >
      <span className="relative flex-shrink-0">
        <Icon size={18} />
        {premium && collapsed && (
          <Crown
            size={9}
            className={clsx(
              'absolute -right-1.5 -top-1.5',
              isActive ? 'text-yellow-300' : 'text-yellow-500',
            )}
          />
        )}
      </span>

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {premium && !collapsed && (
        <span
          className={clsx(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide',
            isActive ? 'bg-white/15 text-yellow-200' : 'bg-yellow-100 text-yellow-800',
          )}
        >
          <Crown size={9} />
          Pro
        </span>
      )}

      {isActive && !collapsed && !premium && (
        <motion.div layoutId="nav-indicator">
          <ChevronRight size={14} className="text-white/60" />
        </motion.div>
      )}

      {collapsed && (
        <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg bg-[--text-primary] px-2 py-1 text-xs font-medium text-[--bg-surface] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
          {premium ? ' · Premium' : ''}
        </div>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const { status } = usePlan()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const allItems = isAdmin
    ? [...NAV_ITEMS, { to: '/admin', icon: Shield, label: 'Admin' }]
    : NAV_ITEMS

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className={clsx(
          'mb-2 flex items-center gap-3 p-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="aurora-brand-mark flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-600]">
            <TrendingUp size={16} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-base font-black text-[--text-primary]">Meu Real</p>
                <p className="text-[9px] text-[--text-tertiary]">
                  {status.isPremium ? 'Experiência Premium' : 'Plano básico'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[--text-tertiary] transition-colors hover:bg-[--bg-hover]"
            aria-label="Recolher menu lateral"
          >
            <Menu size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-[--text-tertiary] transition-colors hover:bg-[--bg-hover]"
          aria-label="Expandir menu lateral"
        >
          <Menu size={16} />
        </button>
      )}

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl bg-[--bg-hover] p-2.5"
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[--brand-600] text-xs font-bold text-white">
              {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[--text-primary]">
                {user?.displayName || 'Usuário'}
              </p>
              <p className="truncate text-[10px] text-[--text-tertiary]">{user?.email}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {allItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div
        className={clsx(
          'space-y-2 border-t border-[--border-subtle] p-3',
          collapsed && 'flex flex-col items-center',
        )}
      >
        <ThemeToggle compact={collapsed} fullWidth={!collapsed} />

        <Button
          variant="ghost"
          fullWidth={!collapsed}
          className={clsx(
            'text-[--danger-text] hover:bg-[--danger-bg]',
            collapsed ? 'h-11 w-11 justify-center p-0' : 'justify-start gap-3',
          )}
          onClick={logout}
          aria-label={collapsed ? 'Sair da conta' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && 'Sair'}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 68 : 232 }}
        transition={{ duration: 0.2 }}
        className="aurora-sidebar sticky top-0 hidden h-screen flex-shrink-0 flex-col overflow-hidden border-r border-[--border-subtle] bg-[--bg-sidebar] lg:flex"
      >
        {sidebarContent}
      </motion.aside>

      <nav
        className="aurora-bottom-nav fixed bottom-0 left-0 right-0 z-[70] flex items-center justify-around border-t border-[--border-subtle] bg-[--bg-surface]/95 px-1 backdrop-blur-md sm:px-2 lg:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        {allItems.slice(0, 5).map(({ to, icon: Icon, label, premium }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex min-h-14 min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-all duration-150 sm:px-3',
                isActive ? 'text-[--brand-600]' : 'text-[--text-tertiary]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    'relative flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                    isActive && 'bg-[--brand-100]',
                  )}
                >
                  <Icon size={18} />
                  {premium && (
                    <Crown size={9} className="absolute -right-0.5 -top-0.5 text-yellow-500" />
                  )}
                </div>
                <span className="max-w-[52px] truncate text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          className="flex min-h-14 flex-col items-center gap-1 px-1 py-2 text-[--text-tertiary] sm:px-3"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-more-menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl">
            <Menu size={18} />
          </div>
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 top-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              id="mobile-more-menu"
              role="dialog"
              aria-modal="false"
              aria-label="Mais opções de navegação"
              className="aurora-mobile-drawer fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-0 top-0 z-[60] flex w-[min(18rem,86vw)] flex-col overflow-hidden bg-[--bg-sidebar] shadow-2xl lg:hidden"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <div className="aurora-brand-mark flex h-8 w-8 items-center justify-center rounded-xl bg-[--brand-600]">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[--text-primary]">Meu Real</p>
                    <p className="text-[10px] text-[--text-tertiary]">
                      {status.isPremium ? 'Experiência Premium' : 'Plano básico'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[--text-tertiary] hover:bg-[--bg-hover]"
                  aria-label="Fechar menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3">
                {allItems.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    collapsed={false}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </nav>

              <div className="space-y-2 border-t border-[--border-subtle] p-4">
                <ThemeToggle fullWidth />
                <Button
                  variant="ghost"
                  fullWidth
                  className="justify-start gap-3 text-[--danger-text]"
                  onClick={logout}
                >
                  <LogOut size={16} />
                  Sair da conta
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
