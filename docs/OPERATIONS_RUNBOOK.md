# Manual operacional

## Validação

```bash
nvm use 20
npm ci
npm run validate:all
```

A validação inclui o código versionado das Cloud Functions, mas não implica sua implantação no modo Spark atual.

## Implantação

A produção atual é publicada no GitHub Pages após merge/push em `main`.

Para publicação manual apenas do frontend:

```bash
npm run deploy
```

Enquanto a produção permanecer no modo Spark, não implante Cloud Functions.

## Segredos obrigatórios

## Parâmetros e variáveis públicas

- variáveis `VITE_FIREBASE_*`;
- `VITE_BACKEND_MODE=disabled`;
- `VITE_EMAIL_NOTIFICATIONS_ENABLED=false`;
- `VITE_ENFORCE_LEGAL_GATE=false`;
- `VITE_APP_CHECK_ENABLED=true`;
- `VITE_REQUIRE_APP_CHECK=true`;
- `VITE_APP_CHECK_DEBUG=false`;
- `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`;
- identidade e contato jurídico.

## Incidente

1. preservar logs;
2. identificar usuários e dados afetados;
3. suspender a integração ou função vulnerável;
4. rotacionar segredos;
5. corrigir, testar e implantar;
6. documentar causa, impacto e ações;
7. avaliar comunicação jurídica e aos titulares.

## Rotinas mensais

- revisar métricas e erros do frontend em produção;
- conferir métricas do App Check e o enforcement no Firestore e Authentication;
- confirmar que a produção permanece no modo Spark sem Cloud Functions implantadas;
- verificar custos e uso dos serviços Firebase;
- revisar vulnerabilidades sem usar atualização forçada;
- testar exportação e cancelamento de exclusão;
- testar restauração e continuidade operacional;
- conferir permissões de administradores.
