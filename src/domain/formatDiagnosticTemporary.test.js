import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário de formato MR-003: estornos', async () => {
  const paths = [
    'src/domain/invoiceEventIdempotency.test.js',
    'tests/integration/firebase-emulators.test.mjs',
    'tests/security/firestore.rules.test.js',
  ]
  const directory = mkdtempSync(join(tmpdir(), 'meureal-reversal-format-'))
  try {
    for (const path of paths) {
      const original = readFileSync(path, 'utf8')
      const options = (await prettier.resolveConfig(path)) || {}
      const formatted = await prettier.format(original, { ...options, filepath: path })
      if (formatted === original) continue
      const dest = join(directory, path.split('/').at(-1))
      writeFileSync(dest, formatted)
      const diff = spawnSync('git', ['diff', '--no-index', '--', path, dest], {
        encoding: 'utf8',
      })
      console.log('FORMAT_DIAGNOSTIC_START ' + path)
      console.log(diff.stdout.slice(0, 24000))
      console.log('FORMAT_DIAGNOSTIC_END ' + path)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
