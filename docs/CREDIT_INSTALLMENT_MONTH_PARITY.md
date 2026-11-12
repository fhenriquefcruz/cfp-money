# Cartões e Transações — paridade mensal de parcelas

## Contrato funcional

Uma compra em cartão tem uma data de aquisição (`purchaseDate`), um cartão vinculado por `cardId` e uma série de obrigações por fatura. Cada parcela gravada conserva `installmentGroupId`, `installmentNum`, `installmentOf`, `dueDate` e `invoiceMonth`.

- **Cartões:** os valores devidos são agrupados por `invoiceMonth`. A liquidação é controlada pelos eventos da fatura e não cria nova despesa.
- **Transações / Vencimentos:** as parcelas são agrupadas pelo vencimento; outros lançamentos continuam pela atividade. Este resumo não é saldo bancário.
- **Transações / Compras:** a atividade da aquisição conserva `purchaseDate` e apresenta a compra no seu período original. Dashboard e Orçamentos mantêm o regime próprio de atividade de compra.
- **Valores:** um total de R$ 100,00 em 3 vezes gera 33,34 + 33,33 + 33,33, preservando 10.000 centavos.
- **Calendário:** fechamento e vencimento cadastrados em Cartões determinam a primeira fatura. Uma compra em novembro pode começar em novembro ou dezembro, conforme o ciclo; não se supõe uma competência fixa.

## Evidência sintética coberta na PR #167

Compra em 05/11/2026, cartão com fechamento em dia 10 e vencimento em dia 20, parcelada em 3 vezes:

- 1/3: fatura novembro de 2026
- 2/3: fatura dezembro de 2026
- 3/3: fatura janeiro de 2027

Há testes unitários do cadastro e dos seletores de fatura e extrato, inclusive virada de ano e recomposição de centavos, e teste Playwright mobile de ponta a ponta sem Firebase real.

## Histórico existente e segurança

Séries com documentos ausentes ou duplicados são apenas **sinalizadas para revisão**. Isso não prova que uma parcela foi cobrada ou perdida, nem autoriza geração automática de transações. Antes de corrigir dados históricos é necessário consultar os documentos originais, confirmar UID e cartão, planejar backup/rollback e obter autorização explícita. Não inferir `cardId` pelo nome ou pelos quatro dígitos finais.

O teste combinado das PRs financeiras #162–#164 com #167 passou com 448 testes unitários (78 arquivos), além dos testes complementares de Worker, regras Firestore e recuperação. O JavaScript total medido no preflight de 12/11/2026 foi **740,58 KiB gzip**, sob o limite de 741,00 KiB, sem ampliação do orçamento.

A composição gráfica de categorias permanece no Dashboard e não é duplicada no extrato. As quatro imagens visuais de Cartões/Transações revisadas inicialmente e as duas atualizações posteriores de Transações foram geradas em CI e versionadas na branch da PR #167.

**Estado:** PR em draft; os testes do SHA final e a integração com a produção exigem confirmação. Nenhum merge, deploy, regra, migração ou dado real foi alterado por este trabalho.
