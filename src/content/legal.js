import { COMMERCIAL_OFFER, SUPPORT_POLICY } from './commercial'

export const LEGAL_VERSIONS = {
  terms: '1.1.0',
  privacy: '1.1.0',
}

export const LEGAL_IDENTITY = {
  controller: import.meta.env.VITE_LEGAL_CONTROLLER_NAME || 'Identidade jurídica pendente',
  registration: import.meta.env.VITE_LEGAL_REGISTRATION || 'Cadastro fiscal pendente',
  address: import.meta.env.VITE_LEGAL_ADDRESS || 'Endereço físico pendente',
  contactEmail: import.meta.env.VITE_LEGAL_CONTACT_EMAIL || SUPPORT_POLICY.contactEmail,
  country: import.meta.env.VITE_LEGAL_COUNTRY || 'Brasil',
}

export const TERMS_SECTIONS = [
  {
    title: '1. Fornecedor e objeto',
    paragraphs: [
      `${LEGAL_IDENTITY.controller}, identificado por ${LEGAL_IDENTITY.registration}, é o fornecedor responsável pelo Meu Real.`,
      `O endereço físico informado pelo fornecedor é ${LEGAL_IDENTITY.address}, e o canal eletrônico de contato é ${LEGAL_IDENTITY.contactEmail}.`,
      'O Meu Real é uma plataforma de organização financeira pessoal que permite registrar, consultar e analisar informações fornecidas pelo próprio usuário.',
      'O conteúdo apresentado possui finalidade informativa e educacional e não substitui aconselhamento financeiro, contábil, jurídico, tributário ou de investimentos.',
    ],
  },
  {
    title: '2. Elegibilidade, conta e segurança',
    paragraphs: [
      'O serviço é destinado a pessoas com capacidade para contratar. Ao criar a conta, o usuário declara que as informações fornecidas são verdadeiras e que possui capacidade legal para utilizar o serviço.',
      'A conta é pessoal. O usuário deve proteger suas credenciais, não compartilhar o acesso e comunicar acessos não reconhecidos pelo canal de suporte.',
    ],
  },
  {
    title: '3. Trial, plano Premium e pagamento',
    paragraphs: [
      `Novas contas podem receber ${COMMERCIAL_OFFER.trialDays} dias de experiência Premium sem cadastro de cartão, conforme a oferta apresentada no momento do registro.`,
      `O plano Premium custa ${COMMERCIAL_OFFER.premiumPrice} por ${COMMERCIAL_OFFER.premiumPeriodDays} dias, com pagamento por ${COMMERCIAL_OFFER.paymentMethod} e renovação ${COMMERCIAL_OFFER.renewal}.`,
      'Não há cobrança recorrente automática na versão atual. A ativação ou renovação ocorre após a confirmação do pagamento e pode depender de processamento manual.',
      'O escopo comercial vigente é o apresentado dentro da aplicação antes do pagamento. Funcionalidades futuras ou desativadas não integram a oferta contratada.',
    ],
  },
  {
    title: '4. Arrependimento, cancelamento e reembolso',
    paragraphs: [
      'Quando aplicável à contratação eletrônica, o consumidor pode exercer o direito de arrependimento no prazo legal de 7 dias.',
      `A solicitação pode ser registrada pelo canal de suporte dentro da aplicação ou pelo e-mail ${SUPPORT_POLICY.contactEmail}.`,
      'Pedidos de arrependimento e reembolso são analisados conforme a legislação de defesa do consumidor e, quando devidos, os valores são restituídos pelo meio operacionalmente disponível, sem cobrança de taxa de cancelamento.',
      'Como a renovação é manual, o usuário pode simplesmente não realizar novo pagamento para impedir uma nova vigência.',
    ],
  },
  {
    title: '5. Dados inseridos e responsabilidade do usuário',
    paragraphs: [
      'O usuário é responsável pela exatidão dos lançamentos e pelas informações enviadas à plataforma.',
      'Antes de salvar lançamentos ou decisões preparados com auxílio do Money, o usuário deve revisar os dados apresentados.',
      'O usuário não deve inserir dados de terceiros sem autorização ou informações desnecessárias para a finalidade de organização financeira.',
    ],
  },
  {
    title: '6. Uso aceitável',
    paragraphs: [
      'É proibido tentar acessar dados de terceiros, contornar controles de segurança, explorar vulnerabilidades, automatizar abuso do serviço ou utilizar o Meu Real para finalidade ilícita.',
      'A conta poderá ser limitada ou bloqueada quando houver risco de segurança, fraude, abuso ou descumprimento destes Termos, sem prejuízo dos direitos legais do consumidor.',
    ],
  },
  {
    title: '7. Disponibilidade, suporte e SLA',
    paragraphs: [
      'A versão atual opera sobre serviços de terceiros e poderá sofrer indisponibilidades para manutenção, atualização ou eventos fora do controle razoável do fornecedor.',
      'Não é oferecida garantia contratual de disponibilidade percentual contínua na versão atual.',
      `O suporte eletrônico tem meta operacional de resposta em ${SUPPORT_POLICY.responseTarget}, observado o prazo máximo informado de ${SUPPORT_POLICY.responseDeadline}.`,
      `O canal oficial de suporte é ${SUPPORT_POLICY.contactEmail}.`,
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
    title: '9. Encerramento da conta',
    paragraphs: [
      'O usuário pode solicitar o encerramento da conta pela área de privacidade. No modo gratuito atual, a solicitação pode depender de processamento manual e pode ser cancelada antes do processamento.',
      'Dados poderão ser mantidos quando houver obrigação legal ou regulatória, exercício regular de direitos, prevenção a fraude ou outra hipótese legítima prevista em lei.',
    ],
  },
  {
    title: '10. Contato e alterações',
    paragraphs: [
      `Dúvidas, reclamações, pedidos de cancelamento e demais solicitações podem ser encaminhados para ${SUPPORT_POLICY.contactEmail}.`,
      'Alterações relevantes destes Termos serão versionadas e poderão exigir nova aceitação dentro da aplicação.',
    ],
  },
]

export const PRIVACY_SECTIONS = [
  {
    title: '1. Controlador e canal de privacidade',
    paragraphs: [
      `${LEGAL_IDENTITY.controller}, identificado por ${LEGAL_IDENTITY.registration}, atua como controlador dos dados pessoais tratados pelo Meu Real.`,
      `Endereço: ${LEGAL_IDENTITY.address}.`,
      `Solicitações relacionadas a privacidade e aos direitos do titular podem ser encaminhadas para ${LEGAL_IDENTITY.contactEmail} ou registradas na área de suporte da aplicação.`,
    ],
  },
  {
    title: '2. Dados tratados',
    paragraphs: [
      'Podem ser tratados dados de cadastro e autenticação, como nome, e-mail, identificadores da conta e informações fornecidas pelo provedor de login.',
      'Também são tratados os dados financeiros inseridos pelo usuário, como receitas, despesas, categorias, cartões, faturas, metas, orçamentos e observações.',
      'Solicitações de suporte podem registrar tipo da demanda, mensagem, identificador da conta, e-mail, protocolo, status e datas de atendimento.',
      'Dados técnicos de segurança, auditoria e funcionamento podem ser tratados para prevenção a fraude, diagnóstico, proteção do serviço e melhoria operacional.',
      'O Meu Real não solicita senha bancária e não exige conexão bancária para o uso das funcionalidades atuais.',
    ],
  },
  {
    title: '3. Finalidades e bases legais',
    paragraphs: [
      'Dados necessários à criação da conta e à entrega das funcionalidades são tratados para execução do contrato ou de procedimentos relacionados ao serviço solicitado pelo usuário.',
      'Registros necessários ao cumprimento de obrigações legais, atendimento ao consumidor e exercício regular de direitos podem ser mantidos com fundamento nas hipóteses legais aplicáveis.',
      'Dados técnicos estritamente necessários à segurança, prevenção a fraude e proteção do serviço podem ser tratados com base em legítimo interesse, observadas as expectativas do titular e medidas de minimização.',
      'Quando uma funcionalidade opcional depender de consentimento, a finalidade será apresentada de forma específica e o consentimento poderá ser revogado pelos meios disponibilizados.',
      'Os lançamentos financeiros não são utilizados para publicidade comportamental de terceiros.',
    ],
  },
  {
    title: '4. Compartilhamento e operadores',
    paragraphs: [
      'Dados podem ser processados por fornecedores de infraestrutura, autenticação, banco de dados, hospedagem e ferramentas técnicas estritamente para operar e proteger o serviço.',
      'Atualmente, serviços do ecossistema Firebase/Google e a infraestrutura de publicação utilizada pela aplicação podem participar do processamento técnico necessário ao funcionamento.',
      'Informações também podem ser compartilhadas quando necessário para cumprir obrigação legal, ordem de autoridade competente, proteger direitos ou investigar fraude e incidentes.',
      'O Meu Real não comercializa a base de dados pessoais dos usuários.',
    ],
  },
  {
    title: '5. Segurança',
    paragraphs: [
      'São empregados controles como autenticação, regras de acesso por usuário, App Check, segregação de segredos, validações de segurança e confirmação antes de operações sensíveis.',
      'Backups operacionais, quando gerados pelo responsável, devem permanecer criptografados e com acesso restrito.',
      'Nenhum sistema é completamente imune a incidentes. Eventos relevantes são avaliados conforme o procedimento de resposta aplicável.',
    ],
  },
  {
    title: '6. Retenção e eliminação',
    paragraphs: [
      'Os dados permanecem enquanto a conta estiver ativa e pelo período necessário às finalidades informadas.',
      'Pedidos de exclusão são processados conforme o fluxo técnico disponível, ressalvadas hipóteses legais de conservação.',
      'Registros de atendimento, segurança ou evidências contratuais podem ser mantidos pelo período necessário ao cumprimento de obrigações ou ao exercício regular de direitos.',
    ],
  },
  {
    title: '7. Direitos do titular',
    paragraphs: [
      'O titular pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamento, oposição quando cabível, revogação de consentimento, portabilidade e eliminação nas hipóteses previstas em lei.',
      'A área de privacidade permite gerar uma cópia dos dados acessíveis pela conta e solicitar o encerramento da conta.',
      `Solicitações adicionais podem ser registradas no suporte da aplicação ou enviadas para ${LEGAL_IDENTITY.contactEmail}, sem cobrança pelo exercício dos direitos.`,
    ],
  },
  {
    title: '8. Transferências internacionais',
    paragraphs: [
      `A infraestrutura pode utilizar provedores que processam dados em diferentes localidades. O serviço é direcionado a usuários em ${LEGAL_IDENTITY.country}.`,
      'Quando houver transferência internacional de dados pessoais, devem ser observadas as bases legais e salvaguardas aplicáveis, inclusive mecanismos contratuais disponibilizados pelos provedores envolvidos.',
    ],
  },
  {
    title: '9. Armazenamento local e tecnologias do navegador',
    paragraphs: [
      'A aplicação pode utilizar armazenamento local do navegador e tecnologias técnicas necessárias para manter preferências, funcionamento do PWA e recursos escolhidos pelo usuário.',
      'A versão atual não utiliza os dados financeiros para publicidade comportamental de terceiros.',
    ],
  },
  {
    title: '10. Incidentes de segurança',
    paragraphs: [
      'Suspeitas de acesso indevido, vazamento ou outro incidente podem ser comunicadas pelo canal de privacidade.',
      'Incidentes confirmados são avaliados quanto ao risco e às medidas de contenção, correção, registro e comunicação aplicáveis.',
    ],
  },
  {
    title: '11. Atualizações desta Política',
    paragraphs: [
      'Esta Política poderá ser atualizada para refletir mudanças legais, técnicas, comerciais ou operacionais.',
      'Alterações relevantes serão versionadas e poderão exigir nova ciência ou aceitação dentro da aplicação.',
    ],
  },
]
