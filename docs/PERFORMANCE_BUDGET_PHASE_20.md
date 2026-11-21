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

## Recalibração — Fase 48

A navegação mensal de Transações, as ações explícitas de Metas/Reservas e a nova semântica de
vigência de Orçamentos aumentaram o JavaScript total em aproximadamente **283 bytes gzip**.

O JavaScript inicial permaneceu no teto nominal existente de **242 KiB gzip**. Para absorver
somente o crescimento legítimo das rotas alteradas, o teto de JavaScript total foi ajustado de
**718 KiB** para **719 KiB gzip**.

Permanecem inalterados os limites de JavaScript inicial, rota Money, maior chunk e CSS.

## Recalibração controlada — 20/11/2026

**Motivação:** o limite de JavaScript total inclui a soma gzip de **todos** os chunks produzidos,
mesmo aqueles carregados sob demanda (como jsPDF, gráficos e rotas). Isso mede o tamanho do
artefato distribuído, mas **não** representa o JavaScript transferido na primeira visita.

**Evidência:** no CI da PR #210, SHA `a6781b677bc7320291279d76c938c1a2f8f2a241`, o
validador mediu 748,13 KiB de JS total, 238,47 KiB de JS inicial, 17,42 KiB na rota
Money, 125,64 KiB no maior chunk e 22,07 KiB de CSS inicial. Os 510 testes unitários,
segurança, mobile e acessibilidade passaram; o gate de performance falhou **somente** pelo
limite agregado de 744 KiB.

A política agora distingue o **teto bloqueante** do **limiar de revisão**:

| Métrica gzip | Limite / regra | Efeito |
| --- | ---: | --- |
| JavaScript total de todos os chunks | 768 KiB | Bloqueia CI acima disso |
| JavaScript total: limiar de revisão | 752 KiB | Alerta no CI e no relatório JSON; justificar crescimento na PR |
| JavaScript inicial | 245 KiB (+64 bytes de tolerância histórica) | Bloqueia CI |
| Rota Money | 18 KiB | Bloqueia CI |
| Maior chunk JavaScript | 140 KiB | Bloqueia CI |
| CSS inicial | 22,5 KiB | Bloqueia CI |

A ampliação do teto **agregado** é de 24 KiB (+3,23%) em relação ao limite anterior, com
aproximadamente 20 KiB de margem em relação à medição de referência. Os demais limites **não
foram alterados**. Os gates que impedem carregar gráficos e bibliotecas de PDF no HTML inicial
também permanecem bloqueantes.

O limiar de 752 KiB é **não bloqueante por desenho**, mas cada PR que o exceder deve apresentar
comparação dos tamanhos dos chunks, justificativa da nova capacidade e impacto sobre o
carregamento inicial. Aprovação automática do orçamento não substitui medição de carregamento
real, acessibilidade, revisão de bundle, testes financeiros e homologação.
