import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário de formatação MR-003 e placar', async () => {
  const paths = [
    'docs/PRODUCT_READINESS_SCORECARD.md',
    'src/domain/invoiceEventIdempotency.test.js',
    'src/services/invoiceEventRepository.js',
    'tests/integration/firebase-emulators.test.mjs',
  ]
  const directory = mkdtempSync(join(tmpdir(), 'meureal-final-format-'))
  try {
    for (const path of paths) {
      const original = readFileSync(path, 'utf8')
      const options = (await prettier.resolveConfig(path)) || {}
      const formatted = await prettier.format(original, { ...options, filepath: path })
      if (formatted === original) continue
      const target = join(directory, path.split('/').at(-1))
      writeFileSync(target, formatted)
      const diff = spawnSync('git', ['diff', '--no-index', '--', path, target], {
        encoding: 'utf8',
        maxBuffer: 1000000,
      })
      console.log('FORMAT_DIAGNOSTIC_START ' + path)
      console.log(diff.stdout.slice(0, 48000))
      console.log('FORMAT_DIAGNOSTIC_END ' + path)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
