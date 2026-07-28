import { auth } from './firebase'
import {
  exportMyData as exportBackendData,
  getPrivacyStatus as getBackendPrivacyStatus,
  recordLegalAcceptance as recordBackendLegalAcceptance,
  requestAccountDeletion as requestBackendDeletion,
  cancelAccountDeletion as cancelBackendDeletion,
} from './backend'
import {
  cancelSparkAccountDeletion,
  exportSparkData,
  getSparkPrivacyStatus,
  recordSparkLegalAcceptance,
  requestSparkAccountDeletion,
} from './sparkPrivacy'
import { backendEnabled } from '../config/runtimeFeatures'

function uid() {
  const value = auth.currentUser?.uid
  if (!value) throw new Error('Usuário não autenticado.')
  return value
}

export const getPrivacyStatus = () =>
  backendEnabled ? getBackendPrivacyStatus() : getSparkPrivacyStatus(uid())

export const recordLegalAcceptance = (data) =>
  backendEnabled ? recordBackendLegalAcceptance(data) : recordSparkLegalAcceptance(uid(), data)

export const exportMyData = () => (backendEnabled ? exportBackendData() : exportSparkData(uid()))

export const requestAccountDeletion = (data) =>
  backendEnabled
    ? requestBackendDeletion(data)
    : requestSparkAccountDeletion(uid(), data?.confirmation)

export const cancelAccountDeletion = () =>
  backendEnabled ? cancelBackendDeletion() : cancelSparkAccountDeletion(uid())
