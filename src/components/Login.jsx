// src/components/Login.jsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, TrendingUp, Check, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from './ui'

const FREE_FEATURES = [
  'Controle de receitas e despesas',
  'Categorias personalizadas',
  'Metas financeiras',
  '7 dias de experiência Premium grátis',
]
const PREMIUM_FEATURES = [
  'Dashboard avançado com previsões',
  'Relatórios completos + exportação PDF',
  'Histórico ilimitado',
  'Alertas inteligentes de orçamento',
  'Suporte prioritário',
]

export default function Login() {
  const { loginEmail, register, forgotPassword, error, clearError } = useAuth()
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})

  const updateForm = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(e => ({ ...e, [field]: '' }))
    clearError(); setSuccessMsg('')
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
      if (mode === 'login') await loginEmail(form.email, form.password)
      else if (mode === 'register') {
        await register(form.email, form.password, form.name)
        setSuccessMsg('Conta criada! Seus 7 dias Premium começam agora. Bem-vindo!')
        setMode('login')
      } else {
        await forgotPassword(form.email)
        setSuccessMsg('E-mail de recuperação enviado!')
        setMode('login')
      }
    } catch (_) {}
    finally { setIsLoading(false) }
  }

  const switchMode = (m) => { setMode(m); clearError(); setSuccessMsg(''); setErrors({}) }

  const titles = {
    login:    { title: 'Bem-vindo de volta',   sub: 'Entre na sua conta para continuar' },
    register: { title: 'Comece gratuitamente', sub: '7 dias com experiência Premium completa' },
    forgot:   { title: 'Recuperar acesso',     sub: 'Enviaremos um link para redefinir sua senha' },
  }
  const t = titles[mode]

  return (
    <div className="min-h-screen flex bg-[--bg-app]">

      {/* ── Painel esquerdo ── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] bg-gradient-to-br from-[--brand-800] via-[--brand-700] to-[--brand-500] p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <TrendingUp className="text-white" size={22} />
          </div>
          <div>
            <span className="text-2xl font-black text-white tracking-tight">CFP Money</span>
            <p className="text-white/55 text-xs mt-0.5">Controle financeiro pessoal</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-3">
              Tome controle<br />das suas finanças
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              Organize receitas, despesas e metas em um só lugar.
              Simples, seguro e feito para o seu dia a dia.
            </p>
          </div>

          {/* Cards Free / Premium */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1">Gratuito</p>
              <p className="text-white text-2xl font-black mb-3">R$ 0</p>
              <div className="space-y-2">
                {FREE_FEATURES.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={11} className="text-white/50 mt-0.5 flex-shrink-0" />
                    <span className="text-white/65 text-xs leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-0.5 rounded-bl-xl tracking-wide">
                POPULAR
              </div>
              <div className="flex items-center gap-1 mb-1">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <p className="text-yellow-300 text-[10px] font-semibold uppercase tracking-widest">Premium</p>
              </div>
              <p className="text-white text-2xl font-black">R$ 19,90
                <span className="text-white/45 text-xs font-normal">/mês</span>
              </p>
              <p className="text-white/40 text-[10px] mb-3">via Pix · renova em 30 dias</p>
              <div className="space-y-2">
                {PREMIUM_FEATURES.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={11} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/80 text-xs leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-white/30 text-xs">
          Seus dados são armazenados de forma segura e isolada por conta.
        </p>
      </div>

      {/* ── Painel direito ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[--brand-600] flex items-center justify-center">
              <TrendingUp className="text-white" size={18} />
            </div>
            <div>
              <span className="text-xl font-black text-[--text-primary]">CFP Money</span>
              <p className="text-[--text-tertiary] text-xs">Controle financeiro pessoal</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

              <h1 className="text-3xl font-black text-[--text-primary] mb-1">{t.title}</h1>
              <p className="text-[--text-secondary] text-sm mb-8">{t.sub}</p>

              {mode === 'register' && (
                <div className="mb-5 p-3 rounded-xl bg-[--brand-50] border border-[--brand-200] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[--brand-600] flex items-center justify-center flex-shrink-0">
                    <Star size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[--brand-700]">7 dias Premium grátis</p>
                    <p className="text-xs text-[--brand-600]">Sem cartão. Sem compromisso.</p>
                  </div>
                </div>
              )}

              {successMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-[--success-bg] border border-[--success-border] text-[--success-text] text-sm">
                  ✓ {successMsg}
                </motion.div>
              )}
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-[--danger-bg] border border-[--danger-border] text-[--danger-text] text-sm">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <Input label="Nome completo" type="text" placeholder="João Silva"
                    value={form.name} onChange={updateForm('name')}
                    icon={<User />} error={errors.name} required autoFocus />
                )}
                <Input label="E-mail" type="email" placeholder="joao@exemplo.com"
                  value={form.email} onChange={updateForm('email')}
                  icon={<Mail />} error={errors.email} required autoFocus={mode !== 'register'} />
                {mode !== 'forgot' && (
                  <Input label="Senha" type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" value={form.password} onChange={updateForm('password')}
                    icon={<Lock />} error={errors.password} required
                    iconRight={
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="text-[--text-tertiary] hover:text-[--text-secondary]">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    } />
                )}
                {mode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button type="button" className="text-xs text-[--text-brand] hover:underline"
                      onClick={() => switchMode('forgot')}>
                      Esqueci a senha
                    </button>
                  </div>
                )}
                <Button type="submit" variant="primary" fullWidth loading={isLoading}
                  className="py-3 text-base" iconRight={<ArrowRight />}>
                  {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta grátis' : 'Enviar e-mail'}
                </Button>
              </form>

              <p className="text-center text-sm text-[--text-secondary] mt-6">
                {mode === 'login' ? (
                  <>Não tem conta?{' '}
                    <button className="text-[--text-brand] font-semibold hover:underline"
                      onClick={() => switchMode('register')}>Cadastre-se grátis</button></>
                ) : (
                  <>Já tem conta?{' '}
                    <button className="text-[--text-brand] font-semibold hover:underline"
                      onClick={() => switchMode('login')}>Entrar</button></>
                )}
              </p>

              <p className="text-center text-xs text-[--text-tertiary] mt-4">
                Ao continuar, você concorda com os{' '}
                <a href="#" className="hover:underline">Termos de uso</a> e a{' '}
                <a href="#" className="hover:underline">Política de privacidade</a>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
