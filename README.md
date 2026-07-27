# Meu Real

Aplicação web responsiva de organização financeira pessoal com frontend React/Vite, Firebase Authentication, Cloud Firestore, Cloud Functions, assistente Money e integração opcional com Telegram.

## Recursos principais

- receitas, despesas, cartões, faturas, metas e orçamentos;
- assistente financeiro com confirmação antes de gravar;
- Telegram com vínculo temporário e webhook protegido;
- administração de acessos Premium;
- exportação de dados, consentimento versionado e exclusão de conta;
- métricas operacionais agregadas para administradores;
- testes de domínio, frontend e backend.

## Requisitos

- Node.js 20;
- projeto Firebase com Firestore, Authentication e Functions;
- plano com faturamento para funções agendadas;
- bot do Telegram apenas quando a integração for usada.

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

A validação cobre lint, testes, build, Cloud Functions e o arquivo versionado de índices do Firestore.

## Implantação

```bash
npx firebase-tools@latest deploy --only firestore,functions
npm run deploy
```

Segredos necessários para o Telegram:

- `INTEGRATION_LINK_SECRET`;
- `TELEGRAM_BOT_TOKEN`;
- `TELEGRAM_WEBHOOK_SECRET`.

## Configuração de produção

Antes do lançamento:

1. configure domínio definitivo e variáveis `VITE_FIREBASE_*`;
2. revise Termos e Política de Privacidade com apoio jurídico;
3. preencha `VITE_LEGAL_CONTROLLER_NAME` e `VITE_LEGAL_CONTACT_EMAIL`;
4. valide App Check e então habilite `ENFORCE_APP_CHECK`;
5. após testar o backend jurídico, defina `VITE_ENFORCE_LEGAL_GATE=true`;
6. implante regras, índices e funções;
7. configure e teste o webhook do Telegram;
8. execute o checklist de release e restauração.

## Arquitetura

- `src/components`: apresentação;
- `src/contexts`: sessão e orquestração;
- `src/domain`: regras financeiras puras;
- `src/repositories`: contratos de persistência;
- `src/services`: Firebase e chamadas do backend;
- `functions`: operações privilegiadas, Telegram, privacidade e métricas;
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
VITE_TELEGRAM_ENABLED=false
VITE_EMAIL_NOTIFICATIONS_ENABLED=false
VITE_ENFORCE_LEGAL_GATE=false
```

O frontend permanece no Firebase Spark. Relatórios e alertas Premium por e-mail são processados pelo Worker em `worker/email-notifications`, com configuração descrita em `docs/EMAIL_NOTIFICATIONS_SETUP.md`.

```bash
npm run notifications:validate
npm run notifications:install
npm run notifications:deploy
```
