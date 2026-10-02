import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmailNotificationsCard from './EmailNotificationsCard'
import {
  DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_VERSION,
} from '../domain/emailNotifications'

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  requestTest: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'premium-user',
      email: 'premium@example.com',
      emailVerified: true,
    },
  }),
}))

vi.mock('../contexts/PlanContext', () => ({
  usePlan: () => ({
    isLoading: false,
    status: { isPremium: true },
  }),
}))

vi.mock('../config/runtimeFeatures', () => ({
  emailNotificationsEnabled: true,
}))

vi.mock('../services/notificationService', () => ({
  getEmailNotificationSettings: mocks.getSettings,
  saveEmailNotificationSettings: mocks.saveSettings,
  requestEmailNotificationTest: mocks.requestTest,
}))

describe('EmailNotificationsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSettings.mockResolvedValue({ ...DEFAULT_EMAIL_NOTIFICATION_SETTINGS })
    mocks.saveSettings.mockResolvedValue(undefined)
    mocks.requestTest.mockResolvedValue('test-request')
  })

  it('só libera o teste depois de salvar preferências com consentimento', async () => {
    const user = userEvent.setup()

    render(<EmailNotificationsCard />)

    await screen.findByText('Destinatário protegido')

    const enable = screen.getByRole('checkbox', { name: /Ativar relatórios e alertas/i })
    const consent = screen.getByRole('checkbox', { name: /Autorizo o Meu Real/i })
    const save = screen.getByRole('button', { name: /Salvar preferências/i })
    const sendTest = screen.getByRole('button', { name: /Enviar teste/i })

    expect(sendTest).toBeDisabled()

    await user.click(enable)
    expect(sendTest).toBeDisabled()
    expect(save).toBeDisabled()

    await user.click(consent)
    expect(save).toBeEnabled()
    expect(sendTest).toBeDisabled()

    await user.click(save)

    await waitFor(() => {
      expect(mocks.saveSettings).toHaveBeenCalledTimes(1)
    })

    const [, payload] = mocks.saveSettings.mock.calls[0]
    expect(payload).toMatchObject({
      enabled: true,
      consentVersion: NOTIFICATION_SETTINGS_VERSION,
    })

    await waitFor(() => expect(sendTest).toBeEnabled())

    await user.click(sendTest)

    await waitFor(() => {
      expect(mocks.requestTest).toHaveBeenCalledWith('premium-user')
    })

    expect(
      screen.getByText(/Relatório de teste solicitado\. O processamento pode levar até 15 minutos/i),
    ).toBeInTheDocument()
  })

  it('mantém teste habilitado quando o consentimento já está persistido', async () => {
    mocks.getSettings.mockResolvedValue({
      ...DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
      enabled: true,
      consentVersion: NOTIFICATION_SETTINGS_VERSION,
      consentAt: new Date('2026-10-01T12:00:00-04:00'),
    })

    render(<EmailNotificationsCard />)

    const sendTest = await screen.findByRole('button', { name: /Enviar teste/i })
    expect(sendTest).toBeEnabled()
  })
})
