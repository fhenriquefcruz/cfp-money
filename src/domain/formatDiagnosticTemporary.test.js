import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário Prettier do MR-003', async () => {
  const paths = [
    'src/components/InvoiceLifecycleModal.jsx',
    'src/domain/invoiceEventIdempotency.js',
    'src/domain/invoiceEventIdempotency.test.js',
    'tests/integration/firebase-emulators.test.mjs',
  ]
  const directory = mkdtempSync(join(tmpdir(), 'meureal-mr003-format-'))
  try {
    for (const path of paths) {
      const original = readFileSync(path, 'utf8')
      const options = (await prettier.resolveConfig(path)) || {}
      const formatted = await prettier.format(original, { ...options, filepath: path })
      if (formatted === original) continue

      const destination = join(directory, path.split('/').at(-1))
      writeFileSync(destination, formatted)
      const result = spawnSync('git', ['diff', '--no-index', '--', path, destination], {
        encoding: 'utf8',
        maxBuffer: 1000000,
      })
      console.log('FORMAT_DIAGNOSTIC_START ' + path)
      console.log(result.stdout.slice(0, 30000))
      console.log('FORMAT_DIAGNOSTIC_END ' + path)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
