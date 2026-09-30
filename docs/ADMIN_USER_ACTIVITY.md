# Atividade dos usuários no Painel Admin

## Objetivo

Permitir que administradores acompanhem uso recente sem confundir autenticação com presença em tempo real.

O painel exibe:

- último login conhecido (`lastSignInAt`);
- última atividade no Meu Real (`lastSeenAt`);
- presença aproximada;
- tempo relativo sem acesso;
- filtros por atividade;
- totais de usuários online, ativos em 7 dias e inativos há 30+ dias.

## Semântica

### Último login

`lastSignInAt` é derivado do metadata do Firebase Authentication.

Para usuários existentes antes desta fase, o valor histórico deve ser sincronizado com:

```bash
npm run admin:sync-activity
npm run admin:sync-activity -- --apply
```

A primeira execução é somente leitura (dry run). Use `--apply` somente depois de revisar os totais.

### Última atividade

Enquanto o usuário está autenticado e com a aplicação visível, o frontend registra `lastSeenAt` com timestamp do servidor em intervalos leves.

O heartbeat não contém dados financeiros, rota, dispositivo, IP, localização ou conteúdo digitado.

### Online agora

O status **Online agora** significa que houve atividade registrada nos últimos 5 minutos.

É uma presença aproximada e não deve ser interpretada como garantia de uma sessão aberta naquele exato segundo. Firebase Authentication não oferece presença em tempo real por si só.

## Segurança

- cada usuário só pode atualizar os próprios campos `lastSignInAt` e `lastSeenAt`;
- `lastSeenAt` precisa usar o timestamp do servidor;
- `lastSignInAt` não pode estar no futuro;
- esses campos não concedem Premium, não bloqueiam/desbloqueiam contas e não participam de autorização;
- administradores continuam lendo usuários por meio das permissões administrativas existentes.

## Rollout

1. validar testes e CI;
2. mesclar a Phase 41;
3. publicar as regras do Firestore:

```bash
firebase deploy --only firestore:rules
```

4. atualizar o Codespace para a nova `main`;
5. executar o dry run histórico:

```bash
npm run admin:sync-activity
```

6. revisar os totais e então aplicar:

```bash
npm run admin:sync-activity -- --apply
```

7. abrir o Meu Real com uma conta comum por alguns minutos;
8. abrir o Painel Admin e conferir último login, última atividade e filtros.
