import { readFileSync } from 'node:fs'
import prettier from 'prettier'
import { test } from 'vitest'

test('prettier probe for transaction filter domain', async () => {
  const source = readFileSync('src/domain/transactionFilterViews.js', 'utf8')
  const formatted = await prettier.format(source, {
    parser: 'babel',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
  })

  console.log('\n=== PRETTIER_PROBE_START ===\n' + formatted + '=== PRETTIER_PROBE_END ===\n')
})
