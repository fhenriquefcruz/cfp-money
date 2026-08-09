export const LEGAL_VERSIONS = {
  terms: '1.0.0',
  privacy: '1.0.0',
}

export const LEGAL_IDENTITY = {
  controller: import.meta.env.VITE_LEGAL_CONTROLLER_NAME || 'Responsável pelo Meu Real',
  contactEmail: import.meta.env.VITE_LEGAL_CONTACT_EMAIL || 'contato@exemplo.com',
  country: import.meta.env.VITE_LEGAL_COUNTRY || 'Brasil',
}

export const TERMS_SECTIONS = [
  {
    title: '1. Objeto',
    paragraphs: [
      'O Meu Real é uma plataforma de organização financeira pessoal que permite registrar, consultar e analisar informações fornecidas pelo próprio usuário.',
      'Os recursos podem incluir controle de transações, cartões, faturas, metas, relatórios, assistente Money e integrações autorizadas.',
    ],
  },
  {
    title: '2. Natureza das informações',
    paragraphs: [
      'O conteúdo apresentado possui finalidade informativa e educacional. O Meu Real não substitui aconselhamento financeiro, contábil, jurídico, tributário ou de investimentos.',
      'Decisões financeiras continuam sendo de responsabilidade do usuário.',
    ],
  },
  {
    title: '3. Conta e segurança',
    paragraphs: [
      'O usuário deve fornecer informações verdadeiras, proteger suas credenciais e comunicar acessos não reconhecidos.',
      'A conta é pessoal e não deve ser compartilhada. Integrações externas somente devem ser vinculadas em dispositivos e contas controlados pelo usuário.',
    ],
  },
  {
    title: '4. Dados inseridos',
    paragraphs: [
      'O usuário é responsável pela exatidão dos lançamentos e pelas informações enviadas à plataforma.',
      'Antes de salvar lançamentos preparados pelo Money, o usuário deve revisar os dados apresentados para confirmação.',
    ],
  },
  {
    title: '5. Planos e pagamento',
    paragraphs: [
      'Recursos, limites e preços podem variar conforme o plano contratado. As condições comerciais aplicáveis devem ser apresentadas antes da contratação.',
      'Quando a renovação não for automática, a continuidade do acesso dependerá de nova confirmação de pagamento.',
    ],
  },
  {
    title: '6. Uso aceitável',
    paragraphs: [
      'É proibido tentar acessar dados de terceiros, contornar controles de segurança, explorar vulnerabilidades ou utilizar o serviço para finalidade ilícita.',
      'A conta poderá ser limitada ou bloqueada quando houver risco de segurança, fraude ou descumprimento destes Termos.',
    ],
  },
  {
    title: '7. Disponibilidade',
    paragraphs: [
      'O serviço poderá sofrer indisponibilidades para manutenção, atualização ou eventos fora do controle razoável do operador.',
      'Rotinas de backup e recuperação reduzem riscos, mas não eliminam integralmente a possibilidade de perda ou indisponibilidade.',
    ],
  },
  {
    title: '8. Propriedade intelectual',
    paragraphs: [
      'A aplicação, a marca, o código, os elementos visuais e a documentação pertencem aos respectivos titulares e licenciadores.',
      'O uso da plataforma não transfere ao usuário direitos sobre o código-fonte ou sobre a propriedade intelectual do produto.',
    ],
  },
  {
    title: '9. Encerramento',
    paragraphs: [
      'O usuário pode solicitar a exclusão da conta pela área de privacidade. Após o prazo de segurança informado, os dados abrangidos serão eliminados conforme o procedimento técnico aplicável.',
      'Determinados registros poderão ser mantidos quando houver obrigação legal, prevenção a fraude, defesa de direitos ou outra justificativa legítima.',
    ],
  },
  {
    title: '10. Contato e alterações',
    paragraphs: [
      `Dúvidas sobre estes Termos podem ser encaminhadas para ${LEGAL_IDENTITY.contactEmail}.`,
      'Versões futuras poderão exigir nova aceitação quando houver alteração relevante.',
    ],
  },
]

export const PRIVACY_SECTIONS = [
  {
    title: '1. Responsável e contato',
    paragraphs: [
      `${LEGAL_IDENTITY.controller} é o responsável indicado pela operação do Meu Real.`,
      `Solicitações sobre privacidade podem ser encaminhadas para ${LEGAL_IDENTITY.contactEmail}.`,
    ],
  },
  {
    title: '2. Dados tratados',
    paragraphs: [
      'Podem ser tratados dados de cadastro e autenticação, como nome, e-mail, identificadores da conta e provedores de login.',
      'Também são tratados os dados financeiros inseridos pelo usuário, como receitas, despesas, categorias, cartões, faturas, metas, orçamentos e observações.',
      'Quando uma integração é ativada, podem ser tratados identificadores, preferências e mensagens necessárias para executar os comandos autorizados.',
      'Dados técnicos de segurança, auditoria e funcionamento podem ser registrados para prevenção a fraude, diagnóstico e melhoria do serviço.',
    ],
  },
  {
    title: '3. Finalidades',
    paragraphs: [
      'Os dados são utilizados para autenticar a conta, prestar as funcionalidades contratadas, sincronizar informações, gerar análises, atender solicitações, proteger o serviço e cumprir obrigações aplicáveis.',
      'O Meu Real não deve utilizar os lançamentos financeiros para publicidade comportamental de terceiros.',
    ],
  },
  {
    title: '4. Compartilhamento e operadores',
    paragraphs: [
      'Dados podem ser processados por fornecedores de infraestrutura, autenticação, banco de dados, hospedagem, monitoramento e comunicação estritamente para operar o serviço.',
      'Informações podem ser compartilhadas quando necessário para cumprir ordem legal, proteger direitos ou investigar fraude e incidentes.',
    ],
  },
  {
    title: '5. Segurança',
    paragraphs: [
      'São empregados controles como autenticação, regras de acesso por usuário, funções protegidas, segregação de segredos, auditoria e confirmação antes de operações sensíveis.',
      'Nenhum sistema é completamente imune a incidentes. Eventos relevantes devem ser avaliados e tratados conforme o plano de resposta aplicável.',
    ],
  },
  {
    title: '6. Retenção',
    paragraphs: [
      'Os dados permanecem enquanto a conta estiver ativa e pelo período necessário às finalidades informadas.',
      'Pedidos de exclusão possuem prazo de segurança para cancelamento. Após o processamento, os dados abrangidos são removidos, ressalvadas hipóteses justificadas de retenção.',
    ],
  },
  {
    title: '7. Direitos do titular',
    paragraphs: [
      'A área de privacidade permite obter uma cópia dos dados e solicitar o encerramento da conta.',
      'Outras solicitações, como correção, informação sobre tratamento ou revisão de consentimento, podem ser encaminhadas pelo canal de contato.',
    ],
  },
  {
    title: '8. Transferências e localização',
    paragraphs: [
      `A infraestrutura pode utilizar provedores que processam dados em diferentes localidades, observadas as configurações e garantias contratuais disponíveis. O serviço é direcionado a usuários em ${LEGAL_IDENTITY.country}.`,
    ],
  },
  {
    title: '9. Atualizações',
    paragraphs: [
      'Esta Política poderá ser atualizada para refletir mudanças legais, técnicas ou operacionais.',
      'Alterações relevantes poderão exigir nova ciência ou aceitação dentro da aplicação.',
    ],
  },
]
