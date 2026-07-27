# Fase 10 — Chat compacto e autenticação Google

## Chat do Money

- chat aparece antes dos boxes explicativos no celular;
- altura máxima controlada;
- mensagens rolam dentro do painel;
- campo de digitação permanece no rodapé do chat;
- rolagem automática para a mensagem mais recente;
- boxes laterais possuem rolagem própria em telas menores;
- nenhuma mensagem ou transação existente é alterada.

## Google Authentication

- botão `Continuar com Google`;
- perfil Firestore criado apenas no primeiro acesso;
- documento existente não é sobrescrito;
- suporte ao fluxo `account-exists-with-different-credential`;
- após login por senha, a credencial Google pendente é vinculada ao mesmo UID;
- mensagens claras para popup bloqueado, domínio não autorizado e provedor desativado.

## Configuração obrigatória no Firebase

1. Authentication → Sign-in method → Google → Ativar.
2. Informar e-mail de suporte.
3. Authentication → Settings → manter uma conta por endereço de e-mail.
4. Adicionar os domínios usados pelo aplicativo em Authorized domains.

## Correção dos testes do Login

A troca de modo não depende mais de uma animação de saída do `AnimatePresence`.
O conteúdo de Entrar, Criar conta e Recuperação muda imediatamente no DOM.
