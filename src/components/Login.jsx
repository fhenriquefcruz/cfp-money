// src/components/Login.jsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  Check,
  Star,
  Wallet,
  Bot,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input } from './ui'
import ThemeToggle from './ThemeToggle'

const PRODUCT_FLOW = [
  {
    icon: Wallet,
    title: 'Organize com leveza',
    description: 'Registre receitas, despesas, metas e orçamentos em poucos passos.',
  },
  {
    icon: Bot,
    title: 'Entenda com o Money',
    description: 'Compare períodos e receba explicações objetivas sobre seus gastos.',
  },
  {
    icon: BarChart3,
    title: 'Decida com contexto',
    description: 'Use projeções e relatórios para planejar o que vem pela frente.',
  },
]

const PREMIUM_HIGHLIGHTS = [
  'Money, seu assistente financeiro',
  'Análises e projeções inteligentes',
  'Relatórios completos com PDF',
  'Alertas de orçamento',
]

const TITLES = {
  login: {
    eyebrow: 'Acesso seguro',
    title: 'Que bom ter você de volta',
    sub: 'Entre para continuar de onde parou. Seus registros e preferências permanecem preservados.',
    button: 'Acessar meu painel',
  },
  register: {
    eyebrow: 'Comece com clareza',
    title: 'Organize seu dinheiro sem complicação',
    sub: 'Crie sua conta e experimente os recursos Premium por 7 dias, sem cartão.',
    button: 'Criar minha conta',
  },
  forgot: {
    eyebrow: 'Recuperação de acesso',
    title: 'Vamos ajudar você a entrar novamente',
    sub: 'Informe o e-mail da sua conta e enviaremos um link seguro para redefinir a senha.',
    button: 'Enviar link de recuperação',
  },
}

export default function Login() {
  const { loginEmail, register, forgotPassword, error, clearError } = useAuth()
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    clearError()
    setSuccessMsg('')
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
        setSuccessMsg('Conta criada. Sua experiência Premium de 7 dias começou.')
        setMode('login')
      } else {
        await forgotPassword(email)
        setSuccessMsg('Enviamos o link de recuperação. Verifique também a caixa de spam.')
        setMode('login')
      }
    } catch {
      // O AuthContext apresenta a mensagem adequada ao usuário.
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setShowPassword(false)
    clearError()
    setSuccessMsg('')
    setErrors({})
  }

  const content = TITLES[mode]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[--bg-app]">
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>

      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[--brand-800] via-[--brand-700] to-[--brand-500] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/7" />
            <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-black/5" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Meu Real</p>
              <p className="mt-0.5 text-xs text-white/60">Clareza para cuidar do seu dinheiro</p>
            </div>
          </div>

          <div className="relative z-10 my-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
              <Sparkles size={13} />
              Menos esforço para entender suas finanças
            </div>

            <h1 className="max-w-lg text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">
              Entenda seu dinheiro.
              <br />
              Decida com mais tranquilidade.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/72 xl:text-base">
              O Meu Real reúne organização, análise e planejamento em uma experiência simples.
              Você registra o que aconteceu e o Money ajuda a transformar números em contexto.
            </p>

            <div className="mt-8 grid gap-3">
              {PRODUCT_FLOW.map(({ icon: Icon, title, description }, index) => (
                <div
                  key={title}
                  className="group flex items-start gap-4 rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm transition-colors hover:bg-white/12"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                        0{index + 1}
                      </span>
                      <p className="text-sm font-bold">{title}</p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/62">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-yellow-950">
                  <Star size={16} className="fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-yellow-100">Experiência Premium</p>
                    <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-yellow-950">
                      7 dias grátis
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PREMIUM_HIGHLIGHTS.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <Check size={12} className="mt-0.5 flex-shrink-0 text-yellow-300" />
                        <span className="text-xs text-white/75">{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-white/48">
                    Depois do período gratuito, o plano básico continua disponível. Premium:
                    R$ 19,90 por mês.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs text-white/45">
            <ShieldCheck size={14} />
            Seus dados ficam separados por conta e você mantém o controle dos registros.
          </div>
        </aside>

        <main className="flex min-h-screen items-center justify-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[--brand-600] text-white shadow-sm">
                <TrendingUp size={19} />
              </div>
              <div>
                <p className="text-xl font-black text-[--text-primary]">Meu Real</p>
                <p className="text-xs text-[--text-tertiary]">
                  Clareza para cuidar do seu dinheiro
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.section
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                aria-labelledby="login-title"
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[--brand-600]">
                  {content.eyebrow}
                </p>
                <h2 id="login-title" className="text-3xl font-black leading-tight text-[--text-primary]">
                  {content.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[--text-secondary]">
                  {content.sub}
                </p>

                {mode === 'register' && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[--brand-200] bg-[--brand-50] p-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-600] text-white">
                      <Bot size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[--brand-700]">
                        Conheça o Money desde o primeiro dia
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[--brand-600]">
                        Durante 7 dias, você poderá testar análises, projeções e relatórios
                        Premium. Não é necessário cadastrar cartão.
                      </p>
                    </div>
                  </div>
                )}

                {successMsg && (
                  <motion.div
                    role="status"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-2xl border border-[--success-border] bg-[--success-bg] p-3.5 text-sm text-[--success-text]"
                  >
                    <div className="flex items-start gap-2">
                      <Check size={15} className="mt-0.5 flex-shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-2xl border border-[--danger-border] bg-[--danger-bg] p-3.5 text-sm text-[--danger-text]"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
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
                      <p className="ml-1 mt-1.5 text-[11px] text-[--text-tertiary]">
                        Sua senha é usada apenas para autenticar o acesso à sua conta.
                      </p>
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="-mt-1 flex justify-end">
                      <button
                        type="button"
                        className="min-h-11 px-1 text-xs font-semibold text-[--text-brand] hover:underline"
                        onClick={() => switchMode('forgot')}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={isLoading}
                    className="min-h-12 text-base shadow-md"
                    iconRight={<ArrowRight size={17} />}
                  >
                    {content.button}
                  </Button>
                </form>

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[--bg-subtle] px-3 py-2.5">
                  <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-[--success-icon]" />
                  <p className="text-[11px] leading-relaxed text-[--text-tertiary]">
                    O Meu Real não movimenta dinheiro e não solicita senhas bancárias. Você
                    registra e controla as próprias informações.
                  </p>
                </div>

                <p className="mt-7 text-center text-sm text-[--text-secondary]">
                  {mode === 'login' ? (
                    <>
                      Ainda não tem uma conta?{' '}
                      <button
                        type="button"
                        className="min-h-11 font-bold text-[--text-brand] hover:underline"
                        onClick={() => switchMode('register')}
                      >
                        Começar gratuitamente
                      </button>
                    </>
                  ) : (
                    <>
                      Já possui uma conta?{' '}
                      <button
                        type="button"
                        className="min-h-11 font-bold text-[--text-brand] hover:underline"
                        onClick={() => switchMode('login')}
                      >
                        Entrar agora
                      </button>
                    </>
                  )}
                </p>

                <p className="mt-2 text-center text-[11px] leading-relaxed text-[--text-tertiary]">
                  Ao continuar, você concorda com os Termos de uso e a Política de privacidade
                  aplicáveis ao serviço.
                </p>
              </motion.section>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
