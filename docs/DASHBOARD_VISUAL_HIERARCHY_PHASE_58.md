# Meu Real — Direção de arte e arquitetura do Dashboard (Fase 58)

## Hierarquia de leitura

1. **Resultado do período e leituras prioritárias:** visão executiva de receitas, despesas e avisos.
2. **Controle de pagamentos e poupança:** quadros distintos: pagamento em azul mineral/status, reservas em verde jade/efeito positivo.
3. **Indicadores breves:** Ritmo de gastos e Saúde financeira minimalistas; o Money apresenta projeção de fechamento e aviso contextual, sem informações repetidas do restante da página.
4. **Evolução financeira:** área de leitura mais ampla, com legenda explícita, série temporal, seleção de 6/12 meses e detalhe da competência.
5. **Ranking de gastos:** bloco argila com líder em destaque, Top 5 das categorias por valor e participação, mesma cor nos lançamentos da área Transações e acesso direto aos registros.
6. **Planejamento:** metas e alertas de orçamento em faixa própria, depois das leituras analíticas.
7. **Histórico:** transações por último, com rolagem interna (mouse, toque e teclado), sem alongar a página inteira.

## Diretrizes cromáticas

- Base do produto: graphite/mineral/bronze.
- Semântica: verde/sucesso para reservas e boas notícias, âmbar/atenção e vermelho/problemas; nenhuma categoria terá sua cor automaticamente associada a risco.
- Leitura dos painéis: tons moderados de azul mineral (pagamentos/evolução), jade (reserva/saúde), oliva/bronze (ritmo), ametista (metas), argila (composição) e cinza mineral (histórico).
- Áreas diferenciadas por **barra superior discreta, superfície tintada e ícone**. Não usar grandes fundos saturados que desviem atenção do conteúdo.
- Não usar cor isoladamente como indicador; sempre acompanhar rótulos, porcentagens, valores e informações explicativas.

## Integridade funcional

- Dia de fechamento e vencimento dos cartões configurados exclusivamente no módulo Cartões; transações vinculam o cartão já configurado, sem duplicidade do campo.
- Cálculo das faturas e parcelas continua sendo o domínio financeiro existente.
- O painel histórico utiliza até 200 registros do mês, em um viewport rolável, com link para todas as transações. Não adicionar paginação silenciosa.
- Comparativos por categoria continuam baseados nos lançamentos efetivos, sem dupla contagem de pagamento de faturas.
- Gráficos responsivos: dimensões por CSS, área de desenho estável, controles com touch targets e legendas fora do gráfico.
- Respeitar redução de animação e foco visível em lista rolável, ações e chips.

## Referências

- [IBM Carbon — cor no design de dados](https://www.ibm.com/design/language/data-visualization/design/basics/)
- [IBM Carbon — paleta categórica](https://v10.carbondesignsystem.com/data-visualization/color-palettes/)
- [WCAG 2.2 — Uso da cor](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

## Critério de aceitação

Lint, formatação, testes unitários, mobile, acessibilidade, regressão visual, PWA, segurança e smoke de publicação verdes antes de integração em main.
