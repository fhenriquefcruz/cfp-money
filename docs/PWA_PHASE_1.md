# PWA — Fase 1

## Entrega

- instalação opcional no Android e em navegadores compatíveis;
- instrução específica para instalação pelo Safari no iPhone;
- modo standalone com safe areas;
- página offline segura;
- cache restrito ao shell e aos arquivos estáticos;
- dados financeiros e chamadas do Firebase fora do cache;
- aviso controlado de nova versão;
- validação automática do manifesto, ícones e service worker.

## Teste local

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

O service worker não é registrado durante `npm run dev`, evitando cache antigo durante o
desenvolvimento.
