import fs from 'node:fs'

const file = new URL(
  '../firestore.indexes.json',
  import.meta.url,
)
const parsed = JSON.parse(
  fs.readFileSync(file, 'utf8'),
)

if (!Array.isArray(parsed.indexes)) {
  throw new Error(
    'firestore.indexes.json deve conter o array indexes.',
  )
}

const required = [
  {
    collectionGroup: 'accountDeletionRequests',
    fields: ['status', 'scheduledAt'],
  },
  {
    collectionGroup: 'users',
    fields: [
      'acceptedTermsVersion',
      'acceptedPrivacyVersion',
    ],
  },
]

for (const expected of required) {
  const found = parsed.indexes.some((index) => {
    if (
      index.collectionGroup !==
      expected.collectionGroup
    ) {
      return false
    }

    const fields = (index.fields || []).map(
      (field) => field.fieldPath,
    )

    return expected.fields.every((field) =>
      fields.includes(field),
    )
  })

  if (!found) {
    throw new Error(
      `Índice obrigatório ausente: ${expected.collectionGroup} (${expected.fields.join(', ')}).`,
    )
  }
}

console.log(
  `Firestore: ${parsed.indexes.length} índice(s) validado(s).`,
)
