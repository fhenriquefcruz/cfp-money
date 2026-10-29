# Fase 66.3 — Homologação de cartões com exportações reais

## Objetivo

Verificar, sem alterar dados, se uma exportação recente apresenta IDs canônicos dos cartões e se as compras e pagamentos do usuário permanecem consistentes com o snapshot histórico.

**Não houve consulta à conta de produção durante a implementação.** A homologação de uma conta exige que o próprio titular obtenha uma exportação recente. Não envie arquivos de dados financeiros a issues ou pull requests públicos.

## Procedimento local

1. Abra o Meu Real autenticado e acione **Exportar meus dados** na área de privacidade do perfil. Guarde o JSON em pasta privada e identifique a data da exportação.
2. Abra o repositório local atualizado e coloque a exportação recente em uma pasta privada fora do controle de versão.
3. Execute a auditoria de uma competência:

```bash
npm run audit:cards -- "/caminho/privado/atual.json" --month 2026-10
```

4. Para comparar com o backup de 28/09/2026:

```bash
npm run audit:cards -- "/caminho/privado/atual.json" --month 2026-10 --compare "/caminho/privado/anterior.json"
```

O programa retorna **somente um JSON agregado no terminal** e não envia requisições ao Firebase, não modifica os arquivos e não grava nenhum relatório automaticamente.

## Como interpretar

- `status` e `findingCounts`: inconsistências da fatura selecionada e motivos que precisam de revisão humana.
- `identity.counts.missingCardIds`: cartões exportados sem ID, que devem ser analisados antes de qualquer vínculo.
- `identity.counts.orphanCardReferences`: compras com `cardId` que não aparece na lista exportada de cartões. **Isso também pode representar cartão removido intencionalmente.**
- `comparison.previous/current/deltas`: mudanças agregadas entre dois snapshots, **não prova de migração, corrupção ou correção da mesma entidade**.
- `comparison.sharedRecords`: apenas transações com ID individual válido e único presente nas duas exportações; compara referência de cartão e valor sem imprimir nenhum identificador.
- `identityObservation: ids_present_in_new_export`: o arquivo atual não contém o problema de `id: null` observado no histórico. Não conclui que os documentos antigos foram modificados.

As exportações podem ter estruturas Spark (`collections`) ou backend (`data`). A correção de exportação backend introduzida na Fase 66.2 pode exigir implantação específica das Cloud Functions se a conta estiver nesse modo; código integrado ao GitHub, sozinho, não comprova a implantação.

## Critérios de aceite da homologação real

- Exportação recente com data coerente e IDs válidos para todos os cartões;
- Nenhuma transação duplicada ou valor ilegível sem justificativa;
- Faturas e pagamentos verificados por competência;
- Divergências históricas classificadas como erro real, remoção legítima de cartão ou problema antigo da exportação;
- Nenhuma associação automática, alteração em lote ou escrita no Firestore.

Se o snapshot atual ainda tiver `id: null`, primeiro confirmar o modo de exportação e a versão efetivamente implantada. Não fazer correções de documentos por nome ou últimos quatro dígitos.
