function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function currency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function layout({ title, preheader, content, appUrl }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#172033">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="padding:24px;background:#155eef;color:#ffffff">
<div style="font-size:13px;font-weight:700;opacity:.8">MEU REAL · PREMIUM</div>
<h1 style="margin:8px 0 0;font-size:24px;line-height:1.2">${escapeHtml(title)}</h1>
</td></tr>
<tr><td style="padding:24px">${content}</td></tr>
<tr><td style="padding:20px 24px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#667085">
Este é um e-mail transacional solicitado nas preferências do Meu Real.
<a href="${escapeHtml(appUrl)}" style="color:#155eef">Abra o Perfil</a> para alterar a frequência ou desativar os envios.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export function reportEmail({ name, summary, periodLabel, appUrl, test = false }) {
  const categories = summary.topCategories
    .map(
      (item) => `
<tr>
<td style="padding:8px 0;border-bottom:1px solid #eef0f3">${escapeHtml(item.name)}</td>
<td align="right" style="padding:8px 0;border-bottom:1px solid #eef0f3;font-weight:700">${currency(item.amount)}</td>
</tr>`,
    )
    .join('')

  const content = `
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Olá, ${escapeHtml(name || 'usuário')}.</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475467">${test ? 'Este é um relatório de teste com os dados atuais.' : `Confira o resumo de ${escapeHtml(periodLabel)}.`}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="padding:14px;background:#ecfdf3;border-radius:12px">
<div style="font-size:12px;color:#067647">Receitas</div>
<div style="margin-top:4px;font-size:20px;font-weight:800">${currency(summary.income)}</div>
</td>
<td width="12"></td>
<td style="padding:14px;background:#fef3f2;border-radius:12px">
<div style="font-size:12px;color:#b42318">Despesas</div>
<div style="margin-top:4px;font-size:20px;font-weight:800">${currency(summary.expenses)}</div>
</td>
</tr>
</table>
<div style="margin-top:12px;padding:16px;background:#eff4ff;border-radius:12px">
<div style="font-size:12px;color:#3538cd">Saldo do período</div>
<div style="margin-top:4px;font-size:24px;font-weight:800">${currency(summary.balance)}</div>
</div>
<h2 style="margin:24px 0 8px;font-size:16px">Principais categorias</h2>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${categories || '<tr><td style="padding:8px 0;color:#667085">Nenhuma despesa no período.</td></tr>'}
</table>
<p style="margin:20px 0 0;font-size:12px;color:#667085">${summary.count} lançamento(s) considerado(s).</p>`

  return {
    subject: test ? 'Seu relatório de teste do Meu Real' : 'Seu resumo financeiro do Meu Real',
    html: layout({
      title: test ? 'Relatório de teste' : 'Resumo financeiro',
      preheader: 'Seu resumo financeiro está disponível.',
      content,
      appUrl,
    }),
  }
}

export function alertsEmail({ name, alerts, appUrl }) {
  const items = alerts
    .map(
      (alert) => `
<li style="margin:0 0 12px;padding:14px;background:${alert.level === 'danger' ? '#fef3f2' : '#fffaeb'};border-radius:12px">
<strong>${escapeHtml(alert.title)}</strong>
<div style="margin-top:5px;font-size:13px;line-height:1.5;color:#475467">${escapeHtml(alert.message)}</div>
</li>`,
    )
    .join('')

  return {
    subject: 'Você tem novos alertas financeiros no Meu Real',
    html: layout({
      title: 'Alertas financeiros',
      preheader: 'Há novos avisos sobre orçamento ou metas.',
      appUrl,
      content: `
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Olá, ${escapeHtml(name || 'usuário')}.</p>
<p style="margin:0 0 18px;font-size:14px;color:#475467">Identificamos novos pontos que merecem sua atenção:</p>
<ul style="list-style:none;padding:0;margin:0">${items}</ul>`,
    }),
  }
}

export async function sendEmail(env, { to, name, subject, html, tags = [] }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: env.SENDER_EMAIL,
        name: env.SENDER_NAME || 'Meu Real',
      },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
      replyTo: env.REPLY_TO_EMAIL
        ? {
            email: env.REPLY_TO_EMAIL,
            name: env.SENDER_NAME || 'Meu Real',
          }
        : undefined,
      tags: ['meu-real', 'premium', ...tags],
    }),
  })

  if (!response.ok) {
    throw new Error(`Brevo falhou (${response.status}): ${await response.text()}`)
  }

  return response.json()
}
