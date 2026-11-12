import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário Prettier de paridade Worker', async () => {
  const path = 'src/domain/workerFinanceParity.test.js'
  const directory = mkdtempSync(join(tmpdir(), 'meureal-worker-format-'))
  try {
    const original = readFileSync(path, 'utf8')
    const options = (await prettier.resolveConfig(path)) || {}
    const formatted = await prettier.format(original, { ...options, filepath: path })
    const destination = join(directory, 'workerFinanceParity.test.js')
    writeFileSync(destination, formatted)
    const result = spawnSync('git', ['diff', '--no-index', '--', path, destination], {
      encoding: 'utf8',
      maxBuffer: 1000000,
    })
    console.log('FORMAT_DIAGNOSTIC_START')
    console.log(result.stdout.slice(0, 20000))
    console.log('FORMAT_DIAGNOSTIC_END')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
