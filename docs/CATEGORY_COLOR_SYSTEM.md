# Meu Real · Linguagem cromática das categorias (Fase 56)

## Objetivo

Distinguir **tipo de movimentação** (receita, despesa, transferência, reserva), **status** (pago, pendente, atrasado) e **categoria de consumo** sem conflitar esses conceitos.

## Três camadas

1. **Produto:** grafite, superfícies minerais e bronze nas ações/hierarquia.
2. **Semântica financeira:** tokens de sucesso, atenção e risco continuam nos montantes e nos compromissos, nunca representam o tema da categoria.
3. **Categoria:** paleta qualitativa em tons argila, azul, ametista, jade, rosa, oliva etc.; ícone + nome + participação numérica sempre acompanham a cor.

## Regras de integridade

- Categoria cadastrada com cor hexadecimal válida: respeitar essa escolha em todas as telas; não alterar registros antigos.
- Sem cor: fallback determinístico baseado em ID/nome, sem variar com mês, ordem ou ranking.
- Na composição, usar valores das despesas efetivas: excluir receitas, poupanças/reservas, transferências, canceladas, registros sem valor positivo e valores não numéricos.
- Mesma fonte de registros: Dashboard reaproveita o cálculo mensal existente; Transações analisa o conjunto filtrado (mês, período, método, categoria e busca).
- Exibir valores e participação percentual, inclusive para as categorias pequenas. Quando o ranking é longo, agregar o restante de forma identificada e permitir expansão.
- Sem dupla contagem com Cartões: compras aparecem **uma vez** por transação, não outra vez pelo pagamento da fatura.
- Uma categoria é um atributo, não uma indicação de "bom" ou "ruim". Cor categórica não é status financeiro.

## Acessibilidade

- Evitar transmitir informação apenas por tonalidade: nome, símbolo, valor, percentual, ações com rótulos.
- Testar contrastes dos indicadores importantes conforme WCAG 2.2 AA e ajustes visual/móvel em temas claro e escuro.
- Elementos de controle têm foco visível, sem exigir que o usuário interprete a cor de uma barra.
- Paleta qualitativa não é gradiente de risco nem ordem numérica.

## Referências de design

- IBM Carbon · [Color palettes](https://v10.carbondesignsystem.com/data-visualization/color-palettes/)
- IBM Design Language · [Data visualization basics](https://www.ibm.com/design/language/data-visualization/design/basics/)
- Adobe Spectrum · [Using color](https://spectrum.adobe.com/page/using-color)
- W3C WCAG 2.2 · [Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) e [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
