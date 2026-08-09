# Fase 21.1 — segurança definitiva

## Firebase App Check

O frontend possui controles explícitos para habilitar, exigir e depurar o App
Check com reCAPTCHA Enterprise. O token de debug é proibido em produção.

Valores seguros padrão:

```env
VITE_APP_CHECK_ENABLED=false
VITE_REQUIRE_APP_CHECK=false
VITE_APP_CHECK_DEBUG=false
```

## Cloud Functions

As callable functions continuam usando `ENFORCE_APP_CHECK` com valor padrão
desabilitado. O enforcement em produção deve ocorrer somente após acompanhar as
métricas e validar clientes legítimos.

## Firestore

As regras protegem documentos e subcoleções por proprietário, campos
administrativos, categorias, assinantes de notificações, coleções internas e
caminhos não declarados.

## Testes

Os testes usam o Firebase Emulator Suite e cobrem acessos legítimos, isolamento
entre usuários, administração, escalação de privilégios, tipos inválidos e
coleções internas. Mensagens `PERMISSION_DENIED` são esperadas nos testes com
`assertFails`.

## Verificação de segredos

`validate:security-config` examina arquivos rastreados e arquivos novos não
ignorados da árvore atual. Essa verificação não substitui Secret Scanning nem
uma auditoria do histórico Git.

## Validação local

```bash
npm run validate:security
npm audit --omit=dev --audit-level=high
```

## Dependências

A política de versões, auditoria e exceção técnica está documentada em
[`PHASE_21_1_DEPENDENCY_SECURITY.md`](./PHASE_21_1_DEPENDENCY_SECURITY.md).
