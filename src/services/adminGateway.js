import {
  adminListUsers as backendAdminListUsers,
  adminSetUserAccess as backendAdminSetUserAccess,
} from './backend'

export const adminListUsers = () => backendAdminListUsers()

export const adminSetUserAccess = (data) =>
  backendAdminSetUserAccess(data)
