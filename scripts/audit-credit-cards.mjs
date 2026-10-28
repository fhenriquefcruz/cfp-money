#!/usr/bin/env node
// Auditoria local, consultiva e sem rede/Firestore. Nunca escreve no arquivo de origem.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const file = args[0]
const monthIndex = args.indexOf('--month')
const month = monthIndex === -1 ? null : args[monthIndex + 1]

async function main() {
  if (!file || file.startsWith('--') || (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) {
    throw new Error('Uso: npm run audit:cards -- caminho/backup.json [--month AAAA-MM]')
  }
  const input = JSON.parse(await readFile(resolve(file), 'utf8'))
  const records = input.collections || input
  if (!Array.isArray(records.transactions) || !Array.isArray(records.creditCards)) {
    throw new Error('O arquivo precisa conter collections.transactions e collections.creditCards.')
  }
  const invoiceEvents = Array.isArray(records.invoiceEvents) ? records.invoiceEvents : []
  const selectedMonth = month || String(input.exportedAt || '').slice(0, 7)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
    throw new Error('Informe --month AAAA-MM ou utilize um backup com exportedAt válido.')
  }

  // O carregador SSR do Vite resolve os imports de domínio sem carregar o aplicativo.
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { auditCreditCardFinancialParity } = await server.ssrLoadModule(
      '/src/domain/creditCardFinancialParity.js',
    )
    const audit = auditCreditCardFinancialParity({
      transactions: records.transactions,
      creditCards: records.creditCards,
      invoiceEvents,
      selectedMonth,
    })
    // Somente agregados: nunca imprimir nomes, documentos, contas, IDs ou transações brutas.
    const findingCounts = audit.findings.reduce((counts, item) => {
      counts[item.code] = (counts[item.code] || 0) + 1
      return counts
    }, {})
    console.log(
      JSON.stringify(
        {
          source: 'local_export',
          exportedAt: input.exportedAt || null,
          readOnly: audit.readOnly,
          invoiceMonth: audit.invoiceMonth,
          status: audit.status,
          counts: audit.counts,
          totals: audit.totals,
          findingCounts,
        },
        null,
        2,
      ),
    )
  } finally {
    await server.close()
  }
}

main().catch((error) => {
  console.error('Auditoria não executada:', error.message)
  process.exitCode = 1
})
