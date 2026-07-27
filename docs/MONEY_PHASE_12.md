# Money — Estabilização Financeira e Qualidade · Fase 12

## Correções financeiras

- poupança não é mais somada às receitas;
- poupança não altera o saldo corrente;
- o resumo financeiro passa a retornar `savings`;
- o saldo total reutiliza a mesma regra central;
- a taxa de poupança dos relatórios e do indicador usa depósitos explícitos;
- parcelamentos manuais distribuem centavos sem alterar o total original.

## Semântica de datas

Foram centralizados três conceitos:

- data da compra;
- data contábil ou vencimento;
- data usada no histórico de atividade.

Compras estruturadas no cartão exibem a data real da compra e informam separadamente a data da fatura. Os filtros mensais continuam usando a competência financeira já existente.

## Proteção temporária de séries

Até a gestão de grupos da Fase 13, uma parcela pertencente a uma série não poderá ser editada ou excluída isoladamente pela lista. Isso evita quebrar o valor total e a sequência.

## Configuração Firebase

A aplicação passa a apresentar um erro explícito quando variáveis Firebase estiverem ausentes ou ainda contiverem valores como `seu-projeto` ou `your_project_id`.

## Qualidade contínua

O workflow `.github/workflows/validate.yml` executa:

- ESLint;
- Vitest;
- build de produção;

em cada push para `main` e em pull requests.

## Preservação

Nenhum documento do Firestore é migrado, regravado ou removido. As correções são aplicadas na interpretação dos dados e na criação de novos parcelamentos manuais.
