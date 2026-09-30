import { describe, expect, it } from 'vitest'
import {
  buildFirestoreUserDocument,
  buildParityReport,
  normalizeAuthExport,
  parseCreationTime,
  parseLastSignInTime,
  validateOrphanDeletion,
} from './adminBackfill'

describe('adminBackfill', () => {
  it('preserves the original Authentication creation time', () => {
    expect(parseCreationTime({ createdAt: '1704067200000' })).toBe('2024-01-01T00:00:00.000Z')
    expect(parseCreationTime({ metadata: { creationTime: '2025-02-03T10:20:30.000Z' } })).toBe(
      '2025-02-03T10:20:30.000Z',
    )
  })

  it('normalizes the last Authentication sign-in time', () => {
    expect(parseLastSignInTime({ lastLoginAt: '1760000000000' })).toBe(
      new Date(1760000000000).toISOString(),
    )
    expect(parseLastSignInTime({ metadata: { lastSignInTime: '2026-09-29T21:50:12.000Z' } })).toBe(
      '2026-09-29T21:50:12.000Z',
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
            lastLoginAt: '1760000000000',
          },
        ],
      }),
    ).toEqual([
      {
        uid: 'uid-auth-1',
        email: 'user@example.com',
        displayName: 'User',
        creationTime: '2024-01-01T00:00:00.000Z',
        lastSignInTime: new Date(1760000000000).toISOString(),
      },
    ])
  })

  it('normalizes the live Identity Toolkit users array', () => {
    expect(
      normalizeAuthExport([
        {
          localId: 'uid-live-1',
          email: 'live@example.com',
          displayName: 'Live User',
          createdAt: '1735689600000',
          lastLoginAt: '1760000000000',
        },
      ]),
    ).toEqual([
      {
        uid: 'uid-live-1',
        email: 'live@example.com',
        displayName: 'Live User',
        creationTime: '2025-01-01T00:00:00.000Z',
        lastSignInTime: new Date(1760000000000).toISOString(),
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

describe('validateOrphanDeletion', () => {
  const authUsers = [{ uid: 'active-uid', email: 'owner@example.com' }]
  const firestoreOnly = [{ uid: 'legacy-uid', email: 'owner@example.com' }]
  const safeAudit = {
    uid: 'legacy-uid',
    profile: { email: 'owner@example.com' },
    relatedDocumentCount: 0,
  }

  it('allows deleting only a verified empty Firestore orphan with a replacement Auth identity', () => {
    expect(
      validateOrphanDeletion({
        uid: 'legacy-uid',
        confirmEmail: 'OWNER@example.com',
        authUsers,
        firestoreOnly,
        audit: safeAudit,
      }),
    ).toEqual({
      uid: 'legacy-uid',
      email: 'owner@example.com',
      replacementAuthUid: 'active-uid',
    })
  })

  it('blocks deletion when related documents still exist', () => {
    expect(() =>
      validateOrphanDeletion({
        uid: 'legacy-uid',
        confirmEmail: 'owner@example.com',
        authUsers,
        firestoreOnly,
        audit: { ...safeAudit, relatedDocumentCount: 2 },
      }),
    ).toThrow(/ainda possui 2 documento/)
  })

  it('blocks deletion when the confirmation e-mail is different', () => {
    expect(() =>
      validateOrphanDeletion({
        uid: 'legacy-uid',
        confirmEmail: 'other@example.com',
        authUsers,
        firestoreOnly,
        audit: safeAudit,
      }),
    ).toThrow(/E-mail de confirmação/)
  })

  it('blocks deletion when no replacement Auth identity exists', () => {
    expect(() =>
      validateOrphanDeletion({
        uid: 'legacy-uid',
        confirmEmail: 'owner@example.com',
        authUsers: [],
        firestoreOnly,
        audit: safeAudit,
      }),
    ).toThrow(/não existe outra identidade ativa/)
  })
})
