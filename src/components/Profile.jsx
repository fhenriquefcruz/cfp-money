// src/components/Profile.jsxx
import React, { useState, useRef } from 'react'
import {
  User, Mail, LogOut, Moon, Sun, Camera, Key, Save,
  Shield, Star, CheckCircle, QrCode, ChevronDown, ChevronUp, Copy
} from 'lucide-react'
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { usePlan } from '../contexts/PlanContext'
import { Card, Button, Input, Modal, Badge } from './ui'
import { auth } from '../services/firebase'

const PIX_KEY    = 'seuemail@exemplo.com' // troque pela sua chave Pix
const PIX_AMOUNT = 'R$ 19,90'

const PREMIUM_FEATURES = [
  'Dashboard avançado com previsões',
  'Relatórios completos + exportação CSV',
  'Histórico ilimitado de transações',
  'Alertas inteligentes de orçamento',
]

export default function Profile() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { status } = usePlan()
  const fileInputRef = useRef(null)

  const [displayName, setDisplayName]       = useState(user?.displayName || '')
  const [photoPreview, setPhotoPreview]     = useState(null)
  const [photoBase64, setPhotoBase64]       = useState(null)
  const [saving, setSaving]                 = useState(false)
  const [successMsg, setSuccessMsg]         = useState('')
  const [errorMsg, setErrorMsg]             = useState('')
  const [showPixModal, setShowPixModal]     = useState(false)
  const [showPassModal, setShowPassModal]   = useState(false)
  const [showPlanDetail, setShowPlanDetail] = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [passForm, setPassForm]             = useState({ current: '', new: '', confirm: '' })
  const [passError, setPassError]           = useState('')

  const toast    = (msg) => { setSuccessMsg(msg); setErrorMsg('');   setTimeout(() => setSuccessMsg(''), 3500) }
  const toastErr = (msg) => { setErrorMsg(msg);   setSuccessMsg(''); setTimeout(() => setErrorMsg(''), 4000)  }

  // ── Foto ──
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toastErr('Imagem deve ter no máximo 2MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result)
      setPhotoBase64(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  // ── Salvar nome + foto ──
  // Usa auth.currentUser diretamente — nunca causa logout
  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toastErr('O nome não pode ficar em branco.'); return }
    setSaving(true)
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Sessão expirada. Faça login novamente.')

      const updates = { displayName: displayName.trim() }

      if (photoBase64) {
        // Salva foto como base64 no localStorage (sem Firebase Storage)
        localStorage.setItem(`cfp_photo_${currentUser.uid}`, photoBase64)
        updates.photoURL = photoBase64
      }

      await updateProfile(currentUser, updates)
      toast('✓ Perfil atualizado com sucesso!')
    } catch (err) {
      toastErr('Erro ao salvar: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  // ── Alterar senha ──
  const handleChangePassword = async () => {
    setPassError('')
    if (!passForm.current) { setPassError('Informe a senha atual.'); return }
    if (passForm.new.length < 6) { setPassError('Nova senha: mínimo 6 caracteres.'); return }
    if (passForm.new !== passForm.confirm) { setPassError('As senhas não coincidem.'); return }
    setSaving(true)
    try {
      const currentUser = auth.currentUser
      const cred = EmailAuthProvider.credential(currentUser.email, passForm.current)
      await reauthenticateWithCredential(currentUser, cred)
      await updatePassword(currentUser, passForm.new)
      toast('✓ Senha alterada com sucesso!')
      setShowPassModal(false)
      setPassForm({ current: '', new: '', confirm: '' })
    } catch (err) {
      const msgs = {
        'auth/wrong-password':     'Senha atual incorreta.',
        'auth/invalid-credential': 'Senha atual incorreta.',
        'auth/too-many-requests':  'Muitas tentativas. Aguarde.',
      }
      setPassError(msgs[err.code] || err.message)
    } finally {
      setSaving(false) }
  }

  const copyPixKey = () => {
    navigator.clipboard.writeText(PIX_KEY).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // Foto: preview novo → localStorage → photoURL do Firebase → inicial
  const avatarSrc = photoPreview
    || localStorage.getItem(`cfp_photo_${user?.uid}`)
    || user?.photoURL
    || null
  const initials = (user?.displayName || user?.email || 'U')[0].toUpperCase()

  const planLabel   = status.isPremium ? (status.isTrial ? 'Trial Premium' : 'Premium Ativo') : status.isExpired ? 'Expirado' : 'Gratuito'
  const planVariant = status.isPremium ? 'success' : status.isExpired ? 'danger' : 'warning'

  return (
    <div className="space-y-5 pb-24 lg:pb-6 max-w-lg">
      <h1 className="text-2xl font-black text-[--text-primary]">Perfil</h1>

      {successMsg && (
        <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-[--danger-bg] border border-[--danger-border] text-[--danger-text] text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* ── Meu Plano ── */}
      <Card>
        <button className="w-full flex items-center justify-between" onClick={() => setShowPlanDetail(v => !v)}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[--brand-100] flex items-center justify-center">
              <Shield size={16} className="text-[--brand-600]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-[--text-primary]">Meu Plano</p>
              <p className="text-xs text-[--text-tertiary]">
                {status.isPremium
                  ? `${status.daysLeft} dia${status.daysLeft !== 1 ? 's' : ''} restante${status.daysLeft !== 1 ? 's' : ''}`
                  : status.isExpired ? 'Assinatura encerrada' : 'Sem assinatura ativa'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={planVariant}>{planLabel}</Badge>
            {showPlanDetail ? <ChevronUp size={14} className="text-[--text-tertiary]" /> : <ChevronDown size={14} className="text-[--text-tertiary]" />}
          </div>
        </button>

        {showPlanDetail && (
          <div className="mt-4 pt-4 border-t border-[--border-subtle] space-y-4">
            {status.isPremium && !status.isTrial && (
              <div className="p-3 rounded-xl bg-[--success-bg] border border-[--success-border]">
                <p className="text-xs font-bold text-[--success-text]">✓ Plano Premium ativo</p>
                <p className="text-xs text-[--success-text] mt-0.5">Vence em {status.daysLeft} dias.</p>
              </div>
            )}
            {status.isTrial && status.isPremium && (
              <div className="p-3 rounded-xl bg-[--brand-50] border border-[--brand-200]">
                <p className="text-xs font-bold text-[--brand-700]">🎁 Período de avaliação</p>
                <p className="text-xs text-[--brand-600] mt-0.5">
                  {status.daysLeft} dia{status.daysLeft !== 1 ? 's' : ''} restante{status.daysLeft !== 1 ? 's' : ''} de experiência Premium gratuita.
                </p>
              </div>
            )}
            {!status.isPremium && (
              <div className="p-3 rounded-xl bg-[--warning-bg] border border-[--warning-border]">
                <p className="text-xs font-bold text-[--warning-text]">
                  {status.isExpired ? '⚠️ Seu período expirou' : '🔒 Plano Gratuito'}
                </p>
                <p className="text-xs text-[--warning-text] mt-0.5">
                  Assine o Premium por {PIX_AMOUNT}/mês e libere todos os recursos.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {PREMIUM_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={13} className={status.isPremium ? 'text-[--success-icon]' : 'text-[--text-tertiary]'} />
                  <span className="text-xs text-[--text-secondary]">{f}</span>
                </div>
              ))}
            </div>

            {(!status.isPremium || status.daysLeft <= 7) && (
              <Button variant="primary" fullWidth icon={<Star size={14} />} onClick={() => setShowPixModal(true)}>
                {status.isPremium ? 'Renovar assinatura' : `Assinar Premium — ${PIX_AMOUNT}/mês`}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ── Informações pessoais ── */}
      <Card>
        <h2 className="text-sm font-bold text-[--text-primary] mb-5">Informações pessoais</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[--brand-400] to-[--brand-600] flex items-center justify-center text-2xl font-black text-white overflow-hidden">
              {avatarSrc
                ? <img src={avatarSrc} className="w-full h-full object-cover" alt="Foto de perfil" />
                : initials}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[--brand-600] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[--brand-700] transition-colors"
              title="Alterar foto">
              <Camera size={13} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <p className="font-bold text-[--text-primary]">{user?.displayName || 'Usuário'}</p>
            <p className="text-sm text-[--text-tertiary]">{user?.email}</p>
            <p className="text-xs text-[--text-tertiary] mt-0.5">Foto: máx. 2MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input label="Nome completo" value={displayName} icon={<User size={15} />}
            onChange={e => setDisplayName(e.target.value)} placeholder="Seu nome completo" />

          {/* E-mail: somente leitura */}
          <div>
            <Input label="E-mail (login)" value={user?.email || ''} icon={<Mail size={15} />}
              disabled className="opacity-60 cursor-not-allowed select-none" />
            <p className="text-xs text-[--text-tertiary] mt-1 ml-1">
              O e-mail é seu identificador de acesso e não pode ser alterado.
            </p>
          </div>

          <Button variant="primary" onClick={handleSaveProfile} loading={saving} icon={<Save size={15} />}>
            Salvar alterações
          </Button>
        </div>

        <div className="pt-5 mt-5 border-t border-[--border-subtle] space-y-2">
          <Button variant="secondary" fullWidth onClick={() => setShowPassModal(true)} icon={<Key size={15} />}>
            Alterar senha
          </Button>
          <Button variant="ghost" fullWidth onClick={toggleTheme}
            icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}>
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </Button>
          <Button variant="danger" fullWidth onClick={logout} icon={<LogOut size={15} />}>
            Sair da conta
          </Button>
        </div>
      </Card>

      {/* ── Modal: Alterar senha ── */}
      <Modal isOpen={showPassModal}
        onClose={() => { setShowPassModal(false); setPassError(''); setPassForm({ current: '', new: '', confirm: '' }) }}
        title="Alterar senha">
        <div className="space-y-4">
          <Input type="password" label="Senha atual" placeholder="••••••••"
            value={passForm.current} onChange={e => setPassForm(f => ({ ...f, current: e.target.value }))} />
          <Input type="password" label="Nova senha" placeholder="Mínimo 6 caracteres"
            value={passForm.new} onChange={e => setPassForm(f => ({ ...f, new: e.target.value }))} />
          <Input type="password" label="Confirmar nova senha" placeholder="Repita a nova senha"
            value={passForm.confirm} onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))} />
          {passError && (
            <p className="text-sm text-[--danger-text] bg-[--danger-bg] border border-[--danger-border] p-2.5 rounded-xl">
              {passError}
            </p>
          )}
          <Button variant="primary" fullWidth onClick={handleChangePassword} loading={saving}>
            Confirmar alteração
          </Button>
        </div>
      </Modal>

      {/* ── Modal: Pix ── */}
      <Modal isOpen={showPixModal} onClose={() => setShowPixModal(false)} title="Assinar Premium via Pix">
        <div className="space-y-4">
          <div className="text-center p-5 rounded-2xl bg-gradient-to-br from-[--brand-700] to-[--brand-500]">
            <p className="text-white/70 text-xs mb-1">Plano Premium · 30 dias</p>
            <p className="text-4xl font-black text-white">{PIX_AMOUNT}</p>
            <p className="text-white/55 text-xs mt-1">Renovação manual a cada mês</p>
          </div>

          <div className="space-y-2">
            {PREMIUM_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle size={13} className="text-[--success-icon]" />
                <span className="text-xs text-[--text-secondary]">{f}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[--bg-subtle] border border-[--border-default] space-y-3">
            <div className="flex items-center gap-2">
              <QrCode size={16} className="text-[--brand-500]" />
              <p className="text-sm font-bold text-[--text-primary]">Como pagar</p>
            </div>
            <div className="space-y-1.5 text-sm text-[--text-secondary]">
              <p>1. Abra o app do seu banco e acesse o Pix.</p>
              <p>2. Transfira <strong className="text-[--text-primary]">{PIX_AMOUNT}</strong> para a chave:</p>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[--bg-elevated] border border-[--border-default]">
              <code className="flex-1 text-sm font-mono text-[--brand-600] truncate">{PIX_KEY}</code>
              <button onClick={copyPixKey}
                className="flex items-center gap-1 text-xs font-semibold text-[--brand-600] hover:text-[--brand-700] flex-shrink-0 transition-colors">
                <Copy size={12} />{copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="space-y-1 text-xs text-[--text-secondary]">
              <p>3. No campo de mensagem/descrição do Pix, escreva seu e-mail:</p>
              <code className="block bg-[--bg-elevated] border border-[--border-default] px-3 py-2 rounded-xl text-[--text-primary] font-mono text-xs">
                {user?.email}
              </code>
              <p className="pt-1">4. Após o pagamento, o acesso será liberado em até 24h.</p>
            </div>
          </div>

          <p className="text-xs text-[--text-tertiary] text-center leading-relaxed">
            O plano vigora por 30 dias a partir da confirmação.<br />
            Dúvidas? Entre em contato pelo mesmo e-mail do Pix.
          </p>
        </div>
      </Modal>
    </div>
  )
}
