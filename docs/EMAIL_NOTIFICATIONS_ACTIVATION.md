# Ativação controlada das notificações Premium

## Estado

A infraestrutura foi ativada de forma controlada em 29/09/2026. O Worker foi implantado, o gate protegido passou, a entrega real do e-mail operacional foi confirmada e o frontend de produção está publicado com `VITE_EMAIL_NOTIFICATIONS_ENABLED=true`.

## Pré-requisitos externos

- [x] conta Cloudflare com API token para Workers;
- [x] remetente validado no provedor de e-mail;
- [x] conta de serviço Google dedicada ao Worker;
- [x] conta de teste existente no Firestore;
- [x] secrets de deploy cadastrados no GitHub.

## Secrets do GitHub

Cadastre:

- `CLOUDFLARE_API_TOKEN`;
- `GOOGLE_CLIENT_EMAIL`;
- `GOOGLE_PRIVATE_KEY`;
- `BREVO_API_KEY`;
- `EMAIL_NOTIFICATIONS_ADMIN_SECRET`;
- `EMAIL_NOTIFICATIONS_TEST_UID`;
- `EMAIL_NOTIFICATIONS_SENDER_EMAIL`.

Opcionalmente, para rerodar somente o gate sem novo deploy, também pode ser cadastrado `EMAIL_NOTIFICATIONS_WORKER_URL`.

Nunca coloque valores de secrets em arquivos, logs, issues ou pull requests.

### Bootstrap seguro no Codespaces / Linux

Na raiz do repositório:

```bash
bash ./scripts/configure-email-notifications-secrets.sh
```

No GitHub Codespaces, `gh` normalmente já está instalado e autenticado. O script solicita os valores sensíveis sem exibi-los no terminal, lê o JSON da conta de serviço Google localmente, gera o segredo administrativo e dispara o workflow de deploy.

Use `SKIP_DEPLOY=true` se quiser apenas cadastrar/verificar os secrets:

```bash
SKIP_DEPLOY=true bash ./scripts/configure-email-notifications-secrets.sh
```

### Bootstrap seguro no Windows

Com o GitHub CLI autenticado, execute na raiz do repositório:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure-email-notifications-secrets.ps1
```

O script:

1. lê `client_email` e `private_key` diretamente do JSON da conta de serviço;
2. solicita Cloudflare e Brevo em prompts ocultos;
3. gera automaticamente um `EMAIL_NOTIFICATIONS_ADMIN_SECRET` criptograficamente aleatório;
4. solicita apenas o UID da conta de teste e o remetente validado;
5. envia os valores ao GitHub CLI por stdin, sem colocá-los nos argumentos do processo;
6. confirma a presença dos 7 secrets;
7. dispara o workflow **Deploy Premium email worker**.

Use `-SkipDeploy` se quiser apenas cadastrar/verificar os secrets.

## Teste operacional protegido

O gate protegido foi executado antes da liberação do frontend. Para manutenção ou novo deploy do Worker, execute o workflow **Deploy Premium email worker**; ele valida o serviço e roda o gate independentemente do estado da interface.

Depois do deploy, o workflow:

1. exige `/health` pronto;
2. chama `POST /activation-test` com autenticação administrativa;
3. usa exclusivamente o `ACTIVATION_TEST_UID` configurado no Worker;
4. lê a conta de teste no Firestore;
5. envia uma mensagem operacional pelo provedor;
6. não inclui dados financeiros.

Esse fluxo evita depender do botão **Enviar teste** da interface antes da feature estar habilitada.

Para rerodar apenas o gate, use o workflow **Premium email activation gate** ou o comando local:

```bash
EMAIL_NOTIFICATIONS_WORKER_URL=https://SEU-WORKER.workers.dev \
EMAIL_NOTIFICATIONS_ADMIN_SECRET=SEU_SEGREDO \
EMAIL_NOTIFICATIONS_TEST_UID=UID_DE_TESTE \
npm run notifications:activation:check
```

## Liberação da feature

Gate protegido aprovado e entrega real do e-mail operacional confirmada em 29/09/2026. A partir deste ponto:

- [x] habilitar `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` em produção;
- [x] publicar o frontend;
- [x] executar smoke de produção;
- [ ] validar a interface no Perfil de uma conta Premium;
- [ ] salvar preferências com consentimento;
- [ ] solicitar o primeiro relatório de teste pela interface somente após salvar as preferências com consentimento versionado;
- [ ] acompanhar a primeira execução agendada e os logs do provedor.

## Rollback

Se houver falha após a ativação:

1. voltar `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`;
2. publicar novamente o frontend;
3. suspender o cron do Worker se o problema estiver no processamento;
4. preservar logs e `notificationDeliveries`;
5. corrigir a causa antes de nova ativação.
