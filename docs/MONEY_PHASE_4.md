# Money Core — Fase 4

## Objetivos

- tornar todo o ecossistema Money um benefício Premium;
- explicar claramente o significado das configurações;
- melhorar o alinhamento, a hierarquia e a elegância visual dos painéis;
- preservar integralmente os dados já registrados.

## Proteção Premium

O acesso ao Money passa a ser protegido em três pontos:

1. rota conversacional `/money`;
2. painel analítico do Dashboard;
3. configurações do ciclo financeiro no Perfil.

Usuários gratuitos continuam vendo uma apresentação elegante do benefício e podem assinar o plano. Nenhum dado é apagado quando o plano expira.

## Refinamentos visuais

- `Card` passa a aceitar `className`, corrigindo painéis que já tentavam usar `h-full`, `overflow-hidden` e `p-0`;
- Dashboard reorganizado em uma grade executiva;
- Money ganha layout com painel explicativo e chat alinhado;
- configurações agrupadas em seções com descrições;
- indicador Premium no menu;
- bloqueios Premium em versão completa ou compacta.

## Preservação

Esta fase não altera:

- documentos de transações;
- categorias;
- metas;
- orçamentos;
- saldos;
- configurações do Money já salvas;
- regras do Firestore.

As preferências existentes permanecem armazenadas e voltam a ser exibidas quando o acesso Premium estiver ativo.
