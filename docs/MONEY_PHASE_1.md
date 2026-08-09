# Money Core — Fase 1

## Recursos implementados

- mês civil como comportamento padrão;
- ciclo personalizado ou baseado no dia do salário;
- comparação pelo mesmo número de dias;
- comparação opcional por ciclo completo;
- exclusão de lançamentos de poupança da análise, por padrão;
- resumo de receitas, despesas e saldo;
- comparação percentual segura;
- projeção linear até o fechamento do ciclo;
- variação por categoria;
- geração determinística de insights;
- testes para ciclos, períodos equivalentes, projeção e ausência de histórico.

## Estrutura de configuração

```js
{
  cycleType: 'calendar_month', // calendar_month | salary_cycle | custom_cycle
  cycleStartDay: 1,            // 1 a 28
  comparisonMode: 'elapsed_days', // elapsed_days | full_cycle
  excludeSavings: true
}
```

## Próxima etapa

1. persistir as preferências no documento `users/{auth.uid}`;
2. criar o card “Análise do Money” no Dashboard;
3. criar a rota interna `/money`;
4. centralizar a geração de relatórios;

## Aplicação no Codespaces

Na raiz do projeto:

```bash
unzip -o money-core-phase-1.zip -d temp-money
cp -rf temp-money/. .
rm -rf temp-money
npm run test -- src/domain/money.test.js
npm run build
```
