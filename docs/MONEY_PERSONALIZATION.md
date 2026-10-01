# Personalização transparente do Money

## Objetivo

Permitir que o Money use padrões agregados do histórico da própria conta para explicar hábitos de gasto, sem criar memória opaca de conversa e sem alterar lançamentos automaticamente.

## Consentimento

A personalização permanece desativada por padrão.

O usuário precisa ativar explicitamente **Personalizar o Money com meu histórico** nas Preferências do Money. A preferência é salva dentro de `moneySettings` da própria conta e pode ser desativada a qualquer momento.

## Perfil derivado

Quando o opt-in está ativo, o perfil é recalculado no navegador a partir das despesas efetivas dos últimos 120 dias.

Entram na análise:

- despesas positivas;
- data efetiva da movimentação, inclusive a data de compra em compras no cartão;
- categoria predominante por valor;
- forma de pagamento mais frequente.

Não entram:

- receitas;
- poupança;
- transações canceladas;
- transferências;
- lançamentos fora da janela analisada.

## Confiança

A confiança descreve somente o tamanho da amostra usada:

- menos de 4 despesas: histórico insuficiente;
- 4 a 7: confiança baixa;
- 8 a 19: confiança média;
- 20 ou mais: confiança alta.

Ela não avalia a pessoa e não representa score financeiro.

## Privacidade e controle

- o perfil agregado não é persistido como uma nova base;
- a conversa do Money continua sem ser armazenada no Firestore;
- o perfil é calculado somente com dados da própria conta;
- nenhuma informação é cruzada entre usuários;
- desligar o opt-in interrompe imediatamente o uso do perfil;
- transações, categorias, valores e datas não são alterados.

## Conversa

Com a personalização ativada, o Money reconhece perguntas como:

- “O que você aprendeu sobre meus gastos?”;
- “Como eu costumo gastar?”;
- “Qual é o meu perfil financeiro?”;
- “Quais são meus hábitos?”.

A resposta expõe a amostra usada e, quando houver evidência suficiente, a categoria de maior peso e a forma de pagamento mais frequente.

## Sugestão de categoria em rascunhos

Quando a personalização está ativa, o Money pode sugerir a categoria predominante do perfil em um rascunho de despesa somente quando:

- o texto do usuário não identifica uma categoria explicitamente;
- a amostra do perfil é suficiente;
- a categoria ainda existe e aceita despesas.

A sugestão não preenche o rascunho sozinha. O campo **Categoria** permanece vazio até o usuário clicar em **Usar sugestão**. Mesmo depois disso, o lançamento só é salvo pela ação normal **Confirmar lançamento**.

Se o texto já indicar uma categoria, a interpretação explícita do texto sempre prevalece sobre o histórico.

## Limite atual

O Money pode explicar padrões e oferecer uma sugestão opcional de categoria. Ele não cria lançamentos, não troca categorias já identificadas e não executa ações financeiras automaticamente.
