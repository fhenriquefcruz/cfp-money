# Meu Real — Política de integridade do histórico de faturas

**Proposta de laboratório MR-003; não constitui aprovação para produção.**

## Contrato do ledger financeiro

- `transactions` continua sendo a fonte das compras, despesas e receitas.
- `invoiceEvents` representa **pagamentos de fatura, ajustes, estornos de liquidação e fechamentos manuais**. Registrar pagamento não cria uma nova despesa.
- Eventos de fatura são **append-only**: novos eventos podem ser criados pelo titular somente sob `op_{operationId}` e com schema validado nas Rules; após criados, não podem ser editados ou excluídos pelo cliente.
- Documentos **legados**, mesmo com payload antigo ou campos faltantes, permanecem legíveis para seu UID sem migração ou reescrita. A mesma regra nega `update`, `delete` e sobrescrita do documento existente, inclusive quando o ID não começa por `op_`.
- `invoiceReversalLocks` protege somente a criação de **novos** estornos do mesmo pagamento com IDs diferentes. A consulta de históricos não substitui conciliação bancária, auditoria de dados antigos ou um inventário de anomalias.

## Como corrigir um erro sem apagar o passado

1. Em eventos novos e vinculados, compensar uma liquidação incorreta por **um novo estorno associado ao pagamento original**, mantendo ambos no histórico e respeitando a trava e o limite em centavos. O fluxo da interface atual efetua um novo estorno do saldo reversível; não introduzir estornos fracionários adicionais sem redesenhar o contrato.
2. Para ajustes de valor da fatura que não sejam liquidações, considerar um **novo evento de ajuste**, com direção, montante e justificativa explícitos; não representar um pagamento de fatura como despesa ou receita.
3. Para documentos legados incompatíveis com o contrato moderno (por exemplo, sem `cardId`, `invoiceKey` ou relação de origem), **não improvisar estorno ou edição direta**. Bloquear conciliação automática, inventariar sem alterar os dados e solicitar plano específico de correção auditável, autorizado e reversível.
4. Correções administrativas/migrações futuras exigirão backend privilegiado separado, autorização por UID e ação, idempotência, log de auditoria e testes; **nenhuma dessas funcionalidades foi implementada nesta proposta**. As Rules do cliente não impedem operações com privilégios do Admin SDK.

## Visibilidade dos documentos legados

As Rules permitem `get` e `list` do UID mesmo com payload incompleto.
**Isso não prova visibilidade em todas as telas.** Na versão analisada,
`src/services/firebase.js` usa `orderBy('eventDate', 'desc')` em
`onInvoiceEventsChange`; consultas ordenadas do Firestore não incluem
documentos sem o campo ordenado. Assim, eventos legados sem `eventDate`
podem ser omitidos do listener, embora continuem armazenados e legíveis
por uma consulta direta à coleção.

Antes de homologar, corrigir/testar a leitura histórica no mesmo fluxo
utilizado pelo aplicativo, incluindo fallback de `paymentDate` ou
`createdAt`, ordenação estável, custos de leitura e paridade financeira.
Os testes de Rules usam leitura direta não ordenada e **não fecham**
esse requisito de visibilidade da interface.

## Riscos e gates de publicação

A implantação desta regra é uma **mudança de comportamento**: versões antigas do PWA que editam eventos legados falharão, e versões que criam novos IDs aleatórios já são incompatíveis com as regras do laboratório.

**Bloquear release até:**

- Inventário read-only dos documentos legados e caminhos reais de escrita, sem expor dados pessoais.
- Testar formatos e fluxos de pagamentos históricos, estornos anteriores, datas, competência, pagamentos parciais e retornos após offline.
- Garantir frontend compatível e estratégia de atualização das instalações PWA antigas antes de ativar regras restritivas.
- Integrar o mecanismo de **publicação manual das Rules da PR #192** com testes de CI, backup, rollback do ruleset exato e autorização de produção.
- Confirmar a `main` protegida por políticas organizacionais, aprovação de revisão e checks no SHA de release.
- Validar que nenhum módulo calcula nova receita/despesa ao registrar pagamento ou estorno.
- Exigir homologação com histórico sintético e, quando autorizado, comparação não destrutiva de bases históricas reais.

Não alterar `main`, regras publicadas, usuários, faturas reais ou migrations durante essa fase de laboratório.
