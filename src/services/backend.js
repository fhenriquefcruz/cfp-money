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
