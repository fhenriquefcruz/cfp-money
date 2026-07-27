# Meu Real — Integração com Telegram · Fase 16

## Dependência obrigatória

A Fase 15 precisa estar aplicada e implantada antes desta fase.

## Entrega

A integração adiciona:

- vinculação por código temporário;
- webhook autenticado por `secret_token`;
- consultas de saldo, resumo e últimos lançamentos;
- criação de receitas e despesas por linguagem natural;
- compras parceladas em cartões cadastrados;
- confirmação ou cancelamento por botões;
- resumo diário;
- resumo semanal;
- alertas de faturas próximas do vencimento;
- desvinculação pelo sistema ou pelo bot.

## Comandos

- `/ajuda`
- `/vincular CODIGO`
- `/saldo`
- `/resumo`
- `/ultimos`
- `/desvincular`

## Segurança

- o token do bot fica no Secret Manager;
- o webhook valida o cabeçalho `X-Telegram-Bot-Api-Secret-Token`;
- o código de vínculo é armazenado apenas como HMAC;
- o Telegram ID é associado a um único UID;
- rascunhos expiram em 15 minutos;
- confirmações são executadas em transação;
- coleções de integração permanecem inacessíveis ao cliente;
- nenhum lançamento é salvo antes da confirmação.

## Coleções

- `integrationLinks`;
- `userIntegrations`;
- `integrationLinkCodes`;
- `telegramDrafts`.

## Agendamento

`telegramDailyDigest` executa diariamente às 8h no fuso `America/Campo_Grande`.

Dependendo das preferências, envia:

- resumo diário;
- resumo semanal nas segundas-feiras;
- alertas de fatura com vencimento nos próximos três dias.

## Limitações atuais

- a interpretação é baseada em regras, não em modelo generativo;
- categorias são inferidas por palavras-chave;
- contas bancárias ainda são texto livre;
- alertas dependem de compras estruturadas com `dueDate`;
- o bot funciona apenas em conversa privada.
