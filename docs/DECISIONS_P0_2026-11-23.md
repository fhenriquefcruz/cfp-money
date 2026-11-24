# Decisões de regra — P0, 23/11/2026

Decisões confirmadas pelo proprietário do Meu Real nesta revisão.

| Regra                      | Opção escolhida                                                         | Consequência                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 — parcelas              | Cada parcela entra no mês do vencimento informado                       | Transações, Dashboard, Orçamentos, Relatórios e Money usam a competência de cada parcela. Data da compra permanece no detalhe. Exemplo: bike em 3× com vencimentos 05/12, 05/01 e 05/02. |
| R2 — indicadores           | Resultado = receitas − despesas; Poupado = aportes − retiradas          | O rótulo “Saldo” deixa de representar o resultado do período.                                                                                                                            |
| R3 — resultado sem destino | Mostrar “Não alocado”                                                   | Valor apenas informativo; nenhuma transferência automática.                                                                                                                              |
| R4 — pendências            | Sem categoria e outras inconsistências verificáveis, separadas por tipo | Cada tipo tem sua própria contagem; nenhuma heurística altera lançamentos automaticamente.                                                                                               |
| R5 — acesso e plano        | Administrador com exceção de acesso; nome “Premium”                     | A exceção aparece identificada no Perfil e na linha da própria conta no Admin. O indicador de Premium ativo conta somente planos ativos.                                                 |

Nenhum registro financeiro existente é reclassificado automaticamente por essas decisões.
