# Ativação controlada das notificações Premium

## Estado

A infraestrutura de código está pronta para ativação controlada, mas a feature permanece desabilitada no frontend até a validação ponta a ponta.

## Pré-requisitos externos

- [ ] Worker implantado na Cloudflare;
- [ ] remetente validado no provedor de e-mail;
- [ ] `GOOGLE_CLIENT_EMAIL` configurado no Worker;
- [ ] `GOOGLE_PRIVATE_KEY` configurado no Worker;
- [ ] `BREVO_API_KEY` configurado no Worker;
- [ ] `ADMIN_TRIGGER_SECRET` configurado no Worker;
- [ ] `/health` retorna HTTP 200 com `"configuration":"ready"`.

## Gate do GitHub

Cadastre estes secrets no repositório:

- `EMAIL_NOTIFICATIONS_WORKER_URL`;
- `EMAIL_NOTIFICATIONS_ADMIN_SECRET`;
- `EMAIL_NOTIFICATIONS_TEST_UID`.

O segredo administrativo deve ser o mesmo `ADMIN_TRIGGER_SECRET` do Worker. Nunca coloque seu valor em arquivos, logs, issues ou pull requests.

## Teste ponta a ponta

1. mantenha `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`;
2. no Perfil da conta Premium de teste, salve as preferências de e-mail e solicite **Enviar teste**;
3. execute manualmente o workflow **Premium email activation gate**;
4. o gate exige:
   - `/health` pronto;
   - `/run` autenticado;
   - usuário de teste processado;
   - pelo menos 1 relatório de teste processado pelo Worker;
5. confirme no provedor e na caixa de entrada que o e-mail foi realmente entregue.

Também é possível executar localmente:

```bash
EMAIL_NOTIFICATIONS_WORKER_URL=https://SEU-WORKER.workers.dev \
EMAIL_NOTIFICATIONS_ADMIN_SECRET=SEU_SEGREDO \
EMAIL_NOTIFICATIONS_TEST_UID=UID_DE_TESTE \
npm run notifications:activation:check
```

## Liberação da feature

Somente depois do gate aprovado **e** da entrega real confirmada:

- [ ] criar PR separado para alterar `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` no workflow de produção;
- [ ] publicar;
- [ ] executar smoke de produção;
- [ ] validar a interface no Perfil de uma conta Premium;
- [ ] acompanhar a primeira execução agendada e os logs do provedor.

## Rollback

Se houver falha após a ativação:

1. voltar `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`;
2. publicar novamente o frontend;
3. manter o Worker disponível apenas para diagnóstico ou suspender o cron;
4. preservar logs e `notificationDeliveries`;
5. corrigir a causa antes de nova ativação.

A desativação da feature no frontend impede novas solicitações pela interface, mas não substitui a suspensão do Worker quando o problema estiver no processamento agendado.
