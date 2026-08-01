# Fase 21 — confiabilidade operacional

## Objetivo

Preparar o Meu Real para operação segura, observável, recuperável e
comercialmente sustentável.

## Etapas

| Etapa | Escopo                         | Estado       |
| ----- | ------------------------------ | ------------ |
| 21.1  | Segurança definitiva           | Em validação |
| 21.2  | Observabilidade operacional    | Planejada    |
| 21.3  | Backup e recuperação           | Planejada    |
| 21.4  | Produção e prontidão comercial | Planejada    |

## Critérios gerais

- nenhum segredo presente na árvore atual do projeto;
- proteção dos dados financeiros por proprietário;
- campos administrativos alterados somente pelo backend;
- Firebase App Check com ativação progressiva;
- regras do Firestore testadas no Emulator Suite;
- validação dedicada de segurança no CI;
- procedimentos documentados de implantação e reversão.
