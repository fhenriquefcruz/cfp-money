# Roadmap

## Fundação profissional

- [x] marca Meu Real preservando o caminho legado;
- [x] lint, formatação, testes e pipeline de qualidade;
- [x] carregamento por rota, Error Boundary e 404;
- [x] autorização administrativa baseada em custom claims;
- [x] camada inicial de domínio e repositório;
- [x] concluir decomposição do AppContext por domínio;
  - [x] extrair Metas para GoalsContext;
  - [x] extrair Categorias para CategoriesContext;
  - [x] extrair Cartões para CreditCardsContext;
  - [x] extrair eventos de fatura para InvoiceEventsContext;
  - [x] extrair notificações globais para NotificationsContext;
  - [x] extrair Orçamentos para BudgetsContext;
  - [x] extrair Transações para TransactionsContext;
  - [x] consolidar cálculos derivados em TransactionsContext e remover AppContext;
- [x] migrar operações administrativas para Cloud Functions callable;
  - [x] listar usuários e alterar acessos pelo gateway administrativo;
  - [x] listar e responder atendimentos pelo gateway administrativo;
  - [x] preservar fallback Spark sem expor o caminho principal do backend Firebase;
- [x] testes de integração com Firebase Emulator Suite;
  - [x] integrar Auth, Firestore Rules e Functions callable em projeto demo;
  - [x] executar integração automaticamente no workflow de validação;
- [x] auditoria automatizada de acessibilidade e regressão visual;
  - [x] executar Axe/WCAG 2.2 AA em desktop, mobile e WebKit;
  - [x] versionar baselines visuais das 9 telas principais em desktop e mobile;
  - [x] executar regressão visual automaticamente e publicar relatórios/diffs como artefatos.

## Operação pós-release

- [x] smoke test automatizado após deploy em produção;
  - [x] validar shell público de login em desktop e mobile;
  - [x] validar manifest, service worker e metadados do precache;
  - [x] publicar relatório de falha como artefato do GitHub Actions;

## Homologação e hardening — setembro de 2026

- [x] paridade Firebase Authentication × Firestore concluída;
  - [x] consulta ao Authentication ao vivo no utilitário administrativo;
  - [x] backfill protegido de perfis ausentes;
  - [x] auditoria somente leitura de órfãos;
  - [x] exclusão protegida do único órfão confirmado;
  - [x] estado final validado em 13 Auth / 13 Firestore / 0 divergências / 0 duplicidades;
- [x] homologação do painel Admin em produção;
  - [x] busca e expansão de usuário;
  - [x] ativar e remover Premium;
  - [x] bloquear e desbloquear conta de teste;
- [x] clareza de Dashboard e Transações;
  - [x] diferenciar Poupança total de Poupança mensal;
  - [x] esclarecer Média de gastos · 3 meses;
  - [x] esclarecer Poupança no período;
  - [x] corrigir contador de filtros para não incluir a busca;
  - [x] validar visões salvas, criação, edição, pagamento e exclusão de transação;
- [x] homologação ampla do produto executada;
  - [x] 61 verificações executadas;
  - [x] 49 PASS iniciais;
  - [x] 5 FAIL tratados;
  - [x] 7 WARNING refinados nas fases seguintes;
  - [x] nenhuma divergência financeira confirmada entre módulos comparáveis;
- [x] correções pós-homologação do Money;
  - [x] responder “Quanto gastei este mês?”;
  - [x] responder “Quais são minhas maiores despesas?” sem criar lançamento;
  - [x] responder comparação com o período anterior;
  - [x] responder prioridade financeira atual;
  - [x] impedir que perguntas sejam interpretadas como criação de despesa;
- [x] acessibilidade do seletor de cores em Categorias;
- [x] patch de segurança do `undici` para 6.28.1;
- [x] refinamentos de UX e mobile da homologação;
  - [x] pluralização de resultados e cartões;
  - [x] texto correto de lançamentos disponíveis;
  - [x] percentuais em pt-BR;
  - [x] ajustes responsivos em Relatórios, navegação inferior, visões salvas e período de fatura;
- [x] coerência de produção no modo Firebase Spark;
  - [x] LegalGate ativo com persistência via `sparkPrivacy`;
  - [x] README e Operations Runbook alinhados ao deploy;
  - [x] auditoria automatizada contra divergência de configuração;
- [x] documentação de prontidão de lançamento revisada;
  - [x] homologação técnica registrada como concluída;
  - [x] revisão jurídica final separada corretamente como dependência humana.

## Ativação controlada das notificações Premium — Fase 40

- [x] preflight fail-closed do Worker;
- [x] gate executável para health + execução autenticada + relatório de teste processado;
- [x] testes automatizados do gate;
- [x] workflow manual de ativação sem exposição de secrets;
- [x] checklist de ativação e rollback;
- [ ] implantar/configurar Worker e provedor de e-mail no ambiente externo;
- [ ] executar gate contra produção;
- [ ] confirmar entrega real do relatório de teste;
- [ ] habilitar `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` em PR separado.

## Estado atual

- [x] `main` com CI, segurança, performance/PWA, mobile, acessibilidade, regressão visual e
      deploy aprovados;
- [x] produção mantida em Firebase Spark, sem Cloud Functions implantadas;
- [x] App Check habilitado e obrigatório;
- [x] homologação técnica e funcional concluída;
- [ ] concluir `docs/LEGAL_REVIEW_CHECKLIST.md` com revisão jurídica humana antes do lançamento
      comercial definitivo.
