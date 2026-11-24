# Gate 2 — Escrita de faturas e validação de schema (MR-003 / MR-007)

**Escopo:** proteção preventiva do código. Sem consulta ou escrita de dados financeiros reais,
merge, deploy ou alteração de configurações do Firebase em produção.

## Contrato da operação

- Uma solicitação de criação de evento de fatura recebe `operationId` aleatório seguro
  gerado pelo Web Crypto **uma vez por intenção de gravação**. O identificador não carrega
  valor, cartão nem dados pessoais.
- Na mesma tentativa (duplo clique, erro de rede ou retry), a interface mantém a mesma
  `operationId`. Alterações nos campos geram uma **nova** intenção de gravação.
- O repositório grava em `users/{uid}/invoiceEvents/{operationId}`, usando `runTransaction`
  para ler antes de criar. Documento existente com mesmo payload é replay aceito sem
  nova escrita; a mesma chave com payload diferente é erro de colisão.
- O titular não pode editar ou apagar eventos: o histórico de fatura segue a abordagem
  de **eventos de reversão**, sem sobrescrever pagamentos anteriores.
- `invoiceEvents` legados sem `operationId` continuam legíveis; nenhuma migração ou
  reconstrução de histórico é feita nesta fase.
- A regra Firestore impede o bypass pela autorização genérica do titular e valida
  identidade do documento, tipo, competência, montante básico, carimbo temporal e
  campos correspondentes ao evento.
- Para `transactions`, **novos documentos** exigem `amount` numérico finito dentro
  do limite técnico de R$ 100 milhões; edição de campos de registros legados com
  `amount` textual permanece permitida sem alterar o montante, mas novas alterações
  de `amount` devem obedecer ao contrato.

## Ensaios sintéticos necessários

1. Mesmo ID em duas sessões concorrentes ou retry após timeout -> um documento.
2. Mesmo ID com valor ou atributos diferentes -> erro, montante original preservado.
3. Pagamento parcial válido, rejeição de texto, negativo, excesso de casas e período inválido.
4. Origem UID A não lê/grava/modifica dados do UID B; usuário anônimo não grava.
5. Histórico legado legível, mas protegido contra edição.
6. Ajuste, fechamento manual e estorno são aceitos apenas com os campos do seu tipo.
7. Regras e contrato JavaScript são testados usando Firestore Emulator, sem dados reais.

## Limitações explícitas e fase seguinte

A chave de idempotência protege **a mesma operação**, não identifica automaticamente
pagamentos externos feitos em banco e reenviados manualmente como uma **nova operação**.
Conciliação bancária independente, duas chaves diferentes para o mesmo fato, estorno
concorrente sobre o mesmo pagamento, proteção contra excesso de pagamento sobre
fatura e políticas de `invoiceMonth` histórico ainda exigem contratos adicionais e
testes específicos. O cliente não é autoridade de conciliação.

A validação de `transactions` nesta PR restringe o campo `amount` e deixa diversos
campos legados opcionais para preservar compatibilidade. A validação exaustiva de
campos de cartão, status, categoria, parcela e recorrência deve ocorrer em entrega
separada, com matriz de compatibilidade. Essa PR **não** constitui certificação de
schema integral.

**Rollback:** não implantar sem export/backup autorizado, ensaio de restauração
em Emulator, aprovação dos checks e plano de retorno às regras anteriores. Em
caso de reversão, não excluir eventos persistidos nem reprocessar automaticamente
tentativas com outros IDs. Revisar efeitos de retries que falharam antes do aceite
antes de qualquer deploy. O plano de release deve verificar que os clientes ativos
suportam `operationId`, pois clientes antigos seriam recusados pelas regras novas.
