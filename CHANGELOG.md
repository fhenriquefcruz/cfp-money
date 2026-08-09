# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

## [Unreleased]

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
