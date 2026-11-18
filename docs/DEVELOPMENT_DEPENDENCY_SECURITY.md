# Meu Real — dependências de desenvolvimento e exposição de servidores

**Estado:** mitigação em laboratório. Não é aceite do advisory nem autorização
para merge ou publicação.

## Situação em 18/11/2026

A auditoria reproduzível da issue #203, workflow `44265566465`, registrou:

- `npm audit --omit=dev --json`: **0 vulnerabilidades no grafo de produção**.
- `npm audit --json`: **16 alertas de severidade high**, propagados por
  `picomatch` (GHSA-fc5q-39xc-vjpf; CVE-2026-112366), além de
  25 moderados. O cadastro oficial e o npm não indicavam versão corrigida
  disponível na data da inspeção.
- `npm audit fix --package-lock-only` sem `--force` não eliminou os alertas.
  As sugestões automáticas incluíam mudanças de major/downgrades não
  homologados para Vite, Vitest, Firebase Tools e Tailwind.

A atualização independente de `vite` para **8.1.7** corrige
GHSA-p4f5-76q4-ffq7 na linha 8.1.x. O `package-lock.json` foi
regenerado pelo npm, incluindo versões e integridades de Rolldown;
**não** houve alterações manuais nos hashes do lockfile.

## Medidas compensatórias de menor risco

- `vite.config.js` define `server.host = '127.0.0.1'` e
  `preview.host = '127.0.0.1'` por padrão; os testes de configuração
  preservam essas invariantes.
- Não abrir nem compartilhar o servidor de desenvolvimento ou preview em
  interfaces públicas. Em Codespaces, encaminhar portas apenas em modo
  **privado** e controlar quem tem acesso à sessão.
- Não executar `vite --host 0.0.0.0` ou `vite preview --host 0.0.0.0`
  com portas externas; opções de CLI podem sobrescrever os valores padrão.
- A build de produção do Meu Real serve arquivos estáticos e não utiliza
  o servidor de desenvolvimento Vite. Isso reduz escopo de exposição,
  **não prova** que as ferramentas de CI/desenvolvimento estejam imunes.
- Não consumir padrões glob gerados por usuários diretamente nas ferramentas
  de desenvolvimento. Rejeitar caminhos/padrões arbitrários em automações.
- Conservar `npm ci` e as auditorias `npm audit` no CI; não reduzir
  severidade nem incluir exceção genérica em
  `scripts/validate-production-audit.mjs`.

## Gates independentes no CI

O workflow `Phase 21 security` executa duas tarefas independentes:

- `dependency-audit` mantém a auditoria de segurança de produção e
  desenvolvimento **bloqueante**, inclusive high/critical, sem `continue-on-error`.
- `firestore-policy` executa os testes App Check e Firestore Rules Emulator
  em paralelo, sem depender de uma auditoria de ferramentas dev que ainda
  falha pelo advisory não corrigido.

A aprovação da segunda tarefa **não torna o workflow geral verde**.
Os resultados separados permitem preservar evidência de isolamento UID,
permissões e integridade enquanto a issue #203 permanece bloqueante.

## Pendências para DoD

1. Acompanhar publicação **oficial** de uma versão de `picomatch` que
   remova GHSA-fc5q-39xc-vjpf e confirmar faixas transitivas com
   `npm audit --json`.
2. Gerar novo lockfile com npm, sem `--force`, e revisar o diff;
   rodar `npm ci` e auditorias completa e produção.
3. Reexecutar Vitest, regras/integração Firebase Emulator, PWA Chromium,
   mobile, acessibilidade, build e budgets no **mesmo SHA**.
4. Separar homologação de dependências da decisão sobre clientes PWA
   antigos, Gate manual Firestore Rules, backup, rollback e proteção
   da branch `main`.

**Bloqueio:** um advisory high não remediado continua sendo falha do
workflow `Phase 21 security`. Exceção requer avaliação técnica
documentada, prazo, responsável e autorização humana explícita;
não há exceção aprovada nesta fase.
