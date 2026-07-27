# Money — Cartões diretamente no chat · Fase 8

## Entrega

- reconhecimento do cartão pelo nome ou quatro últimos números;
- seleção automática quando há somente um cartão ativo;
- escolha manual quando a mensagem é ambígua;
- interpretação de `3x`, `3 vezes` e `3 parcelas`;
- cálculo da primeira fatura;
- prévia dos vencimentos e valores;
- confirmação obrigatória;
- criação atômica de parcelas;
- retorno dos IDs criados;
- desfazer a compra inteira em lote;
- correção dos alertas de orçamento para considerar apenas o mês da transação;
- nenhum uso de API paga.

## Exemplos

- `Comprei R$ 600 no Nubank em 3 vezes no mercado`
- `Paguei R$ 180 no cartão no dentista hoje`
- `Comprei R$ 1.250,90 no cartão final 1234 em 5x`

## Regras

- Sem cartão cadastrado: direciona ao Perfil.
- Mais de um cartão e nenhum nome identificado: exige seleção.
- Parcelamento sem quantidade: exige preenchimento.
- Nada é salvo antes da confirmação.
- Desfazer remove todas as parcelas da compra.
