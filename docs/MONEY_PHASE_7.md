# Money — Cartões, Faturas e Parcelamentos · Fase 7

## Entrega

- cadastro Premium de cartões no Perfil;
- nome e últimos quatro números opcionais;
- fechamento, vencimento e status ativo;
- cálculo centralizado da primeira fatura;
- separação entre data da compra e vencimento;
- distribuição de parcelas com correção de centavos;
- integração com o formulário tradicional de Transações;
- fluxo manual antigo preservado como alternativa;
- dados do cartão copiados para cada nova transação;
- nenhum recálculo do histórico anterior.

## Estrutura das novas transações

```js
{
  date: '2026-08-01',              // vencimento usado nos relatórios atuais
  purchaseDate: '2026-07-10',      // data real da compra
  originalPurchaseDate: '2026-07-10',
  invoiceClosingDate: '2026-07-24',
  dueDate: '2026-08-01',
  invoiceMonth: '2026-08',
  cardId: '...',
  cardName: 'Nubank',
  cardLast4: '1234',
  isCreditPurchase: true
}
```

## Regras do Firestore

A atualização também permite que o próprio usuário salve apenas `moneySettings` e `moneySettingsUpdatedAt` no documento principal, sem abrir acesso a campos de plano, bloqueio ou validade. A subcoleção de cartões continua restrita ao proprietário pelo padrão já existente.

## Segurança

Nunca são solicitados ou armazenados:

- número completo do cartão;
- código de segurança;
- senha;
- token bancário.

## Próxima fase

Integrar o Money conversacional ao cadastro estruturado de cartões, permitindo revisar cartão, compra, fatura e parcelas antes da confirmação.
