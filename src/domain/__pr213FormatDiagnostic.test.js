import { test } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import prettier from 'prettier'

test('diagnóstico temporário de formatação da PR 213', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'pr213-format-'))
  for (const filename of [
    'src/components/Admin.jsx',
    'src/domain/categoryComposition.test.js',
    'src/services/sparkPrivacy.test.js',
  ]) {
    const existing = readFileSync(filename, 'utf8')
    const config = (await prettier.resolveConfig(filename)) || {}
    const formatted = await prettier.format(existing, { ...config, filepath: filename })
    if (existing === formatted) continue
    const left = join(temporaryDirectory, filename.split('/').at(-1) + '.original')
    const right = join(temporaryDirectory, filename.split('/').at(-1) + '.formatted')
    writeFileSync(left, existing)
    writeFileSync(right, formatted)
    try {
      execFileSync('diff', ['-u', left, right], { encoding: 'utf8' })
    } catch (error) {
      console.log('EXACT_PR213_FORMAT_DIFF ' + filename + '\n' + error.stdout)
    }
  }
})
