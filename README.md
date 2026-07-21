# Meu Real

Aplicação web responsiva para controle financeiro pessoal, publicada temporariamente em `https://fhenriquefcruz.github.io/cfp-money/`.

## Desenvolvimento

Requer Node.js 20 ou superior. Copie `.env.example` para `.env` e configure um projeto Firebase próprio.

```bash
npm ci
npm run dev
```

Validação completa:

```bash
npm run validate
npm run format:check
```

## Arquitetura

- `src/components`: apresentação e rotas;
- `src/contexts`: estado de sessão e orquestração;
- `src/domain`: regras financeiras puras e testáveis;
- `src/repositories`: contratos de persistência por domínio;
- `src/services`: configuração e adaptadores externos.

O `base` do Vite permanece `/cfp-money/` durante a transição de marca. Consulte [SECURITY.md](SECURITY.md) antes de configurar produção.
