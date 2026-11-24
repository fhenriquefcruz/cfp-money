import { test } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário: registrar diferenças exatas do Prettier', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'meureal-format-'))
  for (const file of ['src/domain/finance.js', 'src/domain/moneyAssistant.js']) {
    const original = readFileSync(file, 'utf8')
    const options = (await prettier.resolveConfig(file)) || {}
    const formatted = await prettier.format(original, { ...options, filepath: file })
    if (original === formatted) continue
    const left = join(temp, file.split('/').pop() + '.current')
    const right = join(temp, file.split('/').pop() + '.prettier')
    writeFileSync(left, original)
    writeFileSync(right, formatted)
    try {
      execFileSync('diff', ['-u', left, right], { encoding: 'utf8' })
    } catch (error) {
      console.log('PRETTIER_EXACT_DIFF ' + file + '\n' + error.stdout)
    }
  }
})
