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
- [ ] migrar operações administrativas para Cloud Functions callable;
- [ ] testes de integração com Firebase Emulator Suite;
- [ ] auditoria automatizada de acessibilidade e regressão visual.
