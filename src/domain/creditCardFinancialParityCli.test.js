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
      evidence: {
        scope: 'full_export',
        bankReconciliation: false,
        exportTimestampVerified: true,
        collections: { creditCards: 1, transactions: 1, invoiceEventsIncluded: true },
      },
    })
    expect(result.stdout).not.toContain(secretDescription)
    expect(result.stdout).not.toContain('secret-card-id')
    expect(result.stdout).not.toContain('secret-transaction-id')
    expect(result.stdout).not.toContain('Cartão confidencial')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('comando offline lê exportação backend versionada e contabiliza IDs ausentes sem expor dados', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meu-real-backend-audit-'))
  const file = join(directory, 'backend-export.json')
  try {
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: '1.0.0',
        generatedAt: '2026-10-22T12:00:00.000Z',
        data: {
          creditCards: [{ id: null, name: 'Cartão legado', closingDay: 5, dueDay: 12 }],
          transactions: [],
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
    expect(JSON.parse(result.stdout)).toMatchObject({
      exportFormat: 'backend',
      invoiceMonth: '2026-10',
      readOnly: true,
      status: 'critical',
      findingCounts: { missing_card_registration_id: 1 },
      evidence: {
        level: 'insufficient',
        bankReconciliation: false,
        warnings: expect.arrayContaining([
          'ambiguous_card_identifiers',
          'no_credit_activity_in_export',
        ]),
      },
    })
    expect(result.stdout).not.toContain('Cartão legado')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('CLI compara exportações Spark antigas e backend atuais sem expor identificadores', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meu-real-snapshot-compare-'))
  const oldPath = join(directory, 'old.json')
  const newPath = join(directory, 'new.json')
  const secret = 'NEVER_OUTPUT_PRIVATE_CARD_NAME'
  try {
    await writeFile(
      oldPath,
      JSON.stringify({
        exportedAt: '2026-09-28T10:00:00Z',
        mode: 'spark',
        collections: {
          creditCards: [{ id: null, name: secret }],
          transactions: [
            {
              id: 'private-transaction-id',
              type: 'expense',
              paymentMethod: 'credit_card',
              cardId: 'private-canonical-card-id',
              invoiceMonth: '2026-10',
              amount: 11.99,
            },
          ],
          invoiceEvents: [],
        },
      }),
    )
    await writeFile(
      newPath,
      JSON.stringify({
        generatedAt: '2026-10-28T10:00:00Z',
        schemaVersion: '1.0.0',
        data: {
          creditCards: [{ id: 'private-canonical-card-id', name: secret }],
          transactions: [
            {
              id: 'private-transaction-id',
              type: 'expense',
              paymentMethod: 'credit_card',
              cardId: 'private-canonical-card-id',
              invoiceMonth: '2026-10',
              amount: 11.99,
            },
          ],
          invoiceEvents: [],
        },
      }),
    )
    const result = spawnSync(
      process.execPath,
      ['scripts/audit-credit-cards.mjs', newPath, '--month', '2026-10', '--compare', oldPath],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 45_000 },
    )
    expect(result.status, result.stderr).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output).toMatchObject({
      readOnly: true,
      exportFormat: 'backend',
      invoiceMonth: '2026-10',
      status: 'ok',
      comparison: {
        readOnly: true,
        identityObservation: 'ids_present_in_new_export',
        previous: { counts: { missingCardIds: 1, orphanCardReferences: 1 } },
        current: { counts: { missingCardIds: 0, linkedPurchases: 1 } },
        sharedRecords: {
          commonTransactions: 1,
          unchangedCardReferences: 1,
          changedCardReferences: 0,
          changedAmounts: 0,
        },
      },
    })
    expect(result.stdout).not.toContain(secret)
    expect(result.stdout).not.toContain('private-transaction-id')
    expect(result.stdout).not.toContain('private-canonical-card-id')
    expect(result.stdout).not.toContain(oldPath)
    expect(result.stderr).not.toContain(secret)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('CLI rejeita comparação cronologicamente invertida e mantém arquivos originais', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meu-real-snapshot-order-'))
  const earlier = join(directory, 'earlier.json')
  const later = join(directory, 'later.json')
  try {
    await writeFile(
      earlier,
      JSON.stringify({
        exportedAt: '2026-09-28T10:00:00Z',
        collections: { creditCards: [], transactions: [] },
      }),
    )
    await writeFile(
      later,
      JSON.stringify({
        exportedAt: '2026-10-28T10:00:00Z',
        collections: { creditCards: [], transactions: [] },
      }),
    )
    const result = spawnSync(
      process.execPath,
      ['scripts/audit-credit-cards.mjs', earlier, '--compare', later],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 45_000 },
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('anterior tem data posterior')
    expect(result.stdout).toBe('')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
