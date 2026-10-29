#!/usr/bin/env node
// Auditoria local, consultiva, sem rede/Firestore ou gravação em dados de origem.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import {
  compareCardSnapshots,
  readSnapshotRecords,
  snapshotDate,
  summarizeSnapshotIdentity,
} from './card-snapshot-comparison.mjs'

const args = process.argv.slice(2)
const usage = 'Uso: npm run audit:cards -- atual.json [--month AAAA-MM] [--compare anterior.json]'

function parseOptions(argv) {
  if (!argv[0] || argv[0].startsWith('--')) throw new Error(usage)
  let month = null
  let compare = null
  for (let i = 1; i < argv.length; i += 2) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(usage)
    if (flag === '--month' && month === null) month = value
    else if (flag === '--compare' && compare === null) compare = value
    else throw new Error(usage)
  }
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(usage)
  return { file: argv[0], month, compare }
}

async function readExport(file) {
  let raw
  try {
    raw = await readFile(resolve(file), 'utf8')
  } catch {
    throw new Error('Não foi possível ler um dos arquivos de exportação.')
  }
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Uma das exportações não contém JSON válido.')
  }
  readSnapshotRecords(value)
  return value
}

async function main() {
  const { file, month, compare } = parseOptions(args)
  const input = await readExport(file)
  const previous = compare ? await readExport(compare) : null
  const records = readSnapshotRecords(input)
  const selectedMonth = month || snapshotDate(input)?.slice(0, 7)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth || '')) {
    throw new Error('Informe --month AAAA-MM ou use uma exportação com data válida.')
  }

  const comparison = previous ? compareCardSnapshots(previous, input) : null
  const server = await createServer({
    logLevel: 'silent',
    server: { middlewareMode: true },
    appType: 'custom',
  })
  let report
  try {
    const { auditCreditCardFinancialParity } = await server.ssrLoadModule(
      '/src/domain/creditCardFinancialParity.js',
    )
    const audit = auditCreditCardFinancialParity({
      ...records,
      selectedMonth,
    })
    const findingCounts = audit.findings.reduce((counts, item) => {
      counts[item.code] = (counts[item.code] || 0) + 1
      return counts
    }, {})
    report = {
      source: 'local_export',
      exportFormat: input.mode === 'spark' ? 'spark' : input.schemaVersion ? 'backend' : 'unknown',
      exportedAt: snapshotDate(input),
      readOnly: audit.readOnly,
      invoiceMonth: audit.invoiceMonth,
      status: audit.status,
      counts: audit.counts,
      totals: audit.totals,
      findingCounts,
      identity: summarizeSnapshotIdentity(input),
      ...(comparison ? { comparison } : {}),
    }
  } finally {
    await server.close()
  }
  // Somente agregados; nunca imprimir nomes, IDs, descrições, caminhos ou documentos.
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch((error) => {
  console.error('Auditoria não executada:', error.message)
  process.exitCode = 1
})
