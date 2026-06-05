// src/components/Sidebar.jsx
import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, Tags, Target, PieChart,
  BarChart3, User, TrendingUp, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/categories', icon: Tags, label: 'Categorias' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative',
        'no-underline',
        isActive
          ? 'bg-[--brand-600] text-white shadow-sm'
          : 'text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]'
      )}
    >
      <Icon size={18} className="flex-shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-black text-[--text-primary]"
              >
                CFP Money
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex p-1 rounded-lg hover:bg-[--bg-hover] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
        >
          <Menu size={16} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className={clsx('p-3 border-t border-[--border-subtle] mt-2')}>
        <div className={clsx('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
          <div className="w-8 h-8 rounded-full bg-[--brand-100] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[--brand-600]">
                {(user?.displayName || user?.email || '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-[--text-primary] truncate">
                  {user?.displayName || 'Usuário'}
                </p>
                <p className="text-xs text-[--text-tertiary] truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[--danger-text] transition-colors"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={logout}
            className="mt-2 w-full flex justify-center p-1.5 rounded-lg hover:bg-[--danger-bg] text-[--text-tertiary] hover:text-[
