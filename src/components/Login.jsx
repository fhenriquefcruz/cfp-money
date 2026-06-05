// src/components/Login.jsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from './ui'

const FEATURES = [
  { icon: TrendingUp, text: 'Dashboard inteligente com previsões' },
  { icon: Shield, text: 'Dados isolados e 100% seguros' },
  { icon: Zap, text: 'Sincronização em tempo real' },
]

export default function Login() {
  const { loginEmail, register, forgotPassword, error, loading, clearError } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})

  const updateForm = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(e => ({ ...e, [field]: '' }))
    clearError()
    setSuccessMsg('')
  }

  const validate = () => {
    const errs = {}
    if (mode === 'register' && !form.name.trim()) errs.name = 'Nome é obrigatório'
    if (mode !== 'forgot') {
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'E-mail inválido'
      if (!form.password || form.password.length < 6) errs.password = 'Mínimo 6 caracteres'
    } else {
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'E-mail inválido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      if (mode === 'login') {
        await loginEmail(form.email, form.password)
      } else if (mode === 'register') {
        await register(form.email, form.password, form.name)
        setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar.')
        setMode('login')
      } else if (mode === 'forgot') {
        await forgotPassword(form.email)
        setSuccessMsg('E-mail de recuperação enviado!')
        setMode('login')
      }
    } catch (_) {
      // erro já tratado no contexto
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (m) => {
    setMode(m)
    clearError()
    setSuccessMsg('')
    setErrors({})
  }

  const titles = {
    login: { title: 'Bem-vindo de volta', sub: 'Entre na sua conta para continuar' },
    register: { title: 'Criar conta gratuita', sub: 'Comece a controlar suas finanças hoje' },
    forgot: { title: 'Esqueceu a senha?', sub: 'Enviaremos um e-mail para redefinir' },
  }
  const t = titles[mode]

  return (
    <div className="min-h-screen flex bg-[--bg-app]">
      {/* Left panel — brand + features */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[--brand-700] via-[--brand-600] to-[--brand-500] p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-10 w-40 h-40 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="text-white" size={22} />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">CFP Money</span>
          </div>
          <p className="text-white/70 text-sm">Controle financeiro pessoal</p>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-black text-white leading-tight">
            Tome controle<br />das suas finanças
          </h2>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-white/90 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'Usuários ativos', value: '10k+' },
            { label: 'Transações geridas', value: '500k+' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-[--brand-600] flex items-center justify-center">
              <TrendingUp className="text-white" size={18} />
            </div>
            <span className="text-xl font-black text-[--text-primary]">CFP Money</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-black text-[--text-primary] mb-1">{t.title}</h1>
              <p className="text-[--text-secondary] text-sm mb-8">{t.sub}</p>

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm"
                >
                  ✓ {successMsg}
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-[--danger-bg] border border-[--danger-border] text-[--danger-text] text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <Input
                    label="Nome completo"
                    type="text"
                    placeholder="João Silva"
                    value={form.name}
                    onChange={updateForm('name')}
                    icon={<User />}
                    error={errors.name}
                    required
                    autoFocus
                  />
                )}

                <Input
                  label="E-mail"
                  type="email"
                  placeholder="joao@exemplo.com"
                  value={form.email}
                  onChange={updateForm('email')}
                  icon={<Mail />}
                  error={errors.email}
                  required
                  autoFocus={mode !== 'register'}
                />

                {mode !== 'forgot' && (
                  <Input
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={updateForm('password')}
                    icon={<Lock />}
                    error={errors.password}
                    required
                    iconRight={
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="text-[--text-tertiary] hover:text-[--text-secondary]">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-[--text-brand] hover:underline"
                      onClick={() => switchMode('forgot')}
                    >
                      Esqueci a senha
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                  className="py-3 text-base"
                  iconRight={<ArrowRight />}
                >
                  {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar e-mail'}
                </Button>
              </form>

              {/* Mode switcher */}
              <p className="text-center text-sm text-[--text-secondary] mt-6">
                {mode === 'login' ? (
                  <>
                    Não tem conta?{' '}
                    <button className="text-[--text-brand] font-semibold hover:underline" onClick={() => switchMode('register')}>
                      Cadastre-se grátis
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?{' '}
                    <button className="text-[--text-brand] font-semibold hover:underline" onClick={() => switchMode('login')}>
                      Entrar
                    </button>
                  </>
                )}
              </p>

              <p className="text-center text-xs text-[--text-tertiary] mt-4">
                Ao continuar, você concorda com os{' '}
                <a href="#" className="hover:underline">Termos de uso</a>
                {' '}e a{' '}
                <a href="#" className="hover:underline">Política de privacidade</a>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
