# Money — Gestão Segura de Séries · Fase 13

## Entrega

A fase adiciona gestão atômica de compras parceladas e lançamentos recorrentes.

### Escopos

- somente esta parcela ou lançamento;
- este item e os próximos;
- toda a compra parcelada ou recorrência.

### Edição

É possível alterar:

- descrição;
- categoria;
- observações;
- valor.

Em compras parceladas, o valor informado representa o total do escopo selecionado e é distribuído sem perda de centavos.

Em recorrências, o valor é aplicado individualmente a cada ocorrência selecionada.

Datas, cartão e forma de pagamento permanecem preservados nesta fase para evitar alteração acidental da competência financeira.

### Exclusão

A exclusão é executada em uma única operação no Firestore. Depois da remoção:

- parcelas restantes são renumeradas;
- `installmentOf` é atualizado;
- `originalAmount` passa a refletir o saldo restante;
- recorrências restantes recebem `recurringNum` e `recurringOf`.

### Atomicidade

Atualizações e exclusões são enviadas pelo mesmo `writeBatch`. Se o commit falhar, nenhuma parcela é alterada parcialmente.

### Preservação

Não há migração automática. Séries antigas são reconhecidas pelos identificadores já existentes:

- `installmentGroupId`;
- `recurringGroupId`.
