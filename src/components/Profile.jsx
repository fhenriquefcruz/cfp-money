// src/components/Profile.jsx
import React, { useState } from 'react'
import { User, Mail, LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Card, Button, Input } from './ui'

export default function Profile() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [loading, setLoading] = useState(false)

  const handleUpdateProfile = async () => {
    // Atualizar perfil (implementar com updateProfile do Firebase)
    alert('Funcionalidade em desenvolvimento')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-[--text-primary]">Perfil</h1>
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[--brand-100] flex items-center justify-center text-2xl">
            {user?.photoURL ? <img src={user.photoURL} className="rounded-full" /> : user?.displayName?.[0] || 'U'}
          </div>
          <div>
            <p className="font-bold text-[--text-primary]">{user?.displayName || 'Usuário'}</p>
            <p className="text-sm text-[--text-tertiary]">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Nome" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <Button variant="primary" onClick={handleUpdateProfile} loading={loading}>Salvar alterações</Button>
          <div className="pt-4 border-t border-[--border-subtle]">
            <Button variant="ghost" onClick={toggleTheme} icon={theme === 'dark' ? <Sun /> : <Moon />}>Alternar tema</Button>
          </div>
          <Button variant="danger" onClick={logout} icon={<LogOut />}>Sair da conta</Button>
        </div>
      </Card>
    </div>
  )
}
