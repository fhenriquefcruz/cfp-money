import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const files = {
  css: await read('src/index.css'),
  transactions: await read('src/components/TransactionList.jsx'),
  cards: await read('src/components/CreditCardsDashboard.jsx'),
  goals: await read('src/components/Goals.jsx'),
  budgets: await read('src/components/Budgets.jsx'),
  categories: await read('src/components/Categories.jsx'),
  profile: await read('src/components/Profile.jsx'),
  admin: await read('src/components/Admin.jsx'),
  sidebar: await read('src/components/Sidebar.jsx'),
  ui: await read('src/components/ui.jsx'),
  dashboard: await read('src/components/Dashboard.jsx'),
  money: await read('src/components/Money.jsx'),
  moneyInsight: await read('src/components/MoneyInsightCard.jsx'),
  transactionForm: await read('src/components/TransactionForm.jsx'),
}

const requireToken = (name, content, token) => {
  if (!content.includes(token)) {
    throw new Error(`${name}: requisito responsivo ausente: ${token}`)
  }
}

const rejectToken = (name, content, token) => {
  if (content.includes(token)) {
    throw new Error(`${name}: padrão incompatível encontrado: ${token}`)
  }
}

for (const [name, content] of Object.entries(files)) {
  if (!['css', 'ui', 'transactionForm'].includes(name)) {
    requireToken(name, content, 'min-w-0')
  }
}

for (const name of [
  'transactions',
  'cards',
  'goals',
  'budgets',
  'categories',
  'profile',
  'admin',
]) {
  requireToken(name, files[name], 'operational-page')
}

requireToken('css', files.css, 'min-width: 0')
requireToken('css', files.css, 'AURORA OPERATIONAL EXPERIENCE · FASE 20.3')
requireToken('css', files.css, 'AURORA MOBILE UX AUDIT · FASE 20.4')
requireToken('css', files.css, '@media (max-width: 359px)')
requireToken('transactions', files.transactions, 'transaction-row__aside')
requireToken('cards', files.cards, 'credit-cards-period')
requireToken('cards', files.cards, 'credit-cards-summary-grid')
requireToken('categories', files.categories, 'min-[360px]:grid-cols-2')
requireToken('sidebar', files.sidebar, 'z-[70]')
requireToken('sidebar', files.sidebar, 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]')
requireToken('ui', files.ui, 'z-[100]')
requireToken('ui', files.ui, 'min-h-0 flex-1 overflow-y-auto overscroll-contain')
requireToken('dashboard', files.dashboard, 'dashboard-month-nav')
requireToken('dashboard', files.dashboard, 'dashboard-compact-kpis')
requireToken('money', files.money, 'money-chat-input')
requireToken('money', files.money, 'money-chat-composer')
requireToken('moneyInsight', files.moneyInsight, 'money-insight-card__metrics')
requireToken('transactionForm', files.transactionForm, 'min-[430px]:grid-cols-2')
rejectToken('transactions', files.transactions, 'exportToPDF(filtered, categories, summary)')

console.log('Interface responsiva validada com sucesso.')
