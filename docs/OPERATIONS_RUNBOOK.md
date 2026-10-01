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

Enquanto a produção permanecer no modo Spark, não implante Cloud Functions. O LegalGate continua funcional nesse modo porque a aceitação é persistida diretamente no Firestore pelo fallback `sparkPrivacy`.

## Segredos obrigatórios

## Parâmetros e variáveis públicas

- variáveis `VITE_FIREBASE_*`;
- `VITE_BACKEND_MODE=disabled`;
- `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` em produção; mantenha `false` apenas em ambientes locais/de teste quando os envios não devam ser expostos;
- `VITE_ENFORCE_LEGAL_GATE=true`;
- `VITE_APP_CHECK_ENABLED=true`;
- `VITE_REQUIRE_APP_CHECK=true`;
- `VITE_APP_CHECK_DEBUG=false`;
- `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`;
- identidade e contato jurídico.

## Notificações Premium por e-mail

O Worker externo e o gate protegido foram validados em 29/09/2026. A produção do frontend está publicada com `VITE_EMAIL_NOTIFICATIONS_ENABLED=true`.

Em operação:

- preserve o consentimento explícito do usuário;
- confirme periodicamente o health do Worker e os logs do provedor;
- use o workflow **Premium email activation gate** para revalidar o endpoint sem novo deploy;
- em incidente, desative primeiro a flag do frontend e suspenda o cron do Worker se necessário.

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
