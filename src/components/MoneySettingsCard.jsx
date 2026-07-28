import React, { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Save, Info, ShieldCheck, GitCompareArrows, PiggyBank } from 'lucide-react'
import { useMoney } from '../contexts/MoneyContext'
import { Card, Button, Select, Input } from './ui'
import PremiumGate from './PremiumGate'

function FieldGuide({ icon: Icon, title, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-subtle] p-3.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[--brand-100] text-[--brand-600]">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs font-bold text-[--text-primary]">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[--text-tertiary]">{children}</p>
      </div>
    </div>
  )
}

function MoneySettingsContent() {
  const { settings, isLoading, isSaving, error, saveSettings } = useMoney()
  const [form, setForm] = useState(settings)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const cycleUsesCustomDay = form.cycleType !== 'calendar_month'

  const cycleDescription = useMemo(() => {
    if (form.cycleType === 'salary_cycle') {
      return `O Money considerará o dia ${form.cycleStartDay || 1} como início do seu mês financeiro, alinhando a análise ao recebimento principal.`
    }

    if (form.cycleType === 'custom_cycle') {
      return `O ciclo começará todo mês no dia ${form.cycleStartDay || 1}, independentemente da data do salário.`
    }

    return 'O Money analisará cada mês do primeiro ao último dia do calendário.'
  }, [form.cycleStartDay, form.cycleType])

  const comparisonDescription =
    form.comparisonMode === 'full_cycle'
      ? 'O período atual será comparado com todo o ciclo anterior. Essa opção é melhor para análises de fechamento.'
      : 'O Money compara apenas a mesma quantidade de dias já transcorridos. Exemplo: dias 1 a 15 contra dias 1 a 15 do ciclo anterior.'

  const handleSave = async () => {
    try {
      await saveSettings(form)
      setSuccessMessage('Preferências do Money salvas.')
      window.setTimeout(() => setSuccessMessage(''), 3000)
    } catch {
      // O contexto já apresenta a mensagem de erro.
    }
  }

  return (
    <Card className="overflow-hidden shadow-sm" padding={false}>
      <div className="border-b border-[--border-subtle] bg-gradient-to-r from-[--brand-50] to-[--bg-surface] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[--brand-600] text-white shadow-sm">
            <CalendarRange size={19} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-[--text-primary]">
                Money · ciclo financeiro
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-800">
                Premium
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[--text-tertiary]">
              Defina como o assistente interpreta e compara seus períodos.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-start gap-3 rounded-2xl border border-[--brand-200] bg-[--brand-50] p-4">
          <Info size={17} className="mt-0.5 flex-shrink-0 text-[--brand-600]" />
          <div>
            <p className="text-xs font-bold text-[--brand-700]">
              Essas opções não alteram seus lançamentos
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[--brand-600]">
              O Money usa estas preferências somente para montar comparações, projeções e
              relatórios. Datas, valores e registros já cadastrados permanecem exatamente como foram
              inseridos.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-24 rounded-2xl bg-[--bg-hover] animate-pulse" />
            <div className="h-24 rounded-2xl bg-[--bg-hover] animate-pulse" />
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-[--border-default] p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarRange size={15} className="text-[--brand-600]" />
                <h3 className="text-sm font-bold text-[--text-primary]">Início do ciclo</h3>
              </div>
              <Select
                aria-label="Início do ciclo financeiro"
                value={form.cycleType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cycleType: event.target.value }))
                }
              >
                <option value="calendar_month">Primeiro dia do mês</option>
                <option value="salary_cycle">Dia do recebimento principal</option>
                <option value="custom_cycle">Dia personalizado</option>
              </Select>

              {cycleUsesCustomDay && (
                <div className="mt-3">
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    label={
                      form.cycleType === 'salary_cycle'
                        ? 'Dia do recebimento principal'
                        : 'Dia de início do ciclo'
                    }
                    value={form.cycleStartDay}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cycleStartDay: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              )}

              <p className="mt-3 text-[11px] leading-relaxed text-[--text-tertiary]">
                {cycleDescription}
              </p>
            </section>

            <section className="rounded-2xl border border-[--border-default] p-4">
              <div className="mb-3 flex items-center gap-2">
                <GitCompareArrows size={15} className="text-[--brand-600]" />
                <h3 className="text-sm font-bold text-[--text-primary]">Comparação padrão</h3>
              </div>
              <Select
                aria-label="Modo de comparação do Money"
                value={form.comparisonMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    comparisonMode: event.target.value,
                  }))
                }
              >
                <option value="elapsed_days">Mesmo número de dias decorridos</option>
                <option value="full_cycle">Ciclo completo anterior</option>
              </Select>
              <p className="mt-3 text-[11px] leading-relaxed text-[--text-tertiary]">
                {comparisonDescription}
              </p>
            </section>

            <section className="rounded-2xl border border-[--border-default] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.excludeSavings}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      excludeSavings: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-[--brand-600]"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-[--text-primary]">
                    <PiggyBank size={15} className="text-[--brand-600]" />
                    Não tratar poupança como despesa
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-[--text-tertiary]">
                    O aporte continua registrado normalmente, mas deixa de aumentar o total de
                    consumo analisado pelo Money.
                  </span>
                </span>
              </label>
            </section>

            <div className="grid gap-3 md:grid-cols-3">
              <FieldGuide icon={CalendarRange} title="Ciclo">
                Determina onde começa e termina o período financeiro analisado.
              </FieldGuide>
              <FieldGuide icon={GitCompareArrows} title="Comparação">
                Define qual intervalo anterior será usado como referência.
              </FieldGuide>
              <FieldGuide icon={ShieldCheck} title="Preservação">
                Nenhuma escolha modifica transações, categorias ou saldos.
              </FieldGuide>
            </div>

            {error && <p className="text-xs text-[--danger-text]">{error}</p>}
            {successMessage && (
              <p className="text-xs font-medium text-[--success-text]">{successMessage}</p>
            )}

            <Button
              variant="primary"
              fullWidth
              icon={<Save size={15} />}
              loading={isSaving}
              onClick={handleSave}
            >
              Salvar preferências do Money
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

export default function MoneySettingsCard() {
  return (
    <PremiumGate
      variant="card"
      feature="Configurações personalizadas do Money"
      description="Personalize o ciclo financeiro e a forma como o Money compara seus gastos."
      benefits={[
        'Ciclo baseado no salário',
        'Comparação equivalente de períodos',
        'Projeções mais fiéis ao perfil',
        'Preferências preservadas mesmo após expiração',
      ]}
    >
      <MoneySettingsContent />
    </PremiumGate>
  )
}
