# Meu Real — Fase 66.5 · Evidência de auditoria de cartões

## Objetivo

Acompanhar a qualidade dos arquivos utilizados na conferência de cartões, compras, faturas, pagamentos, estornos e vínculos históricos. A auditoria é **local e exclusivamente consultiva**: não se conecta ao Firestore, não altera dados, não corrige vínculos, não importa transações e não confirma saldos bancários.

## Pré-requisitos

- Exportação **atual** obtida pelo titular em **Exportar meus dados**.
- Opcionalmente, exportação histórica para comparação. A data do arquivo anterior deve preceder a data do atual.
- Arquivos JSON armazenados fora do repositório e de pastas publicadas. **Nunca fazer commit de exportações reais, comprovantes, chaves ou dados financeiros individuais.**

## Comando

No terminal do projeto, após `npm ci`:

```bash
npm run audit:cards -- /caminho/seguro/atual.json --month 2026-10 --compare /caminho/seguro/anterior.json
```

Sem comparação histórica, omita `--compare`. Se a exportação possuir data confiável, `--month` também é opcional; use `--month` para selecionar explicitamente a competência da fatura. O comando imprime um JSON agregado no terminal. Evite salvar relatórios contendo informações reais em locais públicos.

## Como interpretar

- `status` é a classificação dos cálculos de cartões no **mês selecionado**: `ok`, `review` ou `critical`.
- `evidence.level` avalia a **qualidade dos metadados e dos registros em toda a exportação**, não apenas no mês selecionado:
  - `reviewable`: exportação contendo movimentação de cartão e sem lacunas de evidência detectadas pelo checklist.
  - `limited`: há movimentação, mas uma ou mais ressalvas, como exportação antiga, identificadores ambíguos ou coleção de eventos ausente.
  - `insufficient`: não existem compras de cartão nem eventos de fatura suficientes no arquivo para essa análise.
- `evidence.warnings` contém **códigos técnicos**, nunca nomes, CPFs, IDs ou descrições de transação.
- `evidence.bankReconciliation` sempre é `false`: mesmo uma exportação `reviewable` **não comprova** igualdade com a instituição financeira.
- `comparison` descreve deltas entre arquivos; mudanças no cadastro de IDs **não provam** migração de cartões ou recuperação de vínculos históricos.

## Códigos de ressalva

- `export_timestamp_missing`: exportação sem horário reconhecível.
- `export_timestamp_in_future`: data mais de cinco minutos à frente do relógio de referência.
- `export_older_than_30_days`: arquivo atual com mais de 30 dias.
- `invoice_events_not_exported`: coleção de eventos não existe como lista válida.
- `ambiguous_card_identifiers`: cartões sem ID canônico ou com IDs duplicados.
- `ambiguous_transaction_identifiers`: transações com IDs ausentes ou repetidos.
- `invalid_credit_amounts`: valor de compra de crédito não analisável.
- `invoice_events_without_registered_card`: evento de fatura aponta para cartão sem cadastro atual; pode ser histórico e exige conferência, não correção automática.
- `comparison_chronology_unverified`: um dos arquivos comparados não possui data verificável.
- `no_shared_unique_credit_transactions`: arquivos com compras de crédito, mas sem IDs únicos compartilhados.
- `no_credit_activity_in_export`: exportação sem atividade de cartão para embasar a conferência.

## Condição para homologação financeira real

Ainda depende de um JSON atual fornecido pelo titular, sem publicação de dados individuais. Comparar os totais agregados no sistema e no arquivo; confirmar manualmente eventuais diferenças contra o extrato do cartão. Não executar correção automática ou migração sem plano, cópia de segurança recuperável e autorização específica.
