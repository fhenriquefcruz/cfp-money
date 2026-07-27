# Meu Real — Reorganização de Navegação · Fase 14.1

## Objetivo

Separar configurações conforme o contexto de uso e manter a aba Perfil dedicada à conta do usuário.

## Perfil

Permanece responsável por:

- plano e assinatura;
- foto;
- nome;
- e-mail;
- senha;
- encerramento da sessão.

Foram removidos do Perfil:

- preferências do ciclo financeiro;
- gerenciamento de cartões;
- seletor duplicado de tema.

O tema continua disponível globalmente no menu lateral e no menu móvel.

## Money

O Money passa a oferecer o botão `Preferências do Money`.

O painel contém:

- tipo de ciclo financeiro;
- dia de início;
- comparação padrão;
- tratamento da poupança.

Os mesmos dados e o mesmo `MoneyContext` continuam sendo usados. Não existe migração.

## Cartões e faturas

A própria Central passa a oferecer `Meus cartões`.

O cadastro, a edição, a ativação e a exclusão de cartões deixam de encaminhar o usuário para Perfil.

## Preservação

A mudança é exclusivamente de navegação e composição visual. Nenhum documento do Firestore é criado, migrado, regravado ou removido durante a instalação.
