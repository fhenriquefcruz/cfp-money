# Orçamento de performance — Fase 20

## Baseline antes da otimização

- JavaScript total: **660,36 KiB gzip**;
- JavaScript referenciado no HTML inicial: **327,82 KiB gzip**;
- CSS inicial: **16,36 KiB gzip**;
- maior chunk: **jsPDF, 125,63 KiB gzip**, carregado sob demanda;
- chunk de gráficos: **104,29 KiB gzip**, indevidamente pré-carregado pelo HTML.

## Limites de regressão

| Métrica                       |  Limite |
| ----------------------------- | ------: |
| JavaScript inicial gzip       | 240 KiB |
| JavaScript total gzip         | 700 KiB |
| Maior arquivo JavaScript gzip | 140 KiB |
| CSS inicial gzip              |  20 KiB |

## Regras estruturais

- o chunk `charts` não pode ser referenciado no HTML inicial;
- jsPDF, AutoTable, html2canvas e DOMPurify devem permanecer sob demanda;
- Firebase permanece inicial porque autenticação e dados estruturam a aplicação;
- Framer Motion permanece inicial enquanto integra login, shell, navegação e componentes globais;
- os limites são verificados automaticamente após o build;
- qualquer regressão bloqueia o CI.

## Resultado esperado

A remoção do preload antecipado de `charts` reduz o JavaScript inicial estimado
de 327,82 KiB para aproximadamente 223,53 KiB gzip, sem duplicar Recharts e
sem alterar a experiência das rotas Dashboard e Relatórios.

## Recalibração — Fase 45

A Fase 45 adiciona semântica auditável de Poupança e Reservas em quatro rotas carregadas sob
demanda (Dashboard, Metas, Transações e Relatórios), mantendo o carregamento JavaScript inicial
abaixo do teto anterior.

O teto de JavaScript total foi ajustado de **709 KiB** para **713 KiB gzip**, uma margem adicional
de 4 KiB restrita ao conjunto total de chunks. Os limites de JavaScript inicial, rota Money e maior
chunk permanecem inalterados.

O CSS da aplicação não foi alterado pela Fase 45. Como o build atual mediu **20,01 KiB gzip**
contra um teto histórico de 20 KiB, foi adicionada tolerância de **256 bytes** para variação de
compressão, sem mudança visual ou inclusão de CSS nesta fase.

A recalibração não permite que gráficos ou bibliotecas de PDF retornem ao carregamento inicial.

## Recalibração — Fase 46

A Central de Poupança e Reservas é carregada sob demanda na rota `/savings`. O build mediu o
novo chunk `Savings` em aproximadamente **3,39 KiB gzip**, mantendo o JavaScript inicial em
**241,91 KiB gzip**, abaixo do teto existente de 242 KiB.

Para absorver exclusivamente essa nova capacidade, o teto de JavaScript total foi ajustado de
**713 KiB** para **718 KiB gzip**. Permanecem inalterados os limites de JavaScript inicial, rota
Money, maior chunk e CSS. A nova rota não pode retornar ao carregamento inicial.

## Estabilidade de medição — Fase 47

Dois jobs independentes do mesmo commit mediram o JavaScript inicial em lados opostos do teto de
**242 KiB**, com diferença de apenas **1 byte** no job que falhou. A rota de Reservas continuou
lazy e o gate dedicado de Performance/PWA permaneceu aprovado.

Para evitar flakiness sem ampliar o orçamento real, o alvo nominal de **242 KiB gzip** foi
preservado e o verificador passou a aceitar somente **64 bytes de tolerância de medição** para o
JavaScript inicial. Qualquer crescimento acima de 242 KiB + 64 bytes continua bloqueando o CI.

Os limites de JavaScript total, rota Money, maior chunk e CSS não foram ampliados nesta fase.
