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
  if (name !== 'css') requireToken(name, content, 'min-w-0')
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
requireToken('css', files.css, '@media (max-width: 359px)')
requireToken('transactions', files.transactions, 'transaction-row__aside')
requireToken('cards', files.cards, 'credit-cards-period')
requireToken('categories', files.categories, 'grid-cols-4')
rejectToken('transactions', files.transactions, 'exportToPDF(filtered, categories, summary)')

console.log('Interface responsiva validada com sucesso.')
