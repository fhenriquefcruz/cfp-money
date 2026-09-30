# Semântica financeira do Meu Real

## Objetivo

Este documento define as fórmulas e as datas usadas pelos cálculos financeiros do Meu Real. A regra principal é evitar que a mesma transação seja interpretada de formas diferentes entre Dashboard, Orçamentos, Money, Relatórios e Transações.

## Datas

### Data da movimentação

É a data usada para análise de comportamento financeiro, categorias, orçamento e evolução.

- compra estruturada no cartão: `purchaseDate`;
- demais transações: `date`;
- fallback legado: `dueDate` somente quando `date` não estiver disponível.

Usos:
- resumo mensal de receitas e despesas;
- gastos por categoria;
- orçamento;
- Money;
- lista e agrupamento de Transações;
- transações recentes do Dashboard.

### Data de vencimento / compromisso

É a data usada para obrigações financeiras e controle de pagamento.

- usa `dueDate` quando informado;
- fallback: `date`.

Usos:
- comprometido;
- a pagar;
- atrasados;
- próximos 7 dias;
- comparação mensal de compromissos.

### Data de pagamento

Campo `paidAt`.

É preenchido quando uma despesa manual é marcada como paga. Compras estruturadas no cartão usam a fatura e seus eventos de pagamento como fonte de verdade.

### Data de cadastro

Campo `createdAt`.

Serve apenas para auditoria e histórico de cadastro. Não participa de competência, orçamento ou score.

## Transações efetivas

Uma transação participa dos totais financeiros quando:

- não está cancelada;
- não está explicitamente marcada como transferência por `flowType='transfer'` ou `kind='transfer'`.

Transferências ainda não devem ser inferidas apenas pelo texto da descrição. A classificação explícita será ampliada em fase posterior.

## Fórmulas

### Receitas do período

Soma de transações efetivas com:

- `type='income'`;
- `isSavings !== true`;
- data da movimentação dentro do período.

### Despesas do período

Soma de transações efetivas com:

- `type='expense'`;
- `isSavings !== true`;
- data da movimentação dentro do período.

### Saldo do período

```
saldo = receitas - despesas
```

Não representa saldo bancário. É o resultado das movimentações registradas no período.

### Poupança total

Soma de todas as transações marcadas com `isSavings=true` que sejam efetivas.

### Poupança no período

Soma das transações `isSavings=true` cuja data da movimentação esteja dentro do período selecionado.

### Orçamento

Para cada categoria e mês:

```
gasto_orcamento = soma das despesas efetivas da categoria no mês da movimentação
percentual = gasto_orcamento / limite * 100
excedente = max(0, gasto_orcamento - limite)
```

Compras estruturadas no cartão entram no orçamento pelo mês da compra, não pelo vencimento da fatura.

### Comprometido

Fonte: `buildPaymentControlOverview`.

É o valor total das obrigações do mês de compromisso:

- despesas manuais pela data de vencimento;
- faturas estruturadas pela competência da fatura;
- cancelamentos excluídos.

### Pago

Soma de:

- despesas manuais marcadas como pagas;
- valores pagos de faturas estruturadas.

### A pagar

```
a_pagar = pendente + atrasado
```

Itens com status legado desconhecido ficam separados e não são tratados automaticamente como dívida pendente.

## Indicador financeiro v2

O antigo rótulo “Saúde financeira” foi substituído por “Indicador financeiro”.

O indicador não é diagnóstico financeiro. Ele resume cinco sinais objetivos do período:

| Fator | Peso |
| --- | ---: |
| Equilíbrio do período | 30 |
| Reserva no período | 25 |
| Aderência aos orçamentos | 20 |
| Pontualidade dos pagamentos | 15 |
| Relação despesas / receitas | 10 |

### Equilíbrio do período

- saldo >= 0: 30 pontos;
- saldo < 0: 0.

### Reserva no período

- >= 20% das receitas: 25;
- >= 10%: 12;
- > 0%: 5;
- 0% ou sem base de receita: 0.

### Aderência aos orçamentos

- há orçamento e todos estão dentro do limite: 20;
- caso contrário: 0.

### Pontualidade

- 0 atrasos: 15;
- 1 atraso: 8;
- 2 ou mais atrasos: 0.

### Relação despesas / receitas

- despesas <= 70% das receitas: 10;
- despesas <= 90%: 5;
- acima de 90% ou sem receita para calcular: 0.

Metas cadastradas e mera existência de receita não geram mais pontos por si só.

### Qualidade dos dados e suspensão da pontuação

Se houver classificação de categoria suspeita no período, o indicador fica **Em revisão** e não exibe uma pontuação numérica até a revisão ser concluída.

Isso evita que um gasto possivelmente classificado na categoria errada altere o orçamento e, por consequência, produza uma pontuação financeira enganosa.

## Revisão de categorias

A aplicação pode sinalizar uma classificação como suspeita quando a descrição apresenta indícios fortes de uma família diferente da categoria atual.

Famílias iniciais:
- combustível;
- transporte por aplicativo;
- consórcio / financiamento;
- empréstimos;
- transferência explícita.

A revisão é não destrutiva:

- nenhuma transação é recategorizada automaticamente;
- a sugestão aparece na lista de Transações;
- o usuário abre a edição e decide se confirma ou não a alteração.

As regras são heurísticas de apoio, não uma fonte de verdade.

O Money também sinaliza a existência de classificações suspeitas antes de destacar aumentos por categoria. Enquanto houver revisão pendente, diagnósticos que dependem da categoria são ocultados.


## Orçamento de performance da Phase 42A

A base anterior operava praticamente no limite técnico: 239,96 KiB de JavaScript inicial para um teto de 240 KiB e 702,85 KiB totais para um teto de 703 KiB.

A Phase 42A também incorporou uma atualização obrigatória do DOMPurify para uma versão fora da faixa vulnerável. Após remover dependências compartilhadas desnecessárias e restaurar o grafo de carregamento inicial, o orçamento foi recalibrado de forma controlada:

- JavaScript inicial gzip: 242 KiB;
- JavaScript total gzip: 707 KiB;
- maior chunk JavaScript: permanece em 140 KiB;
- CSS inicial gzip: permanece em 20 KiB.

A mudança é inferior a 1% e cria uma pequena margem operacional sem liberar gráficos ou bibliotecas de PDF no carregamento inicial.
