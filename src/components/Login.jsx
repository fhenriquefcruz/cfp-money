// src/components/Login.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Loader2,
  Mail,
  Orbit,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  WalletCards,
  Zap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from './ui'
import ThemeToggle from './ThemeToggle'

const MODES = {
  login: {
    eyebrow: 'Acesso ao seu espaço financeiro',
    title: 'Continue com clareza.',
    description:
      'Entre para acompanhar seu dinheiro, revisar decisões e conversar com o Money.',
    action: 'Entrar no Meu Real',
  },
  register: {
    eyebrow: 'Uma nova forma de cuidar do dinheiro',
    title: 'Comece simples. Evolua com inteligência.',
    description:
      'Crie sua conta e experimente a experiência Premium por 7 dias, sem cadastrar cartão.',
    action: 'Criar minha conta',
  },
  forgot: {
    eyebrow: 'Recuperação segura',
    title: 'Vamos recuperar seu acesso.',
    description:
      'Informe seu e-mail. Você receberá um link seguro para definir uma nova senha.',
    action: 'Enviar link de recuperação',
  },
}

const TRUST_POINTS = [
  'Sem conexão bancária obrigatória',
  'Dados separados por conta',
  'Você mantém o controle',
]

const PRODUCT_STEPS = [
  {
    icon: WalletCards,
    title: 'Organize',
    description: 'Receitas, despesas, cartões, metas e orçamentos em uma única visão.',
  },
  {
    icon: Bot,
    title: 'Compreenda',
    description: 'O Money transforma seus registros em explicações e comparações úteis.',
  },
  {
    icon: BarChart3,
    title: 'Antecipe',
    description: 'Projeções e relatórios ajudam a enxergar o próximo movimento.',
  },
]

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] flex-shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.39a4.61 4.61 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.97-4.33 2.97-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  )
}

function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/20 ${
          compact ? 'h-10 w-10' : 'h-12 w-12'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/30 via-indigo-400/20 to-violet-400/30" />
        <TrendingUp size={compact ? 19 : 22} className="relative z-10" />
      </div>
      <div>
        <p
          className={`font-black tracking-[-0.03em] ${
            compact ? 'text-xl text-[--text-primary]' : 'text-2xl text-white'
          }`}
        >
          Meu Real
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
            compact ? 'text-[--text-tertiary]' : 'text-white/45'
          }`}
        >
          Inteligência financeira pessoal
        </p>
      </div>
    </div>
  )
}

function SignalBars() {
  const bars = [38, 54, 45, 68, 60, 78, 73, 88, 82, 96]

  return (
    <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
      {bars.map((height, index) => (
        <motion.span
          key={`${height}-${index}`}
          initial={{ height: 8, opacity: 0.35 }}
          animate={{ height: `${height}%`, opacity: 1 }}
          transition={{
            delay: 0.35 + index * 0.045,
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="min-w-0 flex-1 rounded-t-md bg-gradient-to-t from-cyan-400/30 via-cyan-300/65 to-white/90"
        />
      ))}
    </div>
  )
}

function ProductIntelligencePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.18, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="login-intelligence-panel relative mt-8 overflow-hidden rounded-[28px] border border-white/15 p-4 shadow-2xl backdrop-blur-xl xl:p-5"
    >
      <div className="login-panel-scan pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
          </span>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
            Visão financeira em tempo real
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/55">
          Ambiente demonstrativo
        </span>
      </div>

      <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-[1.16fr_0.84fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Saldo projetado
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-white">
                R$ 4.280,00
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200 ring-1 ring-emerald-300/20">
              <Activity size={16} />
            </div>
          </div>

          <div className="mt-4">
            <SignalBars />
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-white/40">Evolução do ciclo</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-200">
              <TrendingUp size={11} />
              tendência positiva
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Orçamento
              </p>
              <CircleDollarSign size={14} className="text-violet-200" />
            </div>
            <p className="mt-2 text-lg font-black text-white">68%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ delay: 0.65, duration: 0.8 }}
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300"
              />
            </div>
            <p className="mt-2 text-[10px] text-white/45">Dentro do planejado</p>
          </div>

          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-2xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/10 to-indigo-400/10 p-3.5"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-200/10 text-cyan-100">
                <Bot size={15} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-cyan-100/80">
                  Money
                </p>
                <p className="text-[10px] text-white/45">Insight do período</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/75">
              Seus gastos estão mais estáveis. Alimentação foi a categoria com maior variação.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

function ExperienceTabs({ mode, onChange }) {
  if (mode === 'forgot') return null

  return (
    <div
      className="grid grid-cols-2 rounded-2xl border border-[--border-default] bg-[--bg-subtle] p-1"
      aria-label="Escolha entre entrar ou criar conta"
    >
      {[
        ['login', 'Entrar'],
        ['register', 'Criar conta'],
      ].map(([value, label]) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={`relative min-h-11 rounded-xl px-3 text-xs font-bold transition-colors ${
              active
                ? 'text-[--text-primary]'
                : 'text-[--text-tertiary] hover:text-[--text-secondary]'
            }`}
          >
            {active && (
              <motion.span
                layoutId="login-mode-indicator"
                className="absolute inset-0 rounded-xl border border-[--border-default] bg-[--bg-surface] shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function Login() {
  const { loginEmail, loginGoogle, register, forgotPassword, error, clearError } = useAuth()
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})

  const content = MODES[mode]

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    clearError()
    setSuccessMsg('')
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setShowPassword(false)
    setErrors({})
    setSuccessMsg('')
    clearError()
  }

  const validate = () => {
    const nextErrors = {}
    const email = form.email.trim()

    if (mode === 'register' && !form.name.trim()) {
      nextErrors.name = 'Informe como você gostaria de ser chamado.'
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      nextErrors.email = 'Digite um e-mail válido.'
    }

    if (mode !== 'forgot' && (!form.password || form.password.length < 6)) {
      nextErrors.password = 'Use pelo menos 6 caracteres.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleGoogleLogin = async () => {
    clearError()
    setSuccessMsg('')
    setIsGoogleLoading(true)

    try {
      await loginGoogle()
    } catch {
      // O AuthContext apresenta a orientação adequada.
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      const email = form.email.trim()

      if (mode === 'login') {
        await loginEmail(email, form.password)
      } else if (mode === 'register') {
        await register(email, form.password, form.name.trim())
        setSuccessMsg('Conta criada. Seus 7 dias de experiência Premium já começaram.')
        setMode('login')
      } else {
        await forgotPassword(email)
        setSuccessMsg('Link enviado. Verifique também as abas Promoções e Spam.')
        setMode('login')
      }
    } catch {
      // O AuthContext apresenta uma mensagem de autenticação apropriada.
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-future-shell relative min-h-screen overflow-hidden">
      <div className="login-future-grid pointer-events-none absolute inset-0" />
      <div className="login-orb login-orb-cyan pointer-events-none absolute" />
      <div className="login-orb login-orb-violet pointer-events-none absolute" />
      <div className="login-orb login-orb-indigo pointer-events-none absolute" />

      <div className="absolute right-4 top-4 z-40 sm:right-6 sm:top-6">
        <ThemeToggle compact className="login-theme-control backdrop-blur-xl" />
      </div>

      <div className="relative z-10 grid min-h-screen xl:grid-cols-[minmax(0,1.16fr)_minmax(430px,0.84fr)]">
        <aside className="login-hero-surface relative hidden min-h-screen overflow-hidden px-10 py-9 text-white lg:flex lg:flex-col xl:px-14 xl:py-11">
          <div className="login-hero-network pointer-events-none absolute inset-0" />

          <div className="relative z-10">
            <BrandMark />
          </div>

          <div className="relative z-10 my-auto max-w-2xl py-10">
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/85 backdrop-blur"
            >
              <Orbit size={13} />
              Finanças mais claras, decisões mais conscientes
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.58 }}
              className="mt-5 max-w-2xl text-4xl font-black leading-[1.04] tracking-[-0.045em] xl:text-[3.45rem]"
            >
              Seu dinheiro,
              <span className="login-gradient-text block">mais legível.</span>
              Suas decisões,
              <span className="text-white/65"> mais inteligentes.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.55 }}
              className="mt-5 max-w-xl text-sm leading-7 text-white/62 xl:text-[15px]"
            >
              Uma experiência financeira criada para reduzir esforço, organizar prioridades
              e transformar números em contexto útil para o dia a dia.
            </motion.p>

            <ProductIntelligencePreview />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {PRODUCT_STEPS.map(({ icon: Icon, title, description }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.07] text-cyan-100">
                      <Icon size={14} />
                    </div>
                    <p className="text-xs font-black text-white">{title}</p>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-white/45">{description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-medium text-white/38">
            {TRUST_POINTS.map((point) => (
              <span key={point} className="inline-flex items-center gap-1.5">
                <Check size={11} className="text-cyan-200/70" />
                {point}
              </span>
            ))}
          </div>
        </aside>

        <main className="relative flex min-h-screen items-center justify-center px-4 py-20 sm:px-8 xl:px-12">
          <div className="w-full max-w-[480px]">
            <div className="mb-7 lg:hidden">
              <BrandMark compact />
              <div className="mt-6 rounded-3xl border border-[--brand-200] bg-gradient-to-br from-[--brand-50] to-[--bg-surface] p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-600] text-white shadow-md">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[--text-primary]">
                      Clareza financeira em uma experiência simples
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[--text-secondary]">
                      Organize, analise com o Money e planeje os próximos passos no mesmo lugar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="login-auth-surface rounded-[30px] border border-[--border-default] p-5 shadow-2xl backdrop-blur-2xl sm:p-7"
              aria-labelledby="login-title"
            >
              <ExperienceTabs mode={mode} onChange={switchMode} />

              <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={mode === 'forgot' ? '' : 'mt-7'}>
                    {mode === 'forgot' && (
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-[--text-brand] hover:underline"
                      >
                        <ChevronRight size={13} className="rotate-180" />
                        Voltar para o acesso
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="h-px w-5 bg-[--brand-400]" />
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[--brand-600]">
                        {content.eyebrow}
                      </p>
                    </div>

                    <h2
                      id="login-title"
                      className="mt-3 text-3xl font-black leading-[1.08] tracking-[-0.035em] text-[--text-primary] sm:text-[2rem]"
                    >
                      {content.title}
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[--text-secondary]">
                      {content.description}
                    </p>
                  </div>

                  {mode === 'register' && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-[--brand-200] bg-[--brand-50]">
                      <div className="flex items-start gap-3 p-3.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[--brand-600] to-violet-600 text-white shadow-sm">
                          <Zap size={15} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black text-[--brand-700]">
                              Premium por 7 dias
                            </p>
                            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[--brand-700]">
                              sem cartão
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-[--brand-600]">
                            Teste Money, projeções, cartões, parcelamentos e relatórios completos.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div aria-live="polite">
                    {successMsg && (
                      <motion.div
                        role="status"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[--success-border] bg-[--success-bg] p-3.5 text-sm text-[--success-text]"
                      >
                        <Check size={15} className="mt-0.5 flex-shrink-0" />
                        <span>{successMsg}</span>
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        role="alert"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-5 rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-3.5 text-sm text-[--danger-text]"
                      >
                        {error}
                      </motion.div>
                    )}
                  </div>

                  {mode !== 'forgot' && (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading || isGoogleLoading}
                        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[--border-default] bg-[--bg-surface] px-4 text-sm font-bold text-[--text-primary] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[--brand-300] hover:bg-[--bg-hover] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[--brand-500] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isGoogleLoading ? (
                          <Loader2 size={18} className="animate-spin text-[--brand-600]" />
                        ) : (
                          <GoogleMark />
                        )}
                        Continuar com Google
                      </button>

                      <div className="my-4 flex items-center gap-3" aria-hidden="true">
                        <span className="h-px flex-1 bg-[--border-subtle]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[--text-tertiary]">
                          ou use seu e-mail
                        </span>
                        <span className="h-px flex-1 bg-[--border-subtle]" />
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {mode === 'register' && (
                      <Input
                        label="Como podemos chamar você?"
                        type="text"
                        placeholder="Seu nome"
                        value={form.name}
                        onChange={updateForm('name')}
                        icon={<User size={17} />}
                        error={errors.name}
                        required
                        autoComplete="name"
                        autoFocus
                        className="min-h-12 rounded-2xl bg-[--bg-elevated] shadow-sm"
                      />
                    )}

                    <Input
                      label="E-mail"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={form.email}
                      onChange={updateForm('email')}
                      icon={<Mail size={17} />}
                      error={errors.email}
                      required
                      autoComplete="email"
                      autoFocus={mode !== 'register'}
                      className="min-h-12 rounded-2xl bg-[--bg-elevated] shadow-sm"
                    />

                    {mode !== 'forgot' && (
                      <div>
                        <Input
                          label="Senha"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo de 6 caracteres"
                          value={form.password}
                          onChange={updateForm('password')}
                          icon={<Lock size={17} />}
                          error={errors.password}
                          required
                          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                          className="min-h-12 rounded-2xl bg-[--bg-elevated] shadow-sm"
                          iconRight={
                            <button
                              type="button"
                              onClick={() => setShowPassword((current) => !current)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-[--text-tertiary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
                              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                              aria-pressed={showPassword}
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          }
                        />

                        <div className="mt-1.5 flex items-center justify-between gap-3 px-1">
                          <p className="inline-flex items-center gap-1.5 text-[10px] text-[--text-tertiary]">
                            <Fingerprint size={11} />
                            Autenticação protegida
                          </p>
                          {mode === 'login' && (
                            <button
                              type="button"
                              onClick={() => switchMode('forgot')}
                              className="min-h-10 text-[11px] font-bold text-[--text-brand] hover:underline"
                            >
                              Esqueci a senha
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={isLoading}
                      disabled={isGoogleLoading}
                      className="login-primary-action min-h-[52px] rounded-2xl text-[15px] shadow-lg"
                      iconRight={<ArrowRight size={17} />}
                    >
                      {content.action}
                    </Button>
                  </form>

                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3">
                    <ShieldCheck
                      size={15}
                      className="mt-0.5 flex-shrink-0 text-[--success-icon]"
                    />
                    <p className="text-[10px] leading-relaxed text-[--text-tertiary]">
                      O Meu Real não movimenta dinheiro nem solicita senha bancária. Você registra,
                      revisa e controla as próprias informações.
                    </p>
                  </div>

                  {mode !== 'forgot' && (
                    <p className="mt-5 text-center text-[11px] leading-relaxed text-[--text-tertiary]">
                      Ao continuar, você concorda com os Termos de uso e a Política de privacidade
                      aplicáveis ao serviço.
                    </p>
                  )}
              </motion.div>
            </motion.section>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-[--text-tertiary] lg:hidden">
              {TRUST_POINTS.map((point) => (
                <span key={point} className="inline-flex items-center gap-1">
                  <Check size={10} className="text-[--success-icon]" />
                  {point}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
