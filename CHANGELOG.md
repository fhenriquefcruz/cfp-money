# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

## [Unreleased]

### Added

- infraestrutura de lint, Prettier, Vitest e Testing Library;
- Error Boundary, rota 404 e code splitting por rota;
- camada inicial de domínio financeiro e repositórios;
- documentação de segurança, contribuição e roadmap.

### Changed

- marca consolidada como Meu Real;
- acesso administrativo passa a exigir custom claim `admin`;
- deploy passa a depender de lint, testes e build.

### Removed

- arquivo `.env` versionado e autorização administrativa por e-mail no frontend.
