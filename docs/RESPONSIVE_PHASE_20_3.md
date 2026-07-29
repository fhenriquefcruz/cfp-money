# Fase 20.3 — Experiência operacional responsiva

Esta entrega conclui a padronização mobile das principais áreas operacionais do Meu Real.

## Escopo

- Transações: linhas adaptativas, ações acessíveis por toque, resumos sem corte e filtros fluidos.
- Cartões: hero assimétrico, seletor mensal responsivo e lançamentos sem estouro.
- Metas, orçamentos e categorias: grades fluidas e superfícies Aurora consistentes.
- Perfil: plano, e-mail e dados Pix seguros em telas estreitas.
- Administração: pesquisa e ações de usuários adaptadas ao celular.
- Exportações: assinatura atual corrigida e compatibilidade defensiva para PDF.
- Qualidade: validação automática dos contratos responsivos no `validate:all`.

## Critérios

- suporte a 320, 360, 390 e 430 px;
- nenhuma rolagem horizontal involuntária;
- ações essenciais visíveis em dispositivos sem hover;
- valores e identificadores longos podem quebrar linha;
- áreas de toque de pelo menos 44 px;
- `prefers-reduced-motion` respeitado;
- desktop preservado.
