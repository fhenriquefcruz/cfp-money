import React, { useEffect, useState } from 'react'
import { CalendarRange, Save } from 'lucide-react'
import { useMoney } from '../contexts/MoneyContext'
import { Card, Button, Select, Input } from './ui'

export default function MoneySettingsCard() {
  const { settings, isLoading, isSaving, error, saveSettings } = useMoney()
  const [form, setForm] = useState(settings)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const cycleUsesCustomDay = form.cycleType !== 'calendar_month'

  const handleSave = async () => {
    await saveSettings(form)
    setSuccessMessage('Preferências do Money salvas.')
    window.setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[--brand-100] flex items-center justify-center flex-shrink-0">
          <CalendarRange size={17} className="text-[--brand-600]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[--text-primary]">Money · ciclo financeiro</h2>
          <p className="text-xs text-[--text-tertiary] mt-0.5">
            Personalize como o assistente compara seus períodos.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-11 rounded-xl bg-[--bg-hover] animate-pulse" />
          <div className="h-11 rounded-xl bg-[--bg-hover] animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          <Select
            label="Início do ciclo"
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
          )}

          <Select
            label="Comparação padrão"
            value={form.comparisonMode}
            onChange={(event) =>
              setForm((current) => ({ ...current, comparisonMode: event.target.value }))
            }
          >
            <option value="elapsed_days">Mesmo número de dias decorridos</option>
            <option value="full_cycle">Ciclo completo anterior</option>
          </Select>

          <label className="flex items-start gap-3 rounded-xl border border-[--border-default] p-3">
            <input
              type="checkbox"
              checked={form.excludeSavings}
              onChange={(event) =>
                setForm((current) => ({ ...current, excludeSavings: event.target.checked }))
              }
              className="mt-0.5 h-4 w-4 accent-[--brand-600]"
            />
            <span>
              <span className="block text-sm font-medium text-[--text-primary]">
                Não tratar poupança como despesa
              </span>
              <span className="block text-xs text-[--text-tertiary] mt-0.5">
                Aportes continuam registrados, mas não pressionam a análise de consumo.
              </span>
            </span>
          </label>

          {error && <p className="text-xs text-[--danger-text]">{error}</p>}
          {successMessage && <p className="text-xs text-[--success-text]">{successMessage}</p>}

          <Button
            variant="primary"
            fullWidth
            icon={<Save size={15} />}
            loading={isSaving}
            onClick={handleSave}
          >
            Salvar preferências do Money
          </Button>
        </div>
      )}
    </Card>
  )
}
