# Checklist de release

## Status atual

- **Prontidão técnica:** concluída para a release candidate atual.
- **Lançamento comercial:** condicionado à conclusão da revisão jurídica formal em `docs/LEGAL_REVIEW_CHECKLIST.md`.
- Produção mantida em **Firebase Spark**, sem Cloud Functions implantadas.

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
- [x] `VITE_ENFORCE_LEGAL_GATE=true`;
- [x] App Check testado em produção;
- [x] enforcement do App Check validado no Firestore e Authentication;
- [x] aceite jurídico persistido pelo fallback Spark no Firestore;
- [x] Cloud Functions permanecem não implantadas enquanto a produção estiver no modo Spark.

## Produto

- [x] login;
- [x] lançamentos;
- [x] cartões e faturas;
- [x] Money;
- [x] exportação;
- [x] solicitação e cancelamento de exclusão;
- [x] painel Admin.

## Comercial / configuração

- [x] identidade jurídica configurada no produto;
- [x] Termos e Política publicados e versionados;
- [x] preço e escopo definidos;
- [x] SLA operacional definido;
- [x] suporte e contato publicados;
- [x] backup e recuperação testados;
- [ ] revisão jurídica formal concluída — ver `docs/LEGAL_REVIEW_CHECKLIST.md`.

> Os itens acima confirmam configuração e prontidão operacional. Eles não substituem a validação jurídica formal dos documentos e obrigações aplicáveis.

## Evidências de homologação atual

- Homologação ampla executada em 28/09/2026: 61 verificações, com 49 PASS, 5 FAIL e 7 WARNING na primeira rodada.
- Os 5 FAIL foram tratados na PR #72 — **Phase 33: fix homologation findings**.
- O advisory de produção do `undici` foi corrigido para a versão 6.28.1 na PR #74 — **Phase 33B: patch undici production advisory**.
- Os warnings objetivos de UX/mobile foram tratados na PR #75 — **Phase 34: homologation UX and mobile refinements**.
- A configuração do LegalGate em produção foi alinhada ao modo Spark na PR #77 — **Phase 35: align production legal gate configuration**.
- Release candidate atual em `main`: `13e26dbc568cb54cf849e9fa1764122567f12642`.
- Produção permanece em modo Spark, com Cloud Functions não implantadas.
- O LegalGate permanece ativo em produção e registra o aceite jurídico no Firestore pelo fallback Spark.
- O painel Admin e os fluxos financeiros principais foram homologados em produção.

## Pendência humana de lançamento

A aplicação está tecnicamente homologada e com CI verde, mas o lançamento comercial definitivo depende da conclusão documentada de `docs/LEGAL_REVIEW_CHECKLIST.md`. Enquanto esse checklist permanecer aberto, não trate a revisão jurídica como concluída.
