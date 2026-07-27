const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const BACKEND_MODE =
  normalize(import.meta.env.VITE_BACKEND_MODE) ||
  'disabled'

export const backendEnabled =
  BACKEND_MODE === 'firebase'

export const telegramEnabled =
  backendEnabled &&
  normalize(
    import.meta.env.VITE_TELEGRAM_ENABLED,
  ) === 'true'

export const emailNotificationsEnabled =
  normalize(
    import.meta.env
      .VITE_EMAIL_NOTIFICATIONS_ENABLED,
  ) === 'true'

export const sparkMode = !backendEnabled
