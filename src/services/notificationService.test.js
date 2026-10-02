import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_SETTINGS_VERSION } from '../domain/emailNotifications'

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db, ...segments) => ({ path: segments.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true })),
}))

vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  setDoc: mocks.setDoc,
  deleteDoc: mocks.deleteDoc,
  onSnapshot: mocks.onSnapshot,
  serverTimestamp: mocks.serverTimestamp,
}))

vi.mock('./firebase', () => ({
  db: { id: 'test-db' },
}))

import { requestEmailNotificationTest } from './notificationService'

function snapshot(data) {
  return {
    exists: () => true,
    data: () => data,
  }
}

describe('requestEmailNotificationTest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setDoc.mockResolvedValue(undefined)
  })

  it('recusa solicitação quando as preferências salvas não têm consentimento válido', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshot({
        enabled: true,
        consentVersion: '',
      }),
    )

    await expect(requestEmailNotificationTest('user-1')).rejects.toThrow(
      /Salve as preferências com consentimento/i,
    )

    expect(mocks.setDoc).not.toHaveBeenCalled()
  })

  it('recusa solicitação quando os envios ainda não estão ativados', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshot({
        enabled: false,
        consentVersion: NOTIFICATION_SETTINGS_VERSION,
      }),
    )

    await expect(requestEmailNotificationTest('user-1')).rejects.toThrow(
      /Salve as preferências com consentimento/i,
    )

    expect(mocks.setDoc).not.toHaveBeenCalled()
  })

  it('cria pedido e subscriber somente com preferências habilitadas e consentidas', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshot({
        enabled: true,
        consentVersion: NOTIFICATION_SETTINGS_VERSION,
      }),
    )

    const id = await requestEmailNotificationTest('user-1')

    expect(id).toMatch(/^test-/)
    expect(mocks.setDoc).toHaveBeenCalledTimes(2)
    expect(mocks.setDoc.mock.calls[0][0]).toEqual({
      path: 'users/user-1/notificationSettings/email',
    })
    expect(mocks.setDoc.mock.calls[1][0]).toEqual({
      path: 'notificationSubscribers/user-1',
    })
  })
})
