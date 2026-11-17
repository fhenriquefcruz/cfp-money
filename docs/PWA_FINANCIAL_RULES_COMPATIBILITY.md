# Meu Real — Matriz de compatibilidade PWA e Rules financeiras

**Status: laboratório / planejamento; nenhum rollout autorizado em produção.**

## Evidência de código

No `main` anterior à integração financeira, `addInvoiceEvent` usa `addDoc`,
gerando um identificador aleatório. No laboratório MR-003, `firestore.rules`
aceita novas criações em `invoiceEvents` somente como `op_{operationId}`,
valida centavos, competência e vínculos, e nega edição ou exclusão de eventos
existentes, inclusive legados. Novos estornos exigem também uma trava
`invoiceReversalLocks` atômica.

A PWA não pode obrigar uma aba **antiga já aberta** a executar código de
atualização que ainda não conhece. A verificação ativa no frontend novo
(`monitorPwaUpdates`) reduz atrasos ao recuperar conexão/foco, mas **não é
garantia de atualização de todos os clientes**. Um Service Worker aguardando
depende de consentimento para `SKIP_WAITING`; o aviso alerta sobre recarga
e perda de informações ainda não salvas.

## Matriz de operações contra regras restritivas propostas

| Cliente | Operação | Resultado esperado no Emulator | Implicação |
| --- | --- | --- | --- |
| Antigo (`addDoc`, ID aleatório) | Novo pagamento/ajuste | **Negado** | Instalações em cache podem ficar sem capacidade de registrar pagamentos |
| Antigo (edição direta) | Alterar ou excluir evento legado | **Negado** | Histórico preservado; UX antiga pode mostrar erro de permissão |
| Atualizado (`op_{operationId}`) | Criar evento válido | **Permitido** ao UID | Nova intenção é imutável e rastreável |
| Atualizado (replay mesmo ID) | Repetir intenção idêntica | **Idempotente** pela persistência | Não pode duplicar pagamento na repetição |
| Atualizado (estorno) | Duas intenções diferentes para mesma origem | **Uma aceita, outra negada** | Evita novo estorno concorrente sem controle |
| Qualquer cliente | Ler histórico do próprio UID | **Permitido**, inclusive legados | Novas versões também incluem documentos sem `eventDate` |
| Qualquer cliente | Acessar outro UID | **Negado** | Isolamento independente da versão |

Os resultados de emulação **não demonstram** compatibilidade dos clientes antigos
com as regras efetivamente publicadas, que não foram consultadas ou alteradas
nesta fase. O fallback de leitura não altera `eventDate`, `paidAt`, competência
ou `transactions`. Histórico sem vínculo estruturado não é conciliado por texto.

## Sequência mínima de homologação

1. Registrar `main` SHA, branch protection, hashes dos assets da PWA,
   ruleset efetivamente publicado, inventário read-only de eventos legados
   e backup verificável sem dados pessoais nos logs.
2. Homologar navegador novo e **PWA antigo instalado** em sessões diferentes,
   incluindo tela de pagamento em edição, conexão offline, retorno online,
   segunda aba e retorno ao primeiro plano.
3. Confirmar que aviso da nova versão está visível, que a recarga depende
   de ação humana e que registros não confirmados não são silenciosamente
   duplicados. Após atualização, validar replay de `operationId`.
4. Publicar **primeiro o frontend compatível**. Aguardar a estratégia formal
   para reduzir clientes antigos ativos e monitorar falhas; não supor que o
   Service Worker force atualização.
5. Publicar Rules somente com autorização específica, gate manual da PR #192,
   SHA completo, revisão e baseline real conciliado; **não executar** gatilho
   manual a partir deste laboratório.
6. Confirmar em ambiente controlado as regras de acesso, eventuais operações
   bloqueadas e saldos de fatura. Ter plano específico para clientes antigos
   ainda ativos, inclusive suporte e retorno a uma versão compatível.
7. Rollback da PWA **não reverte Rules**. Rollback de Rules exige ruleset
   anterior auditado e nova autorização. Nunca contornar o gate elevando
   permissões indiscriminadamente ou permitindo escrita cross-UID.

## Limites do experimento

- O teste Rules prova o cenário de **falha fechada** de `addDoc` legado;
  não mostra que um usuário offline tenha sido atualizado com sucesso.
- O aviso de atualização pode ser dispensado e retornar quando a aba for
  revisitada; ele não encerra automaticamente formulários financeiros.
- O PWA não armazena dados Firestore no Service Worker; o cache local do
  SDK Firebase e rascunhos não são auditados por estes testes.
- Se a compatibilidade de clientes antigos não for aceitável, a publicação
  das Rules restritivas deve ser **adiada** até existir estratégia segura
  de transição, rollback e atendimento.

**Proibido sem autorização:** merge em `main`, deploy, disparo de workflow
de Rules, migração ou alteração de documentos financeiros reais.
