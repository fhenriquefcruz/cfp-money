# Política de segurança

Relate vulnerabilidades de forma privada pelo recurso **Security advisories** do GitHub. Não publique credenciais, dados financeiros ou detalhes exploráveis em issues.

## Firebase obrigatório

- habilite App Check e proteção contra abuso;
- use custom claim booleana `admin` emitida apenas por ambiente confiável;
- nunca conceda administração por e-mail ou por campo editável no cliente;
- aplique e teste `firestore.rules` antes de liberar o painel administrativo;
- restrinja cada subcoleção financeira ao proprietário autenticado;
- revogue tokens após remover privilégios administrativos.

As chaves públicas de configuração do Firebase identificam o projeto, mas não substituem regras de segurança. Segredos de service account jamais devem usar prefixo `VITE_` ou entrar no repositório.
