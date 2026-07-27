# Fase 15 — Separação dos testes

O Vitest do frontend passa a executar somente arquivos de teste dentro de `src`.

Os testes de Cloud Functions continuam sendo executados separadamente pelo Node Test Runner por meio de:

`npm run functions:validate`

O arquivo `.nvmrc` fixa Node.js 20 como versão recomendada para desenvolvimento e implantação das Cloud Functions.
