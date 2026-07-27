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

## 6. Frontend

Durante a configuração, mantenha:

```env
VITE_BACKEND_MODE=disabled
VITE_EMAIL_NOTIFICATIONS_ENABLED=false
```

Depois que `/health` responder com sucesso e um relatório de teste for entregue, altere para:

```env
VITE_EMAIL_NOTIFICATIONS_ENABLED=true
```

Depois publique:

```bash
npm run deploy
```
