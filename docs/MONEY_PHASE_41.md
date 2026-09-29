# Fase 41 — Personalização transparente do Money

## Objetivo

Permitir que o Money adapte análises ao histórico individual de cada conta sem criar uma memória opaca de conversa e sem compartilhar dados entre usuários.

## Regra de ativação

A personalização é desativada por padrão.

O usuário precisa ativar explicitamente **Personalizar o Money com meu histórico** nas Preferências do Money. A escolha fica registrada dentro de `moneySettings` no documento da própria conta.

## Como o perfil é formado

Quando autorizado, o perfil é recalculado no navegador a partir das despesas recentes da própria conta.

A janela padrão considera até 120 dias e deriva apenas agregados:

- quantidade de despesas analisadas;
- categorias com maior participação;
- forma de pagamento mais frequente;
- descrições não recorrentes que aparecem repetidamente.

Poupança não entra como consumo. Descrições de parcelas e lançamentos marcados como recorrentes não são usadas para inferir repetição comportamental.

## Confiança

O Money explicita a quantidade de dados usada:

- menos de 4 despesas: histórico insuficiente;
- 4 a 7: confiança baixa;
- 8 a 19: confiança média;
- 20 ou mais: confiança alta.

A confiança não é uma avaliação da pessoa. Ela informa somente o tamanho da amostra disponível.

## Privacidade

- o perfil derivado não é persistido como novo documento;
- a conversa continua sem ser salva no Firestore;
- não há treinamento de modelo com os dados do usuário;
- não há cruzamento de histórico entre contas;
- desativar a preferência interrompe imediatamente o uso do perfil derivado;
- transações originais não são alteradas.

## Conversa

Com a personalização ativada, perguntas como:

- “O que você aprendeu sobre meus gastos?”
- “Como eu costumo gastar?”
- “Quais são meus hábitos?”

retornam as evidências agregadas usadas pelo Money.

Nesta fase, o perfil é explicativo e analítico. Ele ainda não altera automaticamente categorias, valores ou lançamentos.
