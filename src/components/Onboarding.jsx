// src/components/Onboarding.jsx — Tour guiado, só no primeiro acesso
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const STORAGE_KEY = (uid) => `cfp_onboarding_done_${uid}`

const STEPS = [
  {
    title: '👋 Bem-vindo ao Meu Real!',
    description: 'Vamos fazer um tour rápido para você conhecer as principais funcionalidades. Leva menos de 1 minuto.',
    highlight: null,
    position: 'center',
  },
  {
    title: '📊 Dashboard',
    description: 'Aqui você vê um resumo completo das suas finanças: saldo, receitas, despesas e gráficos do mês atual.',
    highlight: '[data-tour="dashboard"]',
    position: 'right',
  },
  {
    title: '💸 Transações',
    description: 'Registre entradas e saídas, filtre por mês, categoria e método de pagamento. Suporta parcelamento e receita fixa recorrente.',
    highlight: '[data-tour="transactions"]',
    position: 'right',
  },
  {
    title: '🎯 Metas',
    description: 'Defina objetivos financeiros e acompanhe seu progresso. Quanto falta para a viagem, o carro ou a reserva de emergência?',
    highlight: '[data-tour="goals"]',
    position: 'right',
  },
  {
    title: '📋 Orçamentos',
    description: 'Limite seus gastos por categoria. O sistema avisa quando você está se aproximando ou ultrapassando o limite mensal.',
    highlight: '[data-tour="budgets"]',
    position: 'right',
  },
  {
    title: '📈 Relatórios',
    description: 'Análises detalhadas com gráficos de evolução, distribuição por categoria e exportação CSV. Disponível no plano Premium.',
    highlight: '[data-tour="reports"]',
    position: 'right',
  },
  {
    title: '✅ Tudo pronto!',
    description: 'Você tem 7 dias de experiência Premium gratuita. Explore à vontade e registre sua primeira transação agora!',
    highlight: null,
    position: 'center',
  },
]

export default function Onboarding() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [step, setStep]       = useState(0)

  useEffect(() => {
    if (!user?.uid) return
    const done = localStorage.getItem(STORAGE_KEY(user.uid))
    if (!done) setVisible(true)
  }, [user?.uid])

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY(user.uid), '1')
    setVisible(false)
  }, [user?.uid])

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }
  const prev = () => setStep(s => Math.max(0, s - 1))

  if (!visible) return null

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast  = step === STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        {/* Backdrop escuro com blur */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />

        {/* Card do tour - fundo sólido e legível */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden">

          {/* Barra de progresso */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <motion.div className="h-full bg-[--brand-600] rounded-full"
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }} />
          </div>

          <div className="p-6">
            {/* Fechar */}
            <button onClick={finish}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <X size={16} />
            </button>

            {/* Ícone */}
            <div className="w-12 h-12 rounded-2xl bg-[--brand-100] dark:bg-[--brand-900] flex items-center justify-center mb-4">
              <Sparkles size={20} className="text-[--brand-600] dark:text-[--brand-300]" />
            </div>

            {/* Conteúdo - texto com contraste garantido */}
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{current.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{current.description}</p>

            {/* Passos indicadores */}
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {STEPS.map((_, i) => (
                <div key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-[--brand-600]' : i < step ? 'w-3 bg-[--brand-400]' : 'w-3 bg-gray-300 dark:bg-gray-600'
                  }`} />
              ))}
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              {!isFirst && (
                <button onClick={prev}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronLeft size={15} /> Anterior
                </button>
              )}
              <button onClick={next}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[--brand-600] text-white text-sm font-bold hover:bg-[--brand-700] transition-colors">
                {isLast ? '🎉 Começar!' : (<>Próximo <ChevronRight size={15} /></>)}
              </button>
            </div>

            {!isFirst && (
              <button onClick={finish}
                className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-3 transition-colors">
                Pular tour
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
