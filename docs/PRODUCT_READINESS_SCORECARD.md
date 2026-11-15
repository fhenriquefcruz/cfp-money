# Meu Real — Régua de progresso de conclusão

Atualização: **15/11/2026**. Referência: `main` no SHA
`be06bfb35de0831acad754e9f486daaf93c71fa9`, auditoria técnica de
30/10/2026 e trabalho verificado nas PRs draft #168–#171.

## Como calcular

**Índice de prontidão técnica para conclusão** = pontos com **evidência de
implementação/teste** divididos por 32 critérios, distribuídos igualmente
entre os oito gates do caderno técnico. Cada gate contém quatro critérios
objetivos; um critério ganha um ponto quando há evidência verificável
identificada, inclusive PR draft. Não pontuamos hipóteses nem alegações de
produção sem verificação. O índice **não** significa porcentagem de horas
consumidas, funcionalidades homologadas ou porcentagem implantada.

| Gate                         | Evidências identificadas                                                                                          | Pontos | Pendências que impedem quatro pontos                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------- |
| 0. Semântica e centavos      | Contrato financeiro documentado; cenários de compra/fatura e parcelas no domínio                                  |    2/4 | Centavos exatos em todos os seletores; contrato canônico entre todos os consumidores              |
| 1. Paridade de resumos       | Correções implementadas nas PRs #168 (Money) e #170 (Worker), ainda draft                                         |    2/4 | Paridade comprovada de Relatórios/Dashboard/Money/Worker no mesmo regime; metas/alertas do Worker |
| 2. Escritas e segurança      | Eventos de pagamento idempotentes; estorno novo com ID canônico; Rules de criação única e UID testadas na PR #171 |    3/4 | Compatibilidade com clientes legados, reconciliação histórica total e rollout autorizado          |
| 3. Cartões históricos        | Vínculos estruturados `transactions.cardId` e centro de cartão identificados no código                            |    1/4 | Snapshots históricos de ciclo; conciliação legada humana e reversível; E2E completo               |
| 4. Patrimônio e notificações | Módulos de reservas e metas presentes no código auditado                                                          |    1/4 | Paridade de saldo efetivo, Worker e alertas; testes intersessão e sem dupla contagem              |
| 5. Modularidade              | Funções financeiras puras extraídas e testadas                                                                    |    1/4 | `AppContext` ainda extenso; isolamento integral de persistência; estados multissessão             |
| 6. Experiência e acesso      | Dashboard progressivo implementado em PR #169; CI automatizada de mobile/a11y disponível                          |    2/4 | Aceite visual de baseline; experiência homogênea dos 11 módulos                                   |
| 7. Homologação e release     | Não identificado aceite final                                                                                     |    0/4 | Matriz completa com dados consentidos; plano de backup/rollback; aceite; verificação de produção  |

**Total: 12/32 = 37,5%, exibido como aproximadamente 38% de prontidão.**

## Regras para avançar o percentual

- Não aumentar o percentual apenas por commits, por subir um orçamento, por
  build, por PR draft ou por design visual; exigir nova evidência de um critério.
- Quando um gate falhar, uma evidência for invalidada ou houver regressão,
  reduzir a pontuação e explicar a causa.
- Manter separadamente o status de **código**, **CI**, **homologação**,
  **merge** e **produção**. Nesta atualização as PRs #168–#171 estão abertas
  como draft; não há evidência de merge ou deploy dessas mudanças.
- Registrar o SHA de cada aferição e atualizar este quadro em fases relevantes.
- O critério 7 não será marcado por build de artefato de GitHub Pages em PR.

## Gatilhos de próxima aferição

Validar totalmente a PR #171 com idempotência, histórico legado, Emulator,
mobile, a11y e performance; homologar depois sua compatibilidade de release.
Fechar paridade de MR-001/MR-002 e MR-004; revisar snapshots dos cartões,
`amount` legado e múltiplas sessões antes de tratar o produto como pronto.

> Esta estimativa foi construída a partir dos critérios técnicos disponíveis,
> não de uma auditoria de produção realizada hoje.
