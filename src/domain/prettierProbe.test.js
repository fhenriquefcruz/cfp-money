import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import prettier from 'prettier'

const OPTIONS = {
  parser: 'babel',
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
}

async function expectFormatted(relativeUrl) {
  const url = new URL(relativeUrl, import.meta.url)
  const input = fs.readFileSync(url, 'utf8')
  const output = await prettier.format(input, OPTIONS)
  expect(input).toBe(output)
}

describe('temporary prettier probe', () => {
  test('TransactionCsvImportModal.jsx', async () => {
    await expectFormatted('../components/TransactionCsvImportModal.jsx')
  })

  test('csvImport.js', async () => {
    await expectFormatted('./csvImport.js')
  })
})
