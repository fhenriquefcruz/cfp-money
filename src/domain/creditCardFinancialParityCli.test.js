import { expect, test } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('comando local audita backup JSON sem expor descrições ou IDs no relatório', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meu-real-card-audit-'))
  const file = join(directory, 'export.json')
  const secretDescription = 'PRIVATE_TEST_DESCRIPTION_DO_NOT_PRINT'
  try {
    await writeFile(
      file,
      JSON.stringify({
        exportedAt: '2026-10-20T12:00:00.000Z',
        collections: {
          creditCards: [
            { id: 'secret-card-id', name: 'Cartão confidencial', closingDay: 5, dueDay: 12 },
          ],
          transactions: [
            {
              id: 'secret-transaction-id',
              description: secretDescription,
              type: 'expense',
              paymentMethod: 'credit_card',
              cardId: 'secret-card-id',
              invoiceMonth: '2026-10',
              amount: 42.15,
            },
          ],
          invoiceEvents: [],
        },
      }),
    )
    const result = spawnSync(process.execPath, ['scripts/audit-credit-cards.mjs', file], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 45_000,
    })
    expect(result.status, result.stderr).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output).toMatchObject({
      source: 'local_export',
      invoiceMonth: '2026-10',
      readOnly: true,
      status: 'ok',
      totals: { invoiceTotal: 42.15, paidTotal: 0, remainingTotal: 42.15 },
      findingCounts: {},
    })
    expect(result.stdout).not.toContain(secretDescription)
    expect(result.stdout).not.toContain('secret-card-id')
    expect(result.stdout).not.toContain('secret-transaction-id')
    expect(result.stdout).not.toContain('Cartão confidencial')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
