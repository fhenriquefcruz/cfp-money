# Backup e recuperação — Meu Real

## Objetivo

Manter cópia criptografada e recuperável dos dados do Firestore.

O processo de backup de produção é somente leitura. A restauração permanece bloqueada por padrão e não faz parte dos testes rotineiros.

## Estratégia

- backup lógico de documentos e subcoleções;
- preservação dos tipos relevantes do Firestore;
- criptografia AES-256-GCM;
- derivação de chave com scrypt;
- senha mínima de 12 caracteres;
- senha não armazenada no repositório;
- arquivos de backup fora do controle de versão;
- autenticação administrativa por ADC.

Os backups locais são armazenados em `backups/`, diretório ignorado pelo Git.

## Backup de produção

Projeto: `cfp-money`.

Fluxo operacional:

1. configurar `MEU_REAL_FIREBASE_PROJECT_ID`;
2. fornecer `MEU_REAL_BACKUP_PASSPHRASE` de forma não exibida;
3. executar `npm run backup:create`;
4. remover a senha da sessão após a execução.

## Evidência real

Backup criptografado de produção concluído em 09/08/2026 às 21:55, horário de Campo Grande.

- Projeto: `cfp-money`
- Documentos: 386
- Timestamp UTC: `2026-08-10T01-55-33-879Z`
- SHA-256: `114765efaf1c77b1149e567d9d01596c9524162be589ab5d0f38b4435c82b53e`

O arquivo criptografado permanece fora do Git.

## Teste de recuperação

O teste automatizado utiliza exclusivamente o Firestore Emulator:

`npm run test:backup-recovery`

Resultado validado:

`Backup/recovery: round-trip criptografado aprovado no Firestore Emulator (3/3 docs).`

O teste cria dados, gera e criptografa o backup, remove os documentos do ambiente de teste, restaura o conteúdo e compara o estado final com o original.

## Proteções contra restore acidental

A restauração de produção é bloqueada por padrão.

O código exige confirmações adicionais específicas antes de permitir qualquer restauração fora do Emulator.

Essas confirmações não devem permanecer configuradas durante a operação normal e não devem ser utilizadas em testes rotineiros.

Uma restauração real somente poderá ocorrer após decisão operacional explícita, conferência do projeto, arquivo, data e integridade do backup.

## Retenção

Enquanto o volume atual permanecer compatível com operação manual:

- realizar pelo menos um backup completo semanal;
- realizar backup antes de mudanças relevantes na estrutura de dados;
- manter os quatro backups semanais mais recentes;
- manter ao menos uma cópia mensal;
- manter uma cópia criptografada fora do ambiente principal.

## Segurança

- nunca versionar backups;
- nunca versionar ou registrar a senha;
- manter senha e arquivo criptografado separados;
- preferir ADC a chaves JSON permanentes;
- tratar backups como dados financeiros e pessoais sensíveis;
- nunca imprimir dados descriptografados em logs.
