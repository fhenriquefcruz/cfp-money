# Money Operacional — Fase 6

## Entrega

- registro de despesas e receitas simples por texto;
- interpretação local, sem API paga;
- rascunho totalmente editável;
- confirmação obrigatória antes da gravação;
- seleção explícita de categoria, data e forma de pagamento;
- alerta de possível duplicidade;
- opção de cancelar sem salvar;
- opção de desfazer após salvar;
- integração com o `createTransaction` já utilizado pelo Meu Real;
- atualização automática de Dashboard, listas, relatórios e alertas de orçamento;
- bloqueio seguro para cartão de crédito e parcelamentos até o fluxo avançado.

## Exemplos

- `Paguei 180 no dentista por Pix ontem`
- `Gastei 95 no mercado em dinheiro hoje`
- `Recebi 5000 de salário hoje`

## Limites desta fase

Cartão de crédito e parcelamentos não são simplificados. Esses pedidos são encaminhados para o cadastro atual de Transações até que contas, cartões, fechamento e faturas sejam estruturados.

## Preservação

Nenhuma transação anterior, categoria, meta, orçamento, plano ou preferência é migrada ou sobrescrita.
