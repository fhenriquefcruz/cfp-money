# Meu Real — dependências de desenvolvimento e exposição de servidores

**Estado:** registro de diagnóstico e revalidação em laboratório. A aprovação de CI
não representa autorização para merge, publicação de Rules ou deploy de produção.

## Diagnóstico histórico de 18/11/2026 (antes da retirada do advisory)

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

## Revalidação após retirada do advisory (18–19/11/2026 UTC)

O GitHub Advisory [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
passou a indicar **Withdrawn em 18/11/2026**. Os 16 alertas high
descritos acima são um **registro histórico**, não uma afirmação de que o
advisory permanece ativo. A retirada não prova ausência de outras
vulnerabilidades ou segurança irrestrita do ambiente.

O job de auditoria que falhava no workflow
[Phase 21 security, run 44267994641](https://github.com/fhenriquefcruz/cfp-money/actions/runs/44267994641)
foi reexecutado na PR #204, SHA
`3eeb870ed8c22f8b7af5a8cc673c0c4173ccb716`, **sem alteração dos
validadores**. Tanto `Dependency and production configuration audit`
quanto `App Check runtime and Firestore UID rules` terminaram em
`success`; os **sete workflows** associados àquele SHA terminaram em
`success` após o rerun. Isso não significa que os sete workflows já
foram aprovados no SHA final de uma futura integração.

A correção Vite 8.1.7, a proteção do servidor de desenvolvimento e o
lockfile regenerado permanecem sujeitos a revisão. **Não introduzir
exceção ao audit** com base apenas na retirada do advisory. Se a
auditoria voltar a falhar, examinar os advisories atuais antes de
classificar ou mitigar riscos.

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
  em paralelo, sem depender do resultado da auditoria de ferramentas dev.

A aprovação da segunda tarefa **não torna o workflow geral verde** quando
a primeira falha. A reexecução da PR #204 passou nas duas tarefas, mas
um novo SHA exige nova validação. A issue #203 conserva o histórico de
triagem e os requisitos de revisão antes de release.

## Pendências para DoD

1. Confirmar o estado atual de todos os advisories com `npm audit --json`
   e `npm audit --omit=dev --json`; não tratar alertas históricos retirados
   como vulnerabilidades ainda ativas nem ignorar alertas novos.
2. Preservar o lockfile gerado pelo npm, sem `--force`, revisar o diff
   e executar `npm ci` e auditorias completa e de produção.
3. Reexecutar Vitest, regras/integração Firebase Emulator, PWA Chromium,
   mobile, acessibilidade, build e budgets no **mesmo SHA candidato**.
4. Homologar separadamente clientes PWA antigos, gate manual de Rules,
   baseline ativo, backup, rollback e proteção da branch `main`.

**Política:** qualquer advisory high ativo e não remediado continua
bloqueando o workflow `Phase 21 security`. Exceção requer avaliação
formal, prazo, responsável e autorização humana explícita; não foi
criada exceção nesta fase. Mesmo com CI verde, o release permanece
bloqueado até homologação operacional e autorização específica.
