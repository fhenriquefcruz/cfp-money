// src/components/Profile.jsx
import React, { useState, useRef } from 'react'
import { User, Mail, LogOut, Moon, Sun, Camera, Key, Save } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Card, Button, Input, Modal } from './ui'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '../services/firebase'

export default function Profile() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '')
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordError, setPasswordError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleUpdateProfile = async () => {
    if (!displayName.trim()) return
    setLoading(true)
    try {
      await updateProfile(user, { displayName })
      // Atualizar também no localStorage se quiser, mas o Firebase já atualiza o observable
      setSuccessMsg('Nome atualizado!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert('Erro ao atualizar nome: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('As senhas não coincidem')
      return
    }
    if (passwordForm.new.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)
    try {
      // Reautenticação necessária
      const credential = EmailAuthProvider.credential(user.email, passwordForm.current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, passwordForm.new)
      setSuccessMsg('Senha alterada com sucesso!')
      setShowPasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      if (err.code === 'auth/wrong-password') setPasswordError('Senha atual incorreta')
      else setPasswordError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-[--text-primary]">Perfil</h1>
      {successMsg && (
        <div className="bg-[--success-bg] text-[--success-text] p-3 rounded-xl">{successMsg}</div>
      )}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[--brand-100] flex items-center justify-center text-2xl overflow-hidden">
              {photoURL ? (
                <img src={photoURL} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span>{user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            {/* Botão para upload de foto (opcional, exige Firebase Storage) */}
            <button 
              className="absolute bottom-0 right-0 bg-[--brand-600] p-1 rounded-full text-white"
              onClick={() => {
                const url = prompt('Cole a URL da sua imagem (opcional):')
                if (url) {
                  updateProfile(user, { photoURL: url }).then(() => setPhotoURL(url))
                }
              }}
              title="Adicionar foto via URL"
            >
              <Camera size={14} />
            </button>
          </div>
          <div>
            <p className="font-bold text-[--text-primary]">{user?.displayName || 'Usuário'}</p>
            <p className="text-sm text-[--text-tertiary]">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input 
            label="Nome" 
            value={displayName} 
            onChange={e => setDisplayName(e.target.value)} 
          />
          <Button variant="primary" onClick={handleUpdateProfile} loading={loading} icon={<Save />}>
            Salvar alterações
          </Button>

          <div className="pt-4 border-t border-[--border-subtle] space-y-3">
            <Button variant="secondary" onClick={() => setShowPasswordModal(true)} icon={<Key />}>
              Alterar senha
            </Button>
            <Button variant="ghost" onClick={toggleTheme} icon={theme === 'dark' ? <Sun /> : <Moon />}>
              Alternar tema
            </Button>
            <Button variant="danger" onClick={logout} icon={<LogOut />}>
              Sair da conta
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de alteração de senha */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Alterar senha">
        <div className="space-y-4">
          <Input 
            type="password" 
            label="Senha atual" 
            value={passwordForm.current} 
            onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} 
          />
          <Input 
            type="password" 
            label="Nova senha" 
            value={passwordForm.new} 
            onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} 
          />
          <Input 
            type="password" 
            label="Confirmar nova senha" 
            value={passwordForm.confirm} 
            onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} 
          />
          {passwordError && <p className="text-sm text-[--danger-text]">{passwordError}</p>}
          <Button variant="primary" fullWidth onClick={handleChangePassword} loading={loading}>
            Alterar senha
          </Button>
        </div>
      </Modal>
    </div>
  )
}
