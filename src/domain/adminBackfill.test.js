import fs from 'node:fs'
import prettier from 'prettier'
import { describe, expect, it } from 'vitest'
import {
  buildFirestoreUserDocument,
  buildParityReport,
  normalizeAuthExport,
  parseCreationTime,
} from './adminBackfill'

describe('adminBackfill', () => {
  it('preserves the original Authentication creation time', () => {
    expect(parseCreationTime({ createdAt: '1704067200000' })).toBe('2024-01-01T00:00:00.000Z')
    expect(parseCreationTime({ metadata: { creationTime: '2025-02-03T10:20:30.000Z' } })).toBe(
      '2025-02-03T10:20:30.000Z',
    )
  })

  it('normalizes Firebase Authentication exports by UID', () => {
    expect(
      normalizeAuthExport({
        users: [
          {
            localId: 'uid-auth-1',
            email: 'user@example.com',
            displayName: 'User',
            createdAt: '1704067200000',
          },
        ],
      }),
    ).toEqual([
      {
        uid: 'uid-auth-1',
        email: 'user@example.com',
        displayName: 'User',
        creationTime: '2024-01-01T00:00:00.000Z',
      },
    ])
  })

  it('reports Auth-only, Firestore-only and duplicate Firestore emails without deleting anything', () => {
    const report = buildParityReport(
      [
        { uid: 'auth-1', email: 'one@example.com' },
        { uid: 'auth-2', email: 'two@example.com' },
      ],
      [
        { uid: 'auth-1', email: 'one@example.com' },
        { uid: 'legacy-1', email: 'duplicate@example.com' },
        { uid: 'legacy-2', email: 'duplicate@example.com' },
      ],
    )

    expect(report.presentInBoth.map((user) => user.uid)).toEqual(['auth-1'])
    expect(report.authOnly.map((user) => user.uid)).toEqual(['auth-2'])
    expect(report.firestoreOnly.map((user) => user.uid)).toEqual(['legacy-1', 'legacy-2'])
    expect(report.firestoreDuplicateEmails).toEqual([
      {
        email: 'duplicate@example.com',
        uids: ['legacy-1', 'legacy-2'],
      },
    ])
  })

  it('builds the minimum profile without granting a fresh trial date', () => {
    const document = buildFirestoreUserDocument({
      uid: 'uid-auth-1',
      email: 'user@example.com',
      displayName: 'User',
      creationTime: '2024-01-01T00:00:00.000Z',
    })

    expect(document.fields.plan).toEqual({ stringValue: 'trial' })
    expect(document.fields.trialStart).toEqual({
      timestampValue: '2024-01-01T00:00:00.000Z',
    })
    expect(document.fields.createdAt).toEqual({
      timestampValue: '2024-01-01T00:00:00.000Z',
    })
    expect(document.fields.premiumUntil).toEqual({ nullValue: null })
    expect(document.fields.blocked).toEqual({ booleanValue: false })
  })

  it('refuses to invent a creation date', () => {
    expect(() =>
      buildFirestoreUserDocument({
        uid: 'uid-auth-1',
        email: 'user@example.com',
        displayName: 'User',
        creationTime: null,
      }),
    ).toThrow(/sem data original de criação/)
  })
})


test('temporary formatting probe', async () => {
  const source = fs.readFileSync(new URL('./adminBackfill.js', import.meta.url), 'utf8')
  const formatted = await prettier.format(source, {
    parser: 'babel',
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
  })

  if (source !== formatted) {
    console.log('PRETTIER_EXPECTED_START\\n' + formatted + 'PRETTIER_EXPECTED_END')
  }

  expect(source).toBe(formatted)
})
