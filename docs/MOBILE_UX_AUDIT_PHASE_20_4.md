# Auditoria móvel profunda — Fase 20.4

## Problemas corrigidos

- barra de mês do Dashboard acessível durante a rolagem;
- saldo mensal e indicadores executivos mais compactos;
- previsão e saúde financeira em composição 2×2 adaptativa;
- painel do Money condensado no Dashboard;
- chat do Money com altura segura e campo de envio compatível com iPhone;
- período de cartões persistente e quatro indicadores em grade 2×2;
- Categorias em grade adaptativa, com ações próprias para toque;
- modal de transação acima da navegação inferior;
- rodapé do modal sempre visível e conteúdo com rolagem independente;
- rolagem do formulário ajustada automaticamente quando o teclado é aberto;
- campo focado reposicionado para não ficar escondido pelo teclado ou pelo rodapé;
- altura dos modais sincronizada com o `VisualViewport`;
- data e pagamento empilhados abaixo de 430 px;
- menu “Mais” sem bloquear as cinco abas principais;
- área segura superior preparada para iPhones com notch;
- controles móveis essenciais com alvo mínimo de 44 px.

## Larguras tratadas estruturalmente

- 320 px;
- 360 px;
- 390 px;
- 430 px;
- 640 px;
- desktop.

Essas larguras foram tratadas no código e protegidas contra regressões estruturais. A certificação
visual e funcional em Safari, Chrome Android, rotação, teclado aberto e PWA instalada pertence à
Fase 20.5.

## Critérios automáticos

`npm run validate:responsive` bloqueia regressões nos z-index críticos, no modal, na navegação,
no formulário de transação, nos layouts compactos, no chat, nas áreas seguras, nos alvos de toque
e no tratamento do teclado móvel.

O validador confirma contratos de implementação. Ele não substitui testes renderizados em
navegador ou inspeção em dispositivos reais.
