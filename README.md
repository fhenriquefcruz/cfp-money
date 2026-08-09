# Meu Real

## Recursos principais

- receitas, despesas, cartões, faturas, metas e orçamentos;
- assistente financeiro com confirmação antes de gravar;
- administração de acessos Premium;
- exportação de dados, consentimento versionado e exclusão de conta;
- métricas operacionais agregadas para administradores;
- testes de domínio, frontend e backend.

## Requisitos

- Node.js 20;
- projeto Firebase com Firestore, Authentication e App Check;
- produção atual no plano Firebase Spark, sem Cloud Functions implantadas;

## Instalação

```bash
nvm use 20
npm ci
npm install --prefix functions
cp .env.example .env
npm run dev
```

Nunca envie `.env`, tokens ou segredos ao Git.

## Validação completa

```bash
npm run validate:all
npm run format:check
```

A validação completa cobre o frontend, o código versionado das Cloud Functions e o arquivo de índices do Firestore. A validação das Functions não implica sua implantação no modo Spark.

## Implantação

A produção atual é publicada no GitHub Pages pelo workflow `Deploy to GitHub Pages` após merge/push em `main`.

Para uma publicação manual apenas do frontend:

```bash
npm run deploy
```

No modo Spark atual, não implante Cloud Functions em produção.

## Configuração de produção

Antes do lançamento:

1. configure domínio definitivo e variáveis `VITE_FIREBASE_*`;
2. revise Termos e Política de Privacidade com apoio jurídico;
3. preencha `VITE_LEGAL_CONTROLLER_NAME` e `VITE_LEGAL_CONTACT_EMAIL`;
4. mantenha App Check habilitado e obrigatório no build de produção;
5. mantenha o enforcement do App Check ativo no Firestore e Authentication;
6. mantenha `VITE_ENFORCE_LEGAL_GATE=false` enquanto o backend jurídico não estiver implantado e validado;
7. não implante Cloud Functions enquanto a produção permanecer no modo Spark;
8. execute o checklist de release e restauração.

## Arquitetura

- `src/components`: apresentação;
- `src/contexts`: sessão e orquestração;
- `src/domain`: regras financeiras puras;
- `src/repositories`: contratos de persistência;
- `src/services`: Firebase e chamadas do backend;
- `docs`: operação, segurança, transferência e material comercial.

## Documentação

- `SECURITY.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DATA_MAP.md`;
- `docs/OPERATIONS_RUNBOOK.md`;
- `docs/TRANSFER_CHECKLIST.md`;
- `docs/SALE_DATA_ROOM_INDEX.md`;
- `docs/PUBLIC_SECTOR_PROPOSAL_TEMPLATE.md`;
- `docs/RELEASE_CHECKLIST.md`.

A publicação em GitHub Pages é temporária durante a transição de marca e infraestrutura.

## Modo gratuito e notificações Premium

Sem Cloud Functions implantadas, use:

```env
VITE_BACKEND_MODE=disabled
VITE_EMAIL_NOTIFICATIONS_ENABLED=false
VITE_ENFORCE_LEGAL_GATE=false
VITE_APP_CHECK_ENABLED=true
VITE_REQUIRE_APP_CHECK=true
VITE_APP_CHECK_DEBUG=false
```

O frontend permanece no Firebase Spark. Relatórios e alertas Premium por e-mail poderão ser processados pelo Worker em `worker/email-notifications` depois que ele for implantado e validado. A configuração está descrita em `docs/EMAIL_NOTIFICATIONS_SETUP.md`.

```bash
npm run notifications:validate
npm run notifications:install
npm run notifications:deploy
```
