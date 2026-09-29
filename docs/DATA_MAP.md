# Mapa de dados

## Documento principal

`users/{uid}`

Contém cadastro, plano, preferências do Money, versões jurídicas aceitas e metadados da conta. A preferência `personalizationEnabled` pode existir dentro de `moneySettings`; o perfil comportamental derivado não é persistido.

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


## Personalização do Money

Quando autorizada pelo usuário, a personalização é calculada em tempo de execução a partir das transações da própria conta. Categorias predominantes, forma de pagamento frequente, descrições repetidas e nível de confiança não criam uma nova coleção nem um documento de perfil persistente.
