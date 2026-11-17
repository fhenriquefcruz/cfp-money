# Meu Real — Gate de publicação das regras Firestore

**Estado:** procedimento de homologação; não representa autorização para publicação.

## Risco tratado

O workflow `.github/workflows/deploy-firestore-rules.yml` anteriormente publicava
`firestore.rules` em todo `push` à `main` que alterasse as regras ou o próprio workflow.
O deploy das regras e o deploy do frontend são workflows independentes. Assim, uma
mudança simultânea podia restringir operações de `invoiceEvents` antes de versões
anteriores do PWA deixarem de usar `addDoc`, bloqueando clientes com código em cache.

A publicação agora exige `workflow_dispatch` manual, com a confirmação
`PUBLICAR_REGRAS_FIRESTORE`, SHA completo aprovado e execução **somente**
pela ref `refs/heads/main`. Esse mecanismo **evita publicação acidental**,
mas não substitui revisão humana, permissões do GitHub, testes ou aprovação
explícita para produção.

## Sequência mínima antes de publicar

1. **Inventário não destrutivo:** confirmar os tipos, IDs e vínculos de
   `users/{uid}/invoiceEvents` e `invoiceReversalLocks`; identificar
   documentos legados sem `operationId` e operações pendentes sem expor dados
   pessoais em logs.
2. **Conciliação e backup:** registrar o ruleset atualmente publicado e seu
   identificador; obter backup autorizado e verificar restauração em
   ambiente isolado. Não editar faturas ou pagamentos reais para testar.
3. **Homologação do código:** 7/7 workflows aprovados no mesmo SHA;
   isolamento UID, centavos, competência, idempotência, corrida com dois
   `operationId`, regras, reversões históricas, mobile, a11y e orçamento
   de performance aprovados. CI não prova paridade de saldos reais.
4. **Compatibilidade dos clientes:** disponibilizar primeiro o frontend que
   grava `op_{operationId}` e, para estornos, o documento-trava atômico.
   Testar browser novo, outra sessão, PWA previamente instalado, conexão
   intermitente e retorno após estado offline. Avaliar a estratégia para
   clientes em cache que ainda gravam IDs legados; **não ativar regras
   restritivas enquanto o risco de bloqueio não estiver aceito e mitigado**.
5. **Revisão do publicador:** `verify-firestore-rules-release.mjs` usa
   `HEAD^:firestore.rules` como uma referência de comparação;
   `publish-firestore-rules-api.mjs` restringe a origem a um ruleset
   `firestore-rules-pre-attachments.rules` ou ao conteúdo já pretendido.
   Essas premissas precisam ser reconciliadas com o estado real das regras
   **antes** do acionamento manual. Não remover verificações apenas para
   contornar um erro.
6. **Autorização de release:** registrar revisão humana, SHA aprovado,
   plano de comunicação, janela de acompanhamento, responsável, backup
   e rollback. No GitHub Actions selecionar **main** e fornecer SHA e
   confirmação exigidos; realizar o acionamento somente com permissão
   explícita para publicação.
7. **Pós-publicação:** verificar regras ativas versus SHA, login/UID,
   criação e leitura dos eventos, histórico sem mutação, retry e
   isolamento, além de fluxos com PWA antigo. Interromper mudanças
   diante de qualquer diferença financeira ou bloqueio inesperado.

## Rollback e limitações

O rollback do código (reverter PR) **não restaura automaticamente** as regras
já publicadas. O rollback operacional requer autorização separada e a
republicação do **ruleset exato** previamente auditado, com verificação de
isolamento UID, integridade monetária e efeitos sobre clientes atualizados.

As proteções em laboratório têm limites conhecidos: documentos legados
pré-existentes podem continuar editáveis; estornos históricos dependem
de inventário; IDs diferentes representam pagamentos independentes, sem
conciliação automática com extrato bancário. Nenhum desses pontos está
homologado para produção apenas por CI.

**Proibido:** disparar workflow de publicação, editar dados reais, migrar
histórico ou elevar limites de performance sem autorização específica.
