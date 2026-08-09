# Modo Spark

## Variáveis

```env
VITE_BACKEND_MODE=disabled
VITE_EMAIL_NOTIFICATIONS_ENABLED=false
VITE_ENFORCE_LEGAL_GATE=false
VITE_APP_CHECK_ENABLED=true
VITE_REQUIRE_APP_CHECK=true
VITE_APP_CHECK_DEBUG=false
```

O enforcement do App Check permanece ativo no Firestore e Authentication.

## Comportamento

- o frontend não chama Cloud Functions;
- o Legal Gate usa uma subcoleção do próprio usuário;
- a exportação é montada no navegador;
- a exclusão é registrada para atendimento manual;
- o painel administrativo mantém os dados, mas ações privilegiadas exigem backend.

O código das Cloud Functions não é removido.

Depois que o Worker estiver implantado e o teste de saúde estiver aprovado, altere somente:

```env
VITE_EMAIL_NOTIFICATIONS_ENABLED=true
```
