import { backendEnabled } from '../config/runtimeFeatures'
import {
  adminListSupportRequests as backendAdminListSupportRequests,
  adminListUsers as backendAdminListUsers,
  adminRespondSupportRequest as backendAdminRespondSupportRequest,
  adminSetUserAccess as backendAdminSetUserAccess,
} from './backend'
import {
  sparkAdminListSupportRequests,
  sparkAdminListUsers,
  sparkAdminRespondSupportRequest,
  sparkAdminSetUserAccess,
} from './sparkAdmin'

export const adminListUsers = () =>
  backendEnabled ? backendAdminListUsers() : sparkAdminListUsers()

export const adminSetUserAccess = (data) =>
  backendEnabled ? backendAdminSetUserAccess(data) : sparkAdminSetUserAccess(data)

export const adminListSupportRequests = () =>
  backendEnabled ? backendAdminListSupportRequests() : sparkAdminListSupportRequests()

export const adminRespondSupportRequest = (data) =>
  backendEnabled ? backendAdminRespondSupportRequest(data) : sparkAdminRespondSupportRequest(data)
