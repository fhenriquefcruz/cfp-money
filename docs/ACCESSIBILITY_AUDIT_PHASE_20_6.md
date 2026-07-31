# Fase 20.6 — Auditoria integral de acessibilidade

## Objetivo

Elevar o Meu Real a um baseline verificável de acessibilidade em navegação desktop,
mobile e PWA, combinando automação, testes de teclado e homologação manual com
tecnologias assistivas.

## Escopo

1. Auditoria automática WCAG 2.0, 2.1 e 2.2 nível A/AA com Axe.
2. Semântica, nomes acessíveis, estados e relacionamentos ARIA.
3. Ordem de foco, foco visível, retorno de foco e contenção em modais/drawers.
4. Navegação integral por teclado, incluindo Escape e acionamento por Enter/Espaço.
5. Contraste de texto, ícones, bordas, estados e temas claro/escuro.
6. Alvos de toque e prevenção de interação acidental.
7. Redução global de movimento e eliminação de animações essenciais.
8. Homologação manual com leitor de tela e zoom/refluxo.

## Critérios de aceite automatizados

- Zero violações Axe nas rotas e estados cobertos.
- Modais e drawers mantêm o foco no contexto aberto.
- Escape fecha superfícies descartáveis e devolve foco ao acionador.
- Todos os controles essenciais são alcançáveis e operáveis por teclado.
- CI executa a suíte de acessibilidade separadamente da matriz móvel.

## Critérios de aceite manuais

- Leitura coerente da estrutura, títulos, formulários e notificações.
- Operação completa com leitor de tela em pelo menos um fluxo principal.
- Contraste aprovado nos temas claro e escuro.
- Refluxo funcional com zoom de 200% e 400%.
- Interface utilizável com redução de movimento ativada.

## Baseline automatizado inicial

A primeira execução cobriu 36 cenários:

- 16 aprovados;
- 19 reprovados;
- 1 ignorado por não se aplicar ao projeto desktop.

As causas foram agrupadas em:

1. contraste insuficiente no tema claro, especialmente texto terciário e cores arbitrárias;
2. ausência de contenção de foco no modal e no drawer móvel;
3. corridas transitórias de navegação no WebKit durante a instrumentação Axe.

As correções devem preservar hierarquia visual, não desativar regras Axe e não aumentar
tolerâncias de teste.
