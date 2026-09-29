import { runEmailNotificationActivationCheck } from './lib/email-notifications-activation.mjs'

try {
  const result = await runEmailNotificationActivationCheck({
    env: process.env,
  })

  console.log(
    `Gate de ativação aprovado: health=${result.health}, teste=${result.activationTest}, uid=${result.uid}.`,
  )
} catch (error) {
  console.error(`Gate de ativação reprovado: ${error?.message || error}`)
  process.exit(1)
}
