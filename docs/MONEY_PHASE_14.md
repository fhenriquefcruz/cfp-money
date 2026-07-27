# Money — Ciclo Real da Fatura · Fase 14

## Entrega

A Central de Cartões passa a registrar o ciclo de liquidação da fatura por meio de eventos próprios.

### Eventos disponíveis

- pagamento integral ou parcial;
- estorno integral de um pagamento;
- crédito ou desconto;
- acréscimo;
- fechamento manual.

### Estados calculados

- em formação;
- fechada;
- vence hoje;
- parcialmente paga;
- paga;
- vencida;
- vencida parcialmente;
- pagamento excedente;
- sem lançamentos.

### Regra contra duplicidade

As compras no cartão já são contabilizadas como despesas no mês da fatura. Por isso, o pagamento não cria uma segunda despesa em `transactions`.

Os eventos ficam na subcoleção:

`users/{uid}/invoiceEvents`

Eles servem para controlar a liquidação, o saldo pendente e o histórico da fatura.

### Histórico

Pagamentos não são apagados quando ocorre estorno. Um novo evento de estorno é criado e vinculado ao pagamento original.

### Conta utilizada

O pagamento pode registrar a conta de origem em texto livre. A integração com contas bancárias estruturadas será adicionada em uma fase posterior.

### Preservação

Nenhuma compra existente é migrada ou regravada. A Central continua calculando o total a partir das transações já salvas e adiciona a camada de liquidação separadamente.
