# Meu Real — Comprovantes de transações (Fase 57)

## Objetivo

Arquivo facultativo ao criar ou editar transações e comprovante de pagamento vinculado à transação, com clipe visível quando há anexos.

## Modelo adotado sem migração de plano

Cloud Storage for Firebase exige o plano Blaze desde fevereiro de 2026; a produção está orientada ao Spark. Esta etapa usa **fragmentos pequenos privados no Firestore** como solução temporária, com limites severos para impedir crescimento descontrolado. Não é recomendada para arquivo digital em escala.

- Máximo: **2 MiB por arquivo**, até **6 anexos por transação**.
- Formatos suportados: PDF; JPG, PNG, WebP, GIF, HEIC; CSV, XLS/XLSX, ODS; DOC/DOCX/ODT e TXT. Outros, scripts e executáveis são rejeitados.
- Fragmentos: 192 KiB binários convertidos em Base64 (~256 KiB no documento), sob `users/{uid}/transactionAttachmentChunks`. Cada fragmento carrega identificador da transação, arquivo e ordem.
- Acesso: a regra específica de `users/{uid}/transactionAttachmentChunks` autoriza somente o próprio usuário, exige transação existente, impõe limite por fragmento e proíbe alterações após a criação. Outros usuários não podem ler nem escrever esses dados.
- Concorrência e integridade: cada inclusão grava metadados e todos os fragmentos em **uma única transação atômica do Firestore**, com limite de seis reapurado em cada tentativa. Em falha ou disputa por vagas, nenhuma parte do novo arquivo é publicada.
- Índice/metadados: `attachments` na própria transação, contendo nome, tipo, tamanho, tipo documental, ID do anexo, número de fragmentos, data e checksum SHA-256 do arquivo nas inclusões novas. O arquivo não é misturado aos valores financeiros.
- Download somente após ação explícita do usuário, com `application/octet-stream` e atributo `download`, evitando execução inline de conteúdo não confiável. Metadados lidos diretamente da transação, verificação de vínculo dos fragmentos, contagem, tamanho e SHA-256 dos anexos novos. Arquivos legados sem checksum permanecem acessíveis com validação de tamanho e vínculo.
- Remoção: metadados e fragmentos são excluídos juntos numa única transação atômica, inclusive em falhas de rede. Na exclusão de transações, o código mantém a varredura de fragmentos legados e órfãos de versões anteriores.
- Em séries recorrentes ou parcelas, os arquivos escolhidos na criação ficam somente na primeira transação criada, sem multiplicação de armazenamento.
- O pagamento é registrado normalmente. Um botão independente de anexos permite guardar comprovantes classificados como **Pagamento**, sem obrigatoriedade.

## Riscos e limites

- Firestore não é armazenamento de objetos: limite de cota, mais gravações e leituras por arquivo; não carregar bytes na listagem.
- Arquivos enviados por versões anteriores podem ter deixado fragmentos órfãos. A limpeza por transação e o monitoramento desses resíduos ainda são necessários para documentos legados e falhas de exclusão de transações.
- Exclusões individuais, em lote e de séries agora registram, no mesmo commit, uma fila de recuperação em `users/{uid}/attachmentCleanupJobs`. No login e depois de exclusões, o cliente tenta limpar os fragmentos de transações que já não existem. A fila permanece até a confirmação e sobrevive ao fechamento da página. Fragmentos de lançamentos existentes nunca são eliminados pelo recuperador.
- A recuperação tem limites de leitura por sessão para preservar custos no plano Spark. Ela é oportunista (login/nova exclusão), **não** é um worker permanente: usuários que não retornarem podem manter fragmentos até a próxima sessão ou uma manutenção autorizada. Fragmentos anteriores à criação da fila não são descobertos automaticamente e exigem auditoria específica.
- Erros de rede não apagam o registro de limpeza; a tentativa pode ser repetida. Nenhuma informação financeira é alterada pelo recuperador.
- SHA-256 verifica corrupção acidental entre upload e download, mas não autentica contra um proprietário malicioso que possa alterar seus próprios dados; não substitui assinatura digital, antivírus ou varredura de malware no backend. Os arquivos são baixados, não abertos automaticamente.
- Arquivos acima dos limites devem usar armazenamento de objetos autenticado (Cloudflare R2 ou Firebase Storage Blaze) após configuração e orçamento aprovados.
- Testar upload, exclusão, reconstrução, checksum, autorização de proprietário e comportamento offline antes de liberação; transações Firestore exigem conexão ativa. O navegador precisa oferecer WebCrypto (HTTPS/ambiente seguro) para novos envios.

## Referência

[Firebase: Cloud Storage precisa do Blaze desde 2026](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
