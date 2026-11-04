# Gate 2 — Compatibilidade PWA, ordem de ativação e reversão

**Estado:** plano de pré-homologação, não autorização de publicação.  
**Referências:** PRs #162 (semântica), #163 (escrita de fatura) e #164 (estorno único);
issue #165.  
**Ambiente:** somente código e dados sintéticos. Sem leitura de dados financeiros reais.

## Evidências técnicas e limites

- O cliente novo persiste eventos em `users/{uid}/invoiceEvents/{operationId}` por
  `runTransaction`, aceitando replay com payload idêntico e recusando colisões.
- As regras candidatas exigem documento e `operationId` coerentes; não permitem atualizar
  nem excluir um evento. O fluxo novo restringe estornos automáticos a pagamentos novos
  elegíveis. Histórico legado continua legível.
- O service worker é versionado por hash de assets; `registerServiceWorker` emite
  `meu-real:pwa-update` quando detecta instalação aguardando e recarrega após a troca
  de controlador. `activatePwaUpdate` envia `SKIP_WAITING`.
- **Não foi comprovado** nesta etapa que toda interface aberta apresenta ou aciona a
  atualização; em particular, abas antigas e sessões offline podem manter código anterior.
- A chave idempotente protege uma intenção de gravação no aplicativo, **não prova**
  liquidação bancária e não deduplica dois pagamentos externos diferentes.

## Matriz de compatibilidade obrigatória

| Cliente e condição                | Com regra antiga                 | Com regra nova            | Aceite                                            |
| --------------------------------- | -------------------------------- | ------------------------- | ------------------------------------------------- |
| App novo, online                  | Pode criar evento com ID estável | Deve criar uma vez        | Retry idêntico retorna mesmo ID                   |
| App novo, timeout após commit     | Pode reenviar mesmo ID           | Deve ser idempotente      | Sem segunda liquidação                            |
| App antigo, aba aberta            | Pode usar `addDoc` legado        | Escrita pode ser negada   | Aviso claro e atualização, sem novo ID automático |
| PWA antigo, cache offline         | Pode guardar UI antiga           | Pode falhar ao reconectar | Recuperação sem apagar histórico                  |
| App novo, pagamento legado        | Leitura preservada               | Leitura preservada        | Estorno automático indisponível quando ambíguo    |
| Duas sessões, mesmo `operationId` | Concorrência a verificar         | Somente um evento         | Emulator + duas instâncias                        |
| Duas operações com IDs distintos  | Dois fatos possíveis             | Dois fatos possíveis      | Nunca alegar deduplicação bancária                |
| UID de outro titular              | Acesso negado                    | Acesso negado             | Emulator sem vazamento entre contas               |

## Portões anteriores à publicação

1. **Integridade da árvore:** integrar experimentalmente as pontas atuais das três PRs em
   runner descartável; exigir `validate:all`, `format:check`, Emulator, mobile,
   acessibilidade/visual e limite de JavaScript **741 KiB** no mesmo candidato.
2. **Recuperação de cliente antigo:** validar com navegador/PWA instalado na versão
   anterior, inclusive aba aberta, cache e modo offline. Confirmar que há uma instrução
   visível de atualizar e recarregar quando a nova regra rejeita a escrita.
3. **Sem confirmação falsa:** em `permission-denied`, `aborted` ou timeout, não mostrar
   pagamento concluído sem reler o evento; não gerar novo `operationId` silenciosamente,
   não lançar segunda despesa e não repetir automaticamente uma intenção ambígua.
4. **Histórico e snapshots:** revisar pagamentos antigos, estornos parciais anteriores,
   cartão alterado, meses curtos e competência antiga; eventos pré-existentes não são
   excluídos nem migrados nesta fase.
5. **Segurança:** executar testes com dois UIDs no Emulator; não enfraquecer a regra
   `invoiceEvents` para atender um cliente obsoleto. Verificar também
   `transactions.amount` legado e atualizações permitidas sem alterar o montante.
6. **Operação:** aprovar export/backup restrito e teste de restauração isolada; registrar
   responsáveis, sinais de erro sem informações pessoais, janela de observação,
   critério de parada e autorização explícita distinta para release.
7. **Produção:** identificar o build efetivamente publicado, flags e versão das regras
   Firestore; comparar com o SHA homologado. A existência de Functions versionadas
   não implica deploy.

## Sequência proposta — exige aprovação independente

1. Homologar as PRs #162, #163 e #164 na ordem de dependência, preservando SHAs e
   evidência do preflight **combinado**. Não fazer merge com gates pendentes.
2. Disponibilizar primeiro o cliente compatível e comprovar o mecanismo de atualização
   de PWA/abas antigas **antes** de aplicar regras mais restritivas. Enquanto houver
   clientes antigos, a política para escritas de fatura deve ser aprovada de modo
   explícito; o frontend novo, sozinho, não elimina o risco do cliente antigo.
3. Habilitar as regras de produção somente após aprovação do plano de transição,
   verificação de cópia/restauração e um caminho seguro para sessões antigas.
4. Observar falhas, retries e erros de autorização com códigos e contagens agregadas,
   sem UID, cartão, valor, descrição, conta bancária ou payload em logs.
5. Encerrar a janela somente após a conferência de eventos idempotentes, ausência de
   regressões e aceite do responsável. Não inferir correspondência com banco externo.

## Parada e reversão

- **Bloquear liberação** se houver cliente antigo sem recuperação testada, divergência
  financeira, duplicidade sob retry, erro de isolamento, CI vermelho, bundle acima do
  limite ou ausência de backup/rollback aprovado.
- Ao detectar falha após ativação, suspender novas ações financeiras de risco pelo
  procedimento aprovado, preservar os documentos e avaliar eventos pendentes.
- Retornar regras anteriores indiscriminadamente **não é rollback seguro**: pode
  reabrir a escrita não idempotente. Qualquer reversão precisa manter isolamento e
  proteção contra duplicidade, com autorização e ensaio em ambiente isolado.
- Não excluir eventos, redefinir saldos, criar estornos compensatórios nem repetir
  pagamentos externos automaticamente durante recuperação.
- Registrar horário, SHA do frontend, versão das regras, sinais observados e decisão
  de rollback **sem dados pessoais ou financeiros**.

## Evidências faltantes / responsáveis

- Testes reais de atualização de cliente PWA antigo: **pendente**.
- Inventário de sessões/bundles antigos e política de transição: **pendentes**.
- Backup restaurável e autorização para produção: **pendentes**.
- Homologação financeira com export autorizado e sanitizado: **pendente**.
- Paridade dos gates no SHA final integrado e performance ≤ 741 KiB: **pendente**.

Este documento é **planejamento de release**, não comprovação de homologação,
implantação, observabilidade ativa ou resultado de produção.
