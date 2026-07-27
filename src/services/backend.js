import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'
import { app } from './firebase'

const REGION = 'southamerica-east1'
const functions = getFunctions(app, REGION)

let emulatorConnected = false

if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true' &&
  !emulatorConnected
) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  emulatorConnected = true
}

function callable(name) {
  return httpsCallable(functions, name)
}

export async function getBackendStatus() {
  const result = await callable('getBackendStatus')()
  return result.data
}

export async function getAccountEntitlement() {
  const result = await callable('getAccountEntitlement')()
  return result.data
}

export async function adminSetUserAccess(command) {
  const result = await callable('adminSetUserAccess')(command)
  return result.data
}

export async function createTelegramLinkCode() {
  const result = await callable('createIntegrationLinkCode')({
    provider: 'telegram',
  })

  return result.data
}

export async function getTelegramIntegrationStatus() {
  const result = await callable(
    'getTelegramIntegrationStatus',
  )()

  return result.data
}

export async function updateTelegramPreferences(
  preferences,
) {
  const result = await callable(
    'updateTelegramPreferences',
  )(preferences)

  return result.data
}

export async function unlinkTelegramIntegration() {
  const result = await callable(
    'unlinkTelegramIntegration',
  )()

  return result.data
}

export async function getPrivacyStatus() {
  const result = await callable('getPrivacyStatus')()
  return result.data
}

export async function recordLegalAcceptance(data) {
  const result = await callable(
    'recordLegalAcceptance',
  )(data)
  return result.data
}

export async function exportMyData() {
  const result = await callable('exportMyData')()
  return result.data
}

export async function requestAccountDeletion(data) {
  const result = await callable(
    'requestAccountDeletion',
  )(data)
  return result.data
}

export async function cancelAccountDeletion() {
  const result = await callable(
    'cancelAccountDeletion',
  )()
  return result.data
}

export async function getCommercialMetrics() {
  const result = await callable(
    'getCommercialMetrics',
  )()
  return result.data
}
