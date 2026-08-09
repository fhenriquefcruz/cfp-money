# Checklist de release

## Código

- [ ] `npm run validate:all`;
- [ ] `npm run format:check`;
- [ ] CI aprovada;
- [ ] dependências revisadas;
- [ ] changelog atualizado.

## Firebase / modo Spark

- [ ] projeto correto selecionado;
- [ ] regras e índices vigentes revisados;
- [ ] `VITE_BACKEND_MODE=disabled`;
- [ ] `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`;
- [ ] `VITE_APP_CHECK_ENABLED=true`;
- [ ] `VITE_REQUIRE_APP_CHECK=true`;
- [ ] `VITE_APP_CHECK_DEBUG=false`;
- [ ] App Check testado em produção;
- [ ] enforcement do App Check validado no Firestore e Authentication;
- [ ] Cloud Functions permanecem não implantadas enquanto a produção estiver no modo Spark;

## Produto

- [ ] login;
- [ ] lançamentos;
- [ ] cartões e faturas;
- [ ] Money;
- [ ] exportação;
- [ ] solicitação e cancelamento de exclusão;
- [ ] painel Admin.

## Comercial

- [ ] identidade jurídica preenchida;
- [ ] Termos e Política revisados;
- [ ] preço e escopo aprovados;
- [ ] SLA definido;
- [ ] suporte e contato publicados;
- [ ] backup e recuperação testados.
