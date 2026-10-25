// Temporary metadata probe for the October 2026 npm advisory remediations.
// Reads only public package manifests; removed before merge.
import { execFileSync } from 'node:child_process'
import { it } from 'vitest'

it('checks public registry metadata for patched dependency releases', () => {
  const packages = [
    ['undici', '6.29.1'],
    ['body-parser', '1.20.9'],
    ['body-parser', '2.4.0'],
    ['zod', '4.6.7'],
  ]
  for (const [name, version] of packages) {
    const raw = execFileSync('npm', ['view', `${name}@${version}`, '--json'], {
      encoding: 'utf8',
      timeout: 30000,
    })
    const entry = JSON.parse(raw)
    console.info(
      'SECURITY_PATCH_METADATA',
      JSON.stringify({
        name,
        version: entry.version,
        integrity: entry.dist?.integrity,
        dependencies: entry.dependencies || {},
        engines: entry.engines || {},
      }),
    )
    if (entry.version !== version || !entry.dist?.integrity) {
      throw new Error(`Faltam metadados de ${name}@${version}`)
    }
  }
}, 150000)
