const token = process.env.TELEGRAM_BOT_TOKEN
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL

if (!token || !webhookSecret || !webhookUrl) {
  console.error('Defina TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET e TELEGRAM_WEBHOOK_URL.')
  process.exit(1)
}

async function telegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `${method} falhou.`)
  }

  return data.result
}

await telegram('setMyCommands', {
  commands: [
    {
      command: 'ajuda',
      description: 'Ver comandos e exemplos',
    },
    {
      command: 'saldo',
      description: 'Consultar saldo do ciclo',
    },
    {
      command: 'resumo',
      description: 'Consultar resumo financeiro',
    },
    {
      command: 'ultimos',
      description: 'Ver últimos lançamentos',
    },
    {
      command: 'desvincular',
      description: 'Remover vínculo com o Meu Real',
    },
  ],
})

const result = await telegram('setWebhook', {
  url: webhookUrl,
  secret_token: webhookSecret,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: true,
})

console.log('Webhook configurado:', result)
