// Diagnóstico temporário de formatação da PR; remover antes de aprovação.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário de diferenças Prettier', async () => {
  const paths = [
    'src/domain/dashboard.js',
    'src/domain/dashboard.test.js',
    'src/components/Dashboard.jsx',
  ]
  const directory = mkdtempSync(join(tmpdir(), 'meureal-prettier-'))

  try {
    for (const path of paths) {
      const original = readFileSync(path, 'utf8')
      const options = (await prettier.resolveConfig(path)) || {}
      const formatted = await prettier.format(original, { ...options, filepath: path })
      if (formatted === original) continue

      const target = join(directory, path.split('/').at(-1))
      writeFileSync(target, formatted)
      const result = spawnSync('git', ['diff', '--no-index', '--', path, target], {
        encoding: 'utf8',
        maxBuffer: 1000 * 1000,
      })
      console.log('FORMAT_DIAGNOSTIC_START ' + path)
      console.log(result.stdout.slice(0, 20000))
      console.log('FORMAT_DIAGNOSTIC_END ' + path)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
