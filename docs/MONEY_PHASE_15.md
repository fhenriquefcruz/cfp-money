# Meu Real — Backend, Segurança Comercial e Fundação de Integrações · Fase 15

## Objetivo

## Cloud Functions

A fase adiciona funções chamáveis na região `southamerica-east1`:

- `getBackendStatus`;
- `getAccountEntitlement`;
- `adminSetUserAccess`;
- `createIntegrationLinkCode`.

## Administração segura

Ativação, remoção de Premium e bloqueio deixam de ser gravados diretamente pelo navegador.

A função `adminSetUserAccess`:

- exige autenticação;
- exige a custom claim `admin: true`;
- valida o prazo;
- atualiza o usuário em transação;
- registra auditoria em `adminAudit`;
- preserva o prazo restante ao renovar uma assinatura ativa.

`createIntegrationLinkCode` gera um código temporário:

- válido por 10 minutos;
- disponível apenas para Premium ativo;
- armazenado apenas como HMAC;
- associado ao UID do Firebase;

O código puro não é salvo no Firestore.

## App Check

O cliente inicializa App Check com reCAPTCHA Enterprise quando a variável abaixo estiver preenchida:

`VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`

A aplicação das funções é controlada pelo parâmetro:

`ENFORCE_APP_CHECK`

O valor padrão é `false`, permitindo implantar e observar as métricas primeiro. Depois da configuração no console, o parâmetro deve ser alterado para `true`.

## Firestore

As regras passam a:

- impedir que um usuário crie o próprio documento já como Premium;
- retirar atualização administrativa direta pelo navegador;
- manter administradores com leitura dos usuários;
- bloquear acesso cliente a `adminAudit`, `integrationLinkCodes` e `integrationLinks`.

O Admin SDK das Cloud Functions ignora as regras de cliente e executa as operações autorizadas no backend.

## Transferibilidade

A estrutura separa:

- frontend;
- backend;
- segredos;
- regras;
- auditoria;
- integrações.

Isso reduz a dependência do desenvolvedor original em uma futura cessão integral do ativo.

## Requisitos para implantação

- projeto Firebase no plano Blaze;
- Firebase CLI autenticada;
- dependências da pasta `functions` instaladas;
- custom claim `admin: true` no administrador;
- reCAPTCHA Enterprise recomendado antes de ativar a exigência do App Check.
