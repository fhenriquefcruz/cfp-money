import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário do Prettier nos testes Worker/MR-004', async () => {
  const files = [
    'src/domain/workerGoalParity.test.js',
    'worker/email-notifications/test/domain.test.js',
  ]
  const directory = mkdtempSync(join(tmpdir(), 'meu-real-worker-format-'))

  try {
    for (const file of files) {
      const current = readFileSync(file, 'utf8')
      const config = (await prettier.resolveConfig(file)) || {}
      const formatted = await prettier.format(current, { ...config, filepath: file })
      if (current === formatted) continue

      const destination = join(directory, file.split('/').at(-1))
      writeFileSync(destination, formatted)
      const diff = spawnSync('git', ['diff', '--no-index', '--', file, destination], {
        encoding: 'utf8',
      })
      console.log('WORKER_FORMAT_START ' + file)
      console.log(diff.stdout.slice(0, 24000))
      console.log('WORKER_FORMAT_END ' + file)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
