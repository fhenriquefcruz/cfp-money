# Gate 2.2 — Estorno integral único e revisão de histórico

**Branch dependente:** `fix/gate-2-2-reversal-concurrency` (PR #164), baseada na
PR #163, ainda não integrada à `main`. Os cenários abaixo são sintéticos.

## Invariantes

- Um pagamento **novo** usa documento `users/{uid}/invoiceEvents/evt_<UUID>`.
- O único estorno integral permitido para esse pagamento usa
  `users/{uid}/invoiceEvents/rev_evt_<mesmo UUID>`. Não existe segunda chave
  válida para estornar o mesmo pagamento.
- A regra do Firestore verifica, na **mesma conta UID**, que o pagamento
  referenciado existe, é `type=payment`, tem a mesma fatura, cartão e valor,
  e a mesma conta de origem. Não basta gerar um ID com o prefixo correto.
- O evento original e seu estorno são **imutáveis**; repetir a mesma
  operação retorna a gravação existente, sem somar outro pagamento ou estorno.
- O estorno desta tela é sempre **integral**. O produto não oferece
  estorno parcial sem um protocolo transacional de alocação por centavos.
- Pagamento histórico sem o prefixo `evt_`, com estorno anterior
  ou fora da mesma fatura **não é elegível** para estorno automático.
  Ele continua visível e precisa de uma conciliação manual supervisionada.
  Nenhum histórico é migrado, descartado ou regravado automaticamente.

## Por que não conciliar duplicidade econômica por título e valor?

Duas operações com IDs distintos podem representar transferências bancárias
diferentes, mesmo com quantia, horário e cartão idênticos. Portanto, não
declaramos deduplicação de fatos externos: isso requer identificador
verificável do banco/PSP, vinculado à conta correta e armazenado com controle
de unicidade no backend. Título, final do cartão, categoria e descrição
são apenas indicadores, nunca autoridade para criar, quitar ou estornar.

## Testes e riscos de publicação

Os testes do Firestore Emulator devem provar que duas sessões concorrentes
conseguem criar **um** estorno, enquanto tentativas com chave diferente,
valor maior/menor, outro UID, outra fatura ou pagamento inexistente
são recusadas pelas regras. Os testes unitários verificam que a interface
não cria automaticamente estorno de registros legados.

A implementação é **uma evolução incompatível** das regras financeiras de
criação da PR #163: clientes anteriores sem identificador operacional e
estornos legados deixam de gravar. Antes de liberar é obrigatório planejar
a ativação, identificar clientes ainda usando código antigo, notificar e
fornecer fluxo de atualização ou suporte, fazer backup e testar rollback em
ambiente controlado. Não publicar regras isoladamente da interface compatível.

**Fora do escopo:** pagamentos externos, estornos parciais, chargebacks
bancários, conciliação retroativa, duplicidade de dois pagamentos com
novas operationIds, dados reais, migração e deploy. Eventual rollback não
autoriza apagar eventos, reaplicar pagamentos ou desfazer auditoria.
