# Dossiê de homologação integrada — Meu Real / PR #210

**Data de referência:** 22/11/2026. **Situação:** candidata técnica em revisão (draft); **não autorizada para merge, migração ou deploy manual**.

## O que a suíte de aceitação comprova

O arquivo `src/domain/financialHomologation.test.js` usa somente dados fictícios em memória e exerce seletores reais de Transações, resumo mensal, Money, orçamento, Cartões e auditoria de faturas. A execução só comprova os casos representados; não certifica dados de usuários.

- Atividade de agosto/2026: receitas R$ 1.000,00, despesas R$ 60,04 e resultado do período R$ 939,96. Resultado do período **não** é saldo bancário.
- Competência da fatura agosto/2026: compras/parcelas R$ 120,04, pagamentos líquidos R$ 70,02 (R$ 50,01 + R$ 20,02 − R$ 0,01), pendente R$ 50,02; parcelas futuras R$ 30,02.
- Uma compra feita em julho e com fatura em agosto fica em julho para atividade e em agosto para obrigações. Um vencimento manual em setembro não desloca uma despesa feita em agosto.
- Reservas, cancelamentos e transferências explícitas não inflam despesa de consumo. Pagamento/estorno de fatura não gera nova despesa.
- Os valores monetários são conferidos em centavos; o percentual do orçamento usa tolerância apenas para representação de ponto flutuante.
- A leitura e a auditoria não modificam transações nem eventos. As obrigações parciais são conferidas pelo seletor de pagamentos.

A suíte `e2e/cards-audit.spec.js` verifica abertura/fechamento da auditoria e ausência de overflow horizontal em dispositivos móveis. Os dois textos alterados foram alinhados à interface atual sem retirar as checagens de comportamento.

## Evidência disponível e limites

No SHA `86c24fc793c49b912bfb40742e30c133e64c0d5c`, o CI registrou **528 testes de 528 aprovados** (90 arquivos). A verificação geral desse SHA **falhou exclusivamente no Prettier** de dois arquivos, corrigidos em commit posterior. Portanto, a aprovação da validação completa e dos sete workflows deve ser aferida **no SHA final da PR**, nunca inferida da execução anterior.

Nenhuma base real foi consultada ou conciliada nesta bateria; não há prova de paridade de todos os históricos legados, de dados bancários ou de produção.

## Reexecução dos controles automatizados

- `npm run validate:all` e `npm run format:check`: lint, Vitest, build, Worker, PWA, responsividade e orçamento de performance.
- `npm run test:integration:firebase` e `npm run test:rules`: execução isolada nos Firebase Emulators, incluindo permissões e regras nas suítes existentes.
- `npm run test:e2e`, `npm run test:a11y` e `npm run test:pwa`: fluxos, acessibilidade e comportamento offline.
- `npm run test:backup-recovery`: recuperação em Emulator, não substitui backup de produção.
- Workflows mobile, segurança, performance/PWA, smoke e validação do GitHub Actions devem estar verdes no mesmo HEAD.

## Critérios ainda abertos antes de homologar para produção

1. Confirmar todos os workflows requeridos e as medições de bundle no SHA final, inclusive matriz mobile após a correção de texto.
2. Revalidar P0 MR-001 (Money) e MR-002 (Worker) com **mesmo conjunto de dados, filtros, data e regime**; a suíte atual verifica Money, mas não certifica o Worker em execução.
3. Comprovar idempotência e concorrência de pagamentos e estornos com UID, Firestore Rules e tentativas repetidas, sem usar dados reais.
4. Revisar dados legados, meses curtos, virada do ano, parcelas e estornos na matriz integrada; onde houver inconsistência, propor correção revisável sem escrita automática.
5. Testar manualmente login, Dashboard, Transações, Cartões, Categorias, Orçamentos, Metas, Reservas, Relatórios, Money, Perfil e Admin em desktop e mobile; registrar evidências de vazio, erro, offline e acessibilidade.
6. Confirmar branch protection, revisão humana, plano de impacto, inventário de Rules implantadas, backup, recuperação e rollback antes de qualquer ação na produção.
7. Confrontar a release candidate com o checklist jurídico/comercial vigente, sem considerar a PR draft uma aprovação de lançamento.

**Regra de aceite:** CI integralmente verde no SHA final + paridade financeira e isolamento comprovados + revisão humana e rollback aprovados. Até lá, status **não homologado**.

## Extensão de paridade: Worker, Metas e Reservas

As suítes `src/domain/financialHomologation.test.js`, `src/domain/savings.test.js` e `worker/email-notifications/test/domain.test.js` consomem os mesmos fixtures fictícios definidos em `src/domain/financialHomologationFixture.js`.

- MR-001/MR-002: o Worker e a aplicação verificam receitas, despesas, reservas, saldo e categorias nos mesmos períodos de julho e agosto/2026. Valores de agosto: R$ 1.000,00 de receitas, R$ 60,04 de despesas e R$ 939,96 de resultado.
- MR-004: aportes de R$ 0,10 e R$ 0,20, menos retirada de R$ 0,01, devem resultar em R$ 0,29 na Reserva. Uma meta com saldo inicial de R$ 3,50 deve mostrar R$ 3,79, sem computar transações canceladas ou transferências.
- O domínio de Reservas/Metas agora agrega em centavos inteiros, convertendo para reais apenas na saída. Os testes verificam as mesmas quantias no aplicativo, no Worker e em Relatórios/Money, sem mutação dos fixtures.
- Isto confirma a paridade dos **cenários exercitados pelo CI**, não a implantação efetiva do Worker, a integridade de contas reais nem a correção de todos os registros legados.

A suite ampliada executou **530 testes de aplicação com sucesso** na etapa funcional do CI anterior. A confirmação de todos os workflows permanece condicionada ao HEAD final da PR.
