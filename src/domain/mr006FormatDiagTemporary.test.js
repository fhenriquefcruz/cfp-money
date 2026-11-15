import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário de formatação MR-006', async () => {
  const paths = ['src/domain/finance.test.js', 'src/domain/savings.test.js']
  const directory = mkdtempSync(join(tmpdir(), 'meu-real-format-mr006-'))
  try {
    for (const path of paths) {
      const original = readFileSync(path, 'utf8')
      const config = (await prettier.resolveConfig(path)) || {}
      const formatted = await prettier.format(original, { ...config, filepath: path })
      if (original === formatted) continue
      const destination = join(directory, path.split('/').at(-1))
      writeFileSync(destination, formatted)
      const diff = spawnSync('git', ['diff', '--no-index', '--', path, destination], {
        encoding: 'utf8',
      })
      console.log('MR006_FORMAT_START ' + path)
      console.log(diff.stdout.slice(0, 22000))
      console.log('MR006_FORMAT_END ' + path)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
