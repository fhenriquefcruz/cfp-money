# Fase 21.1 — segurança das dependências

## Decisão técnica

A correção mantém React 18 e atualiza somente os componentes necessários:

- Firebase `10.14.1`;
- Firebase Rules Unit Testing `3.0.4`;
- Firebase CLI `15.24.0`;
- React Router DOM `7.18.1`;
- Undici transitivo sobrescrito para `6.28.0`.

A atualização do Firebase para a versão 12 foi descartada nesta fase porque
aumentou o bundle do SDK acima do orçamento de performance já estabelecido.

## React Router

A versão 7.18.1 corrige as vulnerabilidades aplicáveis à navegação declarativa,
incluindo o redirecionamento externo por caminhos com barra invertida.

O alerta `GHSA-qwww-vcr4-c8h2` permanece associado ao React Router 7.18.1,
mas o próprio aviso oficial restringe o impacto às APIs RSC instáveis.

O Meu Real:

- usa `HashRouter`;
- opera em modo declarativo;
- não usa React Server Components;
- não usa Framework Mode;
- não usa Data Mode;
- não possui `RouterProvider`, roteadores de dados ou handlers RSC.

A validação automatizada bloqueia qualquer introdução futura dessas APIs.

## Undici

Todas as dependências transitivas devem resolver exclusivamente em
`undici@6.28.0`. Essa versão pertence à linha 6.x suportada em Node 18.17 ou
superior e corrige as vulnerabilidades existentes em `6.19.7`.

## Critérios de aprovação

A Fase 21.1 somente pode ser aprovada quando:

1. as versões declaradas e instaladas correspondem às versões documentadas;
2. nenhuma versão vulnerável do Undici permanece na árvore;
3. nenhuma vulnerabilidade de produção existe além da exceção RSC documentada;
4. nenhuma vulnerabilidade alta ou crítica existe fora dessa exceção;
5. o scanner de segredos e as regras do Firestore passam;
6. frontend, Functions, worker, índices, responsividade e performance passam;
7. E2E, acessibilidade e PWA passam;
8. o patch não possui erros de formatação ou espaços inválidos.
