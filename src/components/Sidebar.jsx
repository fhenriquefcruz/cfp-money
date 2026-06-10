// src/components/Sidebar.jsx
import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, Tags, Target, PieChart,
  BarChart3, User, TrendingUp, LogOut, Menu, X, ChevronRight, Shield
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui'
import { clsx } from 'clsx'

const ADMIN_EMAIL = 'admin@cfpmoney.com'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transações' },
  { to: '/categories',   icon: Tags,            label: 'Categorias' },
  { to: '/goals',        icon: Target,          label: 'Metas' },
  { to: '/budgets',      icon: PieChart,        label: 'Orçamentos' },
  { to: '/reports',      icon: BarChart3,       label: 'Relatórios' },
  { to: '/profile',      icon: User,            label: 'Perfil' },
]

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }) => {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <NavLink to={to} onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative no-underline',
        isActive
          ? 'bg-[--brand-600] text-white shadow-sm'
          : 'text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]'
      )}>
      <Icon size={18} className="flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden">
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {isActive && !collapsed && (
        <motion.div layoutId="nav-indicator" className="absolute right-2">
          <ChevronRight size={14} className="text-white/60" />
        </motion.div>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[--text-primary] text-[--bg-surface] text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = user?.email === ADMIN_EMAIL

  const allItems = isAdmin
    ? [...NAV_ITEMS, { to: '/admin', icon: Shield, label: 'Admin' }]
    : NAV_ITEMS

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={clsx('flex items-center gap-3 p-4 mb-2', collapsed ? 'justify-center' : 'justify-between')}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[--brand-600] flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
                className="text-base font-black text-[--text-primary] whitespace-nowrap overflow-hidden">
                CFP Money
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => setCollapsed(v => !v)}
          className="p-1.5 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] flex-shrink-0">
          <Menu size={16} />
        </button>
      </div>

      {/* User pill */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-3 mb-3 p-2.5 rounded-xl bg-[--bg-hover] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[--brand-600] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
              {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[--text-primary] truncate">
                {user?.displayName || 'Usuário'}
              </p>
              <p className="text-[10px] text-[--text-tertiary] truncate">{user?.email}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {allItems.map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className={clsx('p-3 border-t border-[--border-subtle]', collapsed ? 'flex justify-center' : '')}>
        <Button variant="ghost" fullWidth={!collapsed}
          className={clsx('text-[--danger-text] hover:bg-[--danger-bg]', collapsed ? 'w-10 h-10 p-0 justify-center' : 'justify-start gap-3')}
          onClick={logout}>
          <LogOut size={16} />
          {!collapsed && 'Sair'}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 220 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:flex flex-col h-screen sticky top-0 bg-[--bg-sidebar] border-r border-[--border-subtle] overflow-hidden flex-shrink-0">
        {sidebarContent}
      </motion.aside>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[--bg-surface]/95 backdrop-blur-md border-t border-[--border-subtle] flex items-center justify-around px-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {allItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => clsx(
              'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-150 min-w-0',
              isActive ? 'text-[--brand-600]' : 'text-[--text-tertiary]'
            )}>
            {({ isActive }) => (
              <>
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center transition-all', isActive && 'bg-[--brand-100]')}>
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-medium truncate max-w-[52px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button className="flex flex-col items-center gap-1 py-2 px-3 text-[--text-tertiary]"
          onClick={() => setMobileOpen(true)}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"><Menu size={18} /></div>
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} />
            <motion.div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-[--bg-sidebar] flex flex-col"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[--brand-600] flex items-center justify-center">
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <span className="text-lg font-black text-[--text-primary]">CFP Money</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary]">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {allItems.map(item => (
                  <NavItem key={item.to} {...item} collapsed={false} onClick={() => setMobileOpen(false)} />
                ))}
              </nav>
              <div className="p-4 border-t border-[--border-subtle]">
                <Button variant="ghost" fullWidth className="justify-start gap-3 text-[--danger-text]" onClick={logout}>
                  <LogOut size={16} />Sair da conta
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
