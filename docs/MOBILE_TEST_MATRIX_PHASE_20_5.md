# Fase 20.5 — Testes móveis definitivos

## Objetivo

Certificar a experiência móvel renderizada do Meu Real depois da auditoria estrutural da Fase 20.4.

## Cobertura automatizada

O Playwright executa o aplicativo completo em modo E2E isolado, com usuário Premium e dados
fictícios em memória. O modo depende de `VITE_E2E_MODE=true` e não é ativado na produção normal.

### Projetos

- Chromium: 320 × 740 px;
- Chromium: 360 × 800 px;
- Chromium: 390 × 844 px;
- Chromium: 430 × 932 px;
- Android Pixel 5;
- WebKit com emulação de iPhone 13.

### Contratos verificados

- ausência de rolagem horizontal no documento e no conteúdo principal;
- Dashboard, Money, Cartões, Transações, Categorias, Metas, Orçamentos, Relatórios e Perfil;
- navegação inferior;
- abertura, contenção e navegação do menu “Mais”;
- rotação retrato-paisagem;
- abertura do formulário de nova transação;
- cartão, parcelamento e conteúdo longo;
- redução da viewport para representar teclado aberto;
- reposicionamento do campo focado;
- rodapé do modal dentro da área visível;
- gravação de uma transação em memória, sem Firebase;
- manifesto e service worker.

## Limite da automação

A redução da viewport reproduz a geometria causada pelo teclado, mas não substitui o teclado real do
Safari ou do Android. Safe areas também dependem do hardware e do modo standalone.

## Homologação física obrigatória

A fase somente poderá ser encerrada após registrar resultado nos cenários abaixo:

| Plataforma       | Browser/app   | Retrato  | Paisagem | Teclado  | Safe areas | Resultado |
| ---------------- | ------------- | -------- | -------- | -------- | ---------- | --------- |
| iPhone com notch | Safari        | Pendente | Pendente | Pendente | Pendente   | Pendente  |
| iPhone com notch | PWA instalada | Pendente | Pendente | Pendente | Pendente   | Pendente  |
| Android          | Chrome        | Pendente | Pendente | Pendente | N/A        | Pendente  |
| Android          | PWA instalada | Pendente | Pendente | Pendente | N/A        | Pendente  |

## Comandos

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:report
```

Os relatórios, screenshots, vídeos e traces de falha são preservados pelo workflow
`Mobile definitive tests`.
