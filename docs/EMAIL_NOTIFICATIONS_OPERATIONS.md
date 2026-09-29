# Operação das notificações

## Rotina diária

- verificar falhas no `wrangler tail`;
- conferir o log transacional da Brevo;
- acompanhar uso do Firestore;
- investigar usuários com testes não processados.

## Comandos

```bash
cd worker/email-notifications
npm run tail
```

Saúde:

```bash
curl -i https://SEU-WORKER.workers.dev/health
```

Interpretação:

- HTTP `200` + `"configuration":"ready"`: configuração estática mínima aprovada;
- HTTP `503` + `"configuration":"incomplete"`: Worker não deve processar agendamento nem execução manual;
- o endpoint nunca retorna os valores dos secrets;
- um health verde não comprova conectividade ponta a ponta com Google/Firestore/Brevo; use o endpoint protegido `/activation-test` como gate antes de ligar a feature.

Teste operacional protegido:

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_SEGREDO" \
  https://SEU-WORKER.workers.dev/activation-test
```

O endpoint usa somente o `ACTIVATION_TEST_UID` configurado no Worker. A mensagem confirma a integração Google/Firestore/Brevo sem incluir dados financeiros.

Execução manual protegida:


O endpoint `/run` falha fechado com HTTP `503` se o preflight não estiver pronto e exige um `ADMIN_TRIGGER_SECRET` configurado com pelo menos 32 caracteres. Isso impede autenticação acidental por valores vazios/ausentes.

```bash
curl -X POST   -H "Authorization: Bearer SEU_SEGREDO"   -H "Content-Type: application/json"   -d '{"uid":"UID_OPCIONAL"}'   https://SEU-WORKER.workers.dev/run
```

## Duplicidade

Cada relatório e alerta recebe uma chave determinística. O Worker consulta `notificationDeliveries` antes de enviar.

## Falha da Brevo

Nenhuma entrega é registrada quando a API de e-mail falha. A próxima execução tenta novamente.

## Premium expirado

O Worker consulta o plano antes de ler os dados financeiros e não envia mensagens quando o acesso está inativo.

## Exclusão

Ao atender uma exclusão manual, remova também:

- preferências de notificação do usuário;
- entregas cujo campo `uid` corresponda ao titular;
- dados no provedor de e-mail, quando aplicável.

## Eficiência no plano gratuito

O Worker não percorre todas as contas. Ele consulta apenas `notificationSubscribers`, lê transações somente quando um relatório está vencendo e processa alertas de orçamento pela fila do próprio usuário. Essa arquitetura reduz leituras desnecessárias do Firestore.

O limite `MAX_USERS_PER_RUN` deve ser revisto antes de ultrapassar a escala prevista para o plano gratuito.
