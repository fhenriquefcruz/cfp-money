# Meu Real — Gate de publicação das regras Firestore

**Estado:** procedimento de homologação; não representa autorização para publicação.

## Risco tratado

O workflow `.github/workflows/deploy-firestore-rules.yml` anteriormente publicava
`firestore.rules` em todo `push` à `main` que alterasse as regras ou o próprio workflow.
O deploy das regras e o deploy do frontend são workflows independentes. Assim, uma
mudança simultânea podia restringir operações de `invoiceEvents` antes de versões
anteriores do PWA deixarem de usar `addDoc`, bloqueando clientes com código em cache.

A publicação exige `workflow_dispatch` manual, com confirmação
`PUBLICAR_REGRAS_FIRESTORE`, SHA completo do código, **identificador exato do
ruleset atualmente ativo** e **SHA-256 do conteúdo dessa origem**, além de
execução **somente** pela ref `refs/heads/main`. O workflow impede dispatchs
simultâneos próprios, mas não bloqueia alterações feitas por outros operadores
ou pelo Firebase Console. Isso não substitui proteção de branch, revisão
humana, backup, testes ou autorização explícita para produção.

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
5. **Inventário autorizado do ruleset ativo:** com credenciais de
   leitura e acesso aprovado às regras de produção, executar
   `node scripts/verify-firestore-rules-release.mjs inspect` em ambiente
   seguro. Esse comando consulta apenas o Rules API e retorna o nome completo
   do ruleset e o SHA-256 de seu conteúdo, sem imprimir o texto das regras.
   Conferir esses dados com a revisão humana e arquivar o ruleset integral
   em backup autorizado. **Este procedimento não foi executado nesta PR.**
   O preflight e o publicador comparam o mesmo par exato (nome e digest);
   não aceitam `HEAD^` nem snapshots históricos como substitutos.
6. **Autorização de release:** registrar revisão humana, SHA aprovado,
   janela exclusiva sem intervenções paralelas no Console, responsável,
   estratégia para clientes PWA antigos, comunicação, backup e rollback.
   Somente após autorização específica, selecionar **main** no GitHub Actions
   e preencher `approved_sha`, `approved_ruleset`,
   `approved_rules_sha256` e a confirmação exigida. Os dados de origem
   devem vir da inspeção atual, nunca de suposições sobre produção.
7. **Pós-publicação:** o publicador confirma que o ruleset ativo é
   o ID recém-criado e que o conteúdo é idêntico ao `firestore.rules`
   versionado. O passo `after` confere novamente ID e conteúdo. Validar
   login/UID, criação e leitura dos eventos, histórico imutável, retries,
   isolamento e clientes PWA antigos. Interromper mudanças diante de
   divergência financeira ou bloqueio inesperado.

## Concorrência e limitações do endpoint

O Firebase Rules REST API permite atualizar `Release.rulesetName`, mas
não documenta para esse `PATCH` um mecanismo atômico de condição sobre
o ID antigo. A checagem repetida imediatamente antes do `PATCH`
**diminui, mas não elimina** a janela de corrida com alterações externas.
A serialização por `concurrency` no Actions não bloqueia mudanças no Console.
A aprovação operacional deve exigir uma janela exclusiva, responsável de
mudança, alerta e plano de recuperação.

`verify ... inspect` é leitura **do Rules API de produção** e só deve ser
executado quando o acesso e as credenciais estiverem autorizados. Nenhuma
consulta ao ambiente real foi efetuada para preparar estes patches.

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
