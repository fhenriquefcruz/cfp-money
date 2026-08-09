# Manual operacional

## Validação

```bash
nvm use 20
npm ci
npm install --prefix functions
npm run validate:all
```

## Implantação

```bash
npx firebase-tools@latest deploy --only firestore:rules,functions
npm run deploy
```

## Segredos obrigatórios

## Parâmetros e variáveis públicas

- `ENFORCE_APP_CHECK`;
- variáveis `VITE_FIREBASE_*`;
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

- revisar erros das Cloud Functions;
- verificar custos;
- revisar vulnerabilidades sem usar atualização forçada;
- testar exportação e cancelamento de exclusão;
- testar restauração e continuidade operacional;
- conferir permissões de administradores.
