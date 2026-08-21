import { backendEnabled } from '../config/runtimeFeatures'
import { adminSetUserAccess as backendAdminSetUserAccess } from './backend'
import { sparkAdminSetUserAccess } from './sparkAdmin'

export const adminSetUserAccess = (data) =>
  backendEnabled ? backendAdminSetUserAccess(data) : sparkAdminSetUserAccess(data)
