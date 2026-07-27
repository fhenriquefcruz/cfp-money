import { describe, expect, it } from 'vitest'
import {
  canEnableEmailNotifications,
  DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  normalizeEmailNotificationSettings,
} from './emailNotifications'

describe('preferências de e-mail', () => {
  it('normaliza frequência e horários', () => {
    const result =
      normalizeEmailNotificationSettings({
        enabled: true,
        frequency: 'invalid',
        weekday: 99,
        monthDay: 31,
        reportHour: 2,
      })

    expect(result.frequency).toBe('weekly')
    expect(result.weekday).toBe(7)
    expect(result.monthDay).toBe(28)
    expect(result.reportHour).toBe(6)
  })

  it('mantém somente limites suportados', () => {
    const result =
      normalizeEmailNotificationSettings({
        budgetThresholds: [90, 12, 70, 90],
      })

    expect(result.budgetThresholds).toEqual([
      70, 90,
    ])
  })

  it('exige consentimento versionado', () => {
    expect(
      canEnableEmailNotifications(
        DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
      ),
    ).toBe(false)

    expect(
      canEnableEmailNotifications({
        consentVersion: '1.0.0',
      }),
    ).toBe(true)
  })
})
