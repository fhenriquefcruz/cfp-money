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
curl https://SEU-WORKER.workers.dev/health
```

Execução manual protegida:

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
