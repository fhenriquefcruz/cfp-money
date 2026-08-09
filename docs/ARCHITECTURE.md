# Arquitetura do Meu Real

## Camadas

1. Frontend React/Vite publicado como aplicação estática.
2. Firebase Authentication para identidade.
3. Cloud Firestore para dados financeiros segregados por UID.
4. Cloud Functions para operações privilegiadas, integrações e automações.
5. GitHub Actions para lint, testes e build.

## Fronteiras de confiança

- O navegador não recebe segredos do backend.
- Alterações administrativas são executadas por função autenticada.
- Dados financeiros ficam em `users/{uid}/...`.
- Coleções operacionais de integração e auditoria não são acessíveis pelo cliente.

## Componentes transferíveis

- repositório Git;
- projeto Firebase/Google Cloud;
- domínio e hospedagem;
- secrets e parâmetros;
- documentação e identidade visual.
