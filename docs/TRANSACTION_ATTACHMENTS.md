# Meu Real — Comprovantes de transações (Fase 57)

## Objetivo

Arquivo facultativo ao criar ou editar transações e comprovante de pagamento vinculado à transação, com clipe visível quando há anexos.

## Modelo adotado sem migração de plano

Cloud Storage for Firebase exige o plano Blaze desde fevereiro de 2026; a produção está orientada ao Spark. Esta etapa usa **fragmentos pequenos privados no Firestore** como solução temporária, com limites severos para impedir crescimento descontrolado. Não é recomendada para arquivo digital em escala.

- Máximo: **2 MiB por arquivo**, até **6 anexos por transação**.
- Formatos suportados: PDF; JPG, PNG, WebP, GIF, HEIC; CSV, XLS/XLSX, ODS; DOC/DOCX/ODT e TXT. Outros, scripts e executáveis são rejeitados.
- Fragmentos: 192 KiB binários convertidos em Base64 (~256 KiB no documento), sob `users/{uid}/transactionAttachmentChunks`. Cada fragmento carrega identificador da transação, arquivo e ordem.
- Acesso: a regra específica de `users/{uid}/transactionAttachmentChunks` autoriza somente o próprio usuário, exige transação existente, impõe limite por fragmento e proíbe alterações após a criação. Outros usuários não podem ler nem escrever esses dados.
- Concorrência: a inclusão dos metadados utiliza transação atômica no Firestore para reapurar o limite de seis anexos quando duas abas ou dispositivos gravam ao mesmo tempo; em caso de rejeição, os fragmentos recém-enviados são descartados.
- Índice/metadados: `attachments` na própria transação, contendo apenas nome, tipo, tamanho, tipo documental, ID do anexo, número de fragmentos e data. O arquivo não é misturado aos valores financeiros.
- Download somente após ação explícita do usuário, com `application/octet-stream` e atributo `download`, evitando execução inline de conteúdo não confiável.
- Remoção de um comprovante retira os metadados e apaga seus fragmentos. Na exclusão de transações, o código solicita a limpeza dos fragmentos associados.
- Em séries recorrentes ou parcelas, os arquivos escolhidos na criação ficam somente na primeira transação criada, sem multiplicação de armazenamento.
- O pagamento é registrado normalmente. Um botão independente de anexos permite guardar comprovantes classificados como **Pagamento**, sem obrigatoriedade.

## Riscos e limites

- Firestore não é armazenamento de objetos: limite de cota, mais gravações e leituras por arquivo; não carregar bytes na listagem.
- Exclusões que falham após a remoção dos metadados podem deixar fragmentos órfãos. A limpeza por transação e o monitoramento desses resíduos devem fazer parte da manutenção.
- Não existe antivírus no cliente; arquivos são baixados, não abertos automaticamente. Avaliar varredura de malware no backend ao migrar para R2/Storage.
- Arquivos acima dos limites devem usar armazenamento de objetos autenticado (Cloudflare R2 ou Firebase Storage Blaze) após configuração e orçamento aprovados.
- Testar upload, exclusão, reconstrução, autorização de proprietário e comportamento offline antes de liberação.

## Referência

[Firebase: Cloud Storage precisa do Blaze desde 2026](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
