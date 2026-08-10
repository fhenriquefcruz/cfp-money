# Checklist de release

## Código

- [x] `npm run validate:all`;
- [x] `npm run format:check`;
- [x] CI aprovada;
- [x] dependências revisadas;
- [x] changelog atualizado.

## Firebase / modo Spark

- [x] projeto correto selecionado;
- [x] regras e índices vigentes revisados;
- [x] `VITE_BACKEND_MODE=disabled`;
- [x] `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`;
- [x] `VITE_APP_CHECK_ENABLED=true`;
- [x] `VITE_REQUIRE_APP_CHECK=true`;
- [x] `VITE_APP_CHECK_DEBUG=false`;
- [x] App Check testado em produção;
- [x] enforcement do App Check validado no Firestore e Authentication;
- [x] Cloud Functions permanecem não implantadas enquanto a produção estiver no modo Spark;

## Produto

- [x] login;
- [x] lançamentos;
- [x] cartões e faturas;
- [x] Money;
- [x] exportação;
- [x] solicitação e cancelamento de exclusão;
- [x] painel Admin.

## Comercial

- [ ] identidade jurídica preenchida;
- [ ] Termos e Política revisados;
- [ ] preço e escopo aprovados;
- [ ] SLA definido;
- [ ] suporte e contato publicados;
- [ ] backup e recuperação testados.

## Evidências de homologação

- Homologação técnica e funcional concluída em 09/08/2026.
- PR #22: `fix: enable secure admin access management on Spark`.
- Merge em `main`: `0b6eaf7ee37d1e645cdea1ae6634d52b3b685712`.
- CI do PR #22: 5 workflows aprovados.
- Deploy GitHub Pages pós-merge: run `31342019330` aprovado.
- Regras do Firestore compiladas e publicadas com sucesso no projeto `cfp-money`.
- Produção mantida em modo Spark, com Cloud Functions não implantadas.
- Smoke tests em produção aprovados: Money, exportação JSON, solicitação/cancelamento de exclusão e painel Admin.
- Painel Admin validado em produção para ativar Premium, remover Premium, bloquear e desbloquear usuário.
