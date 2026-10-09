# Mapa de dados

## Documento principal

`users/{uid}`

Contém cadastro, plano, preferências do Money, versões jurídicas aceitas e metadados da conta.

## Subcoleções do usuário

- `transactions`;
- `creditCards`;
- `invoiceEvents`;
- `goals`;
- `budgets`;
- demais subcoleções criadas pelo produto.

## Coleções globais

- `categories`: categorias padrão e categorias próprias identificadas por `ownerUid`;
- `adminAudit`: ações administrativas;
- `integrationLinkCodes`: códigos temporários em HMAC;
- `userIntegrations`: vínculo por UID;
- `privacyConsents`: histórico de aceites;
- `accountDeletionRequests`: solicitações em prazo de segurança;
- `privacyAudit`: confirmação pseudonimizada de exclusões concluídas.

## Exclusão

A rotina remove dados do usuário, categorias próprias, integrações, rascunhos, consentimentos identificáveis e a identidade no Firebase Authentication. O registro final utiliza hash do UID.


## Poupança e reservas — Fase 45

Poupança continua armazenada em `users/{uid}/transactions`; não existe uma coleção paralela de
saldo. Transações com `isSavings=true` podem incluir:

- `savingsMovement`: depósito ou retirada;
- `savingsDestination`: destino/caixinha/reserva;
- `savingsInstitution`: instituição opcional;
- `goalId`: meta opcional associada.

O saldo reservado é derivado do histórico de movimentos. Registros anteriores à Fase 45, sem
esses campos, continuam válidos como depósitos em **Reserva não classificada**.

Como os novos atributos pertencem à coleção `transactions`, os fluxos existentes de exportação,
exclusão e backup continuam cobrindo esses dados sem criar uma nova superfície de persistência.
