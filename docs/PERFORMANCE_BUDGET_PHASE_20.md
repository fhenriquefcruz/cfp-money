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
