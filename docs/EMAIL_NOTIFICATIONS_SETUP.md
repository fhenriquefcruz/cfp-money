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

## 3. Secrets do GitHub

Para o deploy automatizado, cadastre no repositório:

- `CLOUDFLARE_API_TOKEN`;
- `GOOGLE_CLIENT_EMAIL`;
- `GOOGLE_PRIVATE_KEY`;
- `BREVO_API_KEY`;
- `EMAIL_NOTIFICATIONS_ADMIN_SECRET`;
- `EMAIL_NOTIFICATIONS_TEST_UID`;
- `EMAIL_NOTIFICATIONS_SENDER_EMAIL`.

`EMAIL_NOTIFICATIONS_ADMIN_SECRET` deve ter pelo menos 32 caracteres. `EMAIL_NOTIFICATIONS_TEST_UID` deve apontar para uma conta real criada exclusivamente para homologação do serviço. O remetente deve estar validado no provedor de e-mail.

## 4. Deploy automatizado

Execute manualmente no GitHub Actions o workflow **Deploy Premium email worker**.

Ele:

1. valida os secrets obrigatórios;
2. valida o Worker;
3. injeta os secrets no Cloudflare durante o deploy;
4. publica o Worker;
5. resolve a URL `workers.dev`;
6. executa o gate protegido `/activation-test`.

O teste operacional lê apenas a conta de teste no Firestore e envia um e-mail sem receitas, despesas, saldos, metas ou orçamentos. Isso valida Google OAuth, Firestore e Brevo sem depender da feature flag do frontend.

## 5. Validação local

Copie `.dev.vars.example` para `.dev.vars` e preencha os secrets locais.

```bash
cd worker/email-notifications
npm install
npm run validate
npm run dev
```

Teste o agendamento local:

```bash
curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"
```

## 6. Validação de produção

Após o deploy:

```bash
curl -i https://SEU-WORKER.workers.dev/health
```

O Worker só retorna HTTP `200` com `"configuration":"ready"` quando as variáveis e secrets essenciais passam no preflight. Configuração ausente ou inválida retorna HTTP `503`. O endpoint não expõe valores de secrets.

O gate de ativação chama `/activation-test`, autenticado pelo segredo administrativo, e exige confirmação de envio para a conta de teste configurada.

## 7. Frontend

Durante toda a configuração, mantenha:

```env
VITE_BACKEND_MODE=disabled
VITE_EMAIL_NOTIFICATIONS_ENABLED=false
```

Somente depois de:

- `/health` pronto;
- workflow **Deploy Premium email worker** aprovado;
- teste operacional entregue na caixa da conta de teste;

abra um PR separado para:

```env
VITE_EMAIL_NOTIFICATIONS_ENABLED=true
```

Depois publique o frontend e execute o smoke de produção.
