# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

## [Unreleased]

### Added

- sincronização administrativa protegida entre Firebase Authentication e Firestore, com dry-run, backfill controlado, auditoria de órfãos e exclusão protegida;
- cobertura ampliada de homologação com matriz mobile, acessibilidade, regressão visual, smoke de produção e integração via Firebase Emulator Suite;
- fallback `sparkPrivacy` para persistência do aceite jurídico no Firestore durante a operação no plano Spark.

### Changed

- painel Admin homologado para busca, expansão, Premium, bloqueio e desbloqueio de usuários;
- Dashboard e Transações refinados para maior clareza de métricas, filtros, visões salvas e estados financeiros;
- Money refinado para responder perguntas financeiras sem interpretar consultas como criação de lançamentos;
- experiência mobile e textos de interface refinados após a rodada ampla de homologação;
- documentação de operação, release e LegalGate alinhada ao modo Firebase Spark.

### Fixed

- inconsistências identificadas na homologação ampla de 61 verificações;
- acessibilidade do seletor de cores em Categorias;
- textos, pluralização, percentuais pt-BR e ajustes responsivos apontados durante a homologação.

### Security

- `undici` fixado em 6.28.1 para correção do advisory de produção;
- auditoria automatizada passou a rejeitar divergências na configuração de produção do LegalGate;
- Worker de notificações Premium passa a falhar fechado quando a configuração obrigatória ou o segredo administrativo estiver ausente/inválido.

### Operation

- adicionado gate executável e workflow manual para ativação controlada das notificações Premium, exigindo health pronto e relatório de teste processado antes da liberação da feature flag;
- preflight do Worker de notificações passa a diferenciar configuração pronta/incompleta no endpoint `/health`, sem expor secrets;
- paridade final validada em 13 usuários no Authentication e 13 perfis no Firestore, sem divergências ou duplicidades;
- produção permanece em Firebase Spark, sem Cloud Functions implantadas;
- LegalGate permanece ativo em produção com aceite persistido via Firestore;
- homologação técnica e funcional registrada como concluída;
- lançamento comercial definitivo permanece condicionado à revisão jurídica humana em `docs/LEGAL_REVIEW_CHECKLIST.md`.

## [1.0.0] - 2026-08-09

### Added

- infraestrutura de lint, Prettier, Vitest e Testing Library;
- Error Boundary, rota 404 e code splitting por rota;
- camada inicial de domínio financeiro e repositórios;
- documentação de segurança, contribuição e roadmap;
- controle mensal de pagamentos, com acompanhamento de despesas pagas e pendentes;
- integração do controle de pagamentos com o ciclo de cartões e faturas;
- proteções e validações automatizadas para Firebase App Check e regras do Firestore;
- validações dedicadas de segurança, PWA, responsividade, performance e ambiente de produção.

### Changed

- marca consolidada como Meu Real;
- acesso administrativo passa a exigir custom claim `admin`;
- deploy passa a depender de lint, testes e build;
- operação de produção consolidada no modo Firebase Spark;
- Firebase App Check habilitado e obrigatório no build de produção;
- enforcement do App Check ativado no Firestore e Authentication;
- documentação operacional alinhada ao estado real do ambiente Spark;
- PostCSS atualizado para 8.5.26.

### Fixed

- navegação móvel e comportamento do menu Mais;
- limites mensais do Dashboard passam a respeitar datas locais;
- lançamentos do mês seguinte deixam de contaminar o período selecionado;
- ordenação das transações recentes;
- projeções financeiras do Money nos primeiros dias do ciclo;
- posicionamento da navegação entre meses no Dashboard;
- React Router atualizado para 7.18.2 para correção de vulnerabilidade de segurança.

### Security

- auditoria de dependências de produção endurecida para rejeitar vulnerabilidades conhecidas;
- produção validada com zero vulnerabilidades em `npm audit --omit=dev`;
- nenhuma vulnerabilidade high ou critical permanece na árvore completa;
- guardrails mantêm bloqueadas APIs e dependências incompatíveis com a arquitetura adotada;
- App Check validado em produção no Firestore e Authentication.

### Removed

- arquivo `.env` versionado e autorização administrativa por e-mail no frontend;
- integração com Telegram, incluindo frontend, backend, webhook, secrets, regras, testes e documentação relacionada.

### Operation

- Cloud Functions permanecem versionadas e testadas, mas não implantadas enquanto a produção estiver no modo Spark;
- notificações por e-mail permanecem desabilitadas neste modo;
- deploy de produção permanece no GitHub Pages nesta versão.
