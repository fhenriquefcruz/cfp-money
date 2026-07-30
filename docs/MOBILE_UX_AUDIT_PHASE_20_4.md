# Auditoria móvel profunda — Fase 20.4

## Problemas corrigidos

- barra de mês do Dashboard acessível durante a rolagem;
- saldo mensal e indicadores executivos mais compactos;
- previsão e saúde financeira em composição 2×2 adaptativa;
- painel do Money condensado no Dashboard;
- chat do Money com altura segura, tipografia e campo de envio compactos;
- período de cartões persistente e quatro indicadores em grade 2×2;
- Categorias em grade adaptativa, com ações próprias para toque;
- modal de transação acima da navegação inferior;
- rodapé do modal sempre visível e conteúdo com rolagem independente;
- data e pagamento empilhados abaixo de 430 px;
- menu “Mais” sem bloquear as cinco abas principais.

## Larguras auditadas

- 320 px;
- 360 px;
- 390 px;
- 430 px;
- 640 px;
- desktop.

## Critérios automáticos

`npm run validate:responsive` bloqueia regressões nos z-index críticos, no modal,
na navegação, no formulário de transação, nos layouts compactos e no chat.
