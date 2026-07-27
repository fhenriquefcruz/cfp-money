# Fase 19 — Spark e notificações Premium

## Objetivo

Manter o Meu Real funcional sem Cloud Functions pagas e adicionar uma infraestrutura gratuita para relatórios e alertas por e-mail.

## Entregas

- modo Spark explícito;
- bloqueio local das chamadas para Functions inexistentes;
- privacidade e exportação pelo navegador;
- solicitação manual de exclusão;
- Telegram preservado, mas desativado no modo gratuito;
- preferências de e-mail no Perfil;
- relatórios semanal, quinzenal e mensal;
- alertas de orçamento e metas;
- prevenção de mensagens duplicadas;
- Worker da Cloudflare;
- integração transacional com Brevo;
- proteção Premium no frontend e no Worker.

## Regra Premium

Relatórios, alertas e testes por e-mail são processados somente quando:

1. o usuário está com Premium ou trial ativo;
2. a conta não está bloqueada;
3. o envio está ativado;
4. existe consentimento na versão atual;
5. o endereço de destino é o e-mail da conta.

Quando o Premium termina, os envios são suspensos e as preferências permanecem preservadas.

## Dados

As preferências ficam em:

`users/{uid}/notificationSettings/email`

A inscrição ativa fica em:

`notificationSubscribers/{uid}`

Alertas de orçamento aguardam processamento em:

`users/{uid}/notificationQueue/{alertId}`

Os registros técnicos de entrega ficam em:

`notificationDeliveries/{hash}`

A coleção de entregas não é acessível pelo navegador.
