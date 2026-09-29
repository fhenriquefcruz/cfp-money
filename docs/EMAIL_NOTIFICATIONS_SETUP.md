# Implantação das notificações por e-mail

## 1. Brevo

1. crie uma conta;
2. valide um remetente;
3. crie uma chave de API;
4. anote o e-mail de remetente validado.

Nunca use a chave da API no frontend.

## 2. Conta de serviço Google

Crie uma conta de serviço dedicada ao Worker e conceda apenas a função necessária para leitura e gravação no Firestore.

Gere uma chave JSON e extraia somente:

- `client_email`;
- `private_key`.

Não coloque o JSON ou a chave no Git.

## 3. Cloudflare

```bash
cd worker/email-notifications
npm install
npx wrangler login
```

Edite `wrangler.jsonc` e substitua `SENDER_EMAIL`.

Cadastre os secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put ADMIN_TRIGGER_SECRET
```

Para `ADMIN_TRIGGER_SECRET`, use:

```bash
openssl rand -hex 32
```

## 4. Validar

```bash
npm run validate
npm run dev
```

Teste o agendamento local:

```bash
curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"
```

## 5. Implantar

```bash
npm run deploy
```

O Cron Trigger executa a cada quinze minutos.

Após implantar, valide o preflight:

```bash
curl -i https://SEU-WORKER.workers.dev/health
```

O Worker só retorna HTTP `200` com `"configuration":"ready"` quando as variáveis e secrets essenciais passam no preflight local. Configuração ausente ou inválida retorna HTTP `503`. O endpoint não expõe valores de secrets.

O `/health` valida configuração estática; ele não substitui o envio de um relatório de teste para confirmar Google OAuth, Firestore e Brevo ponta a ponta.

## 6. Frontend

Durante a configuração, mantenha:

```env
VITE_BACKEND_MODE=disabled
VITE_EMAIL_NOTIFICATIONS_ENABLED=false
```

Somente depois que `/health` responder HTTP `200` com `"configuration":"ready"` **e** um relatório de teste real for entregue, altere para:

```env
VITE_EMAIL_NOTIFICATIONS_ENABLED=true
```

Depois publique:

```bash
npm run deploy
```
