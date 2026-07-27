# Money — Central de Cartões e Faturas · Fase 11

## Entrega

- nova rota Premium `/cards`;
- item `Cartões` no menu;
- consolidação por mês e por cartão;
- estados temporais sem presumir pagamento;
- total da fatura e quantidade de lançamentos;
- previsão dos seis meses seguintes;
- total e quantidade de parcelas futuras;
- filtro por cartão;
- detalhamento das compras e parcelas;
- preservação de cartões removidos pelo retrato salvo na transação;
- indicação separada de compras antigas sem estrutura de cartão;
- ícones PWA válidos em 192 e 512 pixels.

## Estados

A aplicação ainda não possui baixa de pagamento. Por isso a Central não afirma que uma fatura está paga. Os estados são: Em formação, Fechada, Vence hoje, Vencimento passado, Futura e Sem lançamentos.

## Preservação

Nenhuma transação anterior é alterada. Compras manuais antigas continuam nos relatórios gerais e são apenas sinalizadas como não estruturadas.
