// Publish only the reviewed Cloud Firestore rules through the Firebase Rules API.
// The normal Firebase CLI path needs Service Usage permissions that the existing
// least-privilege service account does not have.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { GoogleAuth } = require('google-auth-library')
const project = 'cfp-money'
const releaseName = 'projects/cfp-money/releases/cloud.firestore'
const endpoint = 'https://firebaserules.googleapis.com/v1/'
const normalize = (value) => String(value || '').replace(/\r\n/g, '\n').trim()
const intended = readFileSync('firestore.rules', 'utf8')
const current = normalize(intended)
const approvedPrevious = normalize(
  execFileSync('git', ['show', 'e0c3a8aa8c09f4924b614713f5666ffc58752f56:firestore.rules'], {
    encoding: 'utf8',
  }),
)

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})
const token = await auth.getAccessToken()

async function call(url, options = {}) {
  const response = await fetch(endpoint + url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    let errorMessage = ''
    try {
      errorMessage = (await response.json())?.error?.message || ''
    } catch {
      errorMessage = ''
    }
    throw new Error(
      'Firebase Rules API failed with HTTP ' +
        response.status +
        (errorMessage ? ': ' + errorMessage.slice(0, 220) : ''),
    )
  }
  return response.json()
}

async function getRelease() {
  return call(releaseName)
}

async function getPublishedSource(release) {
  if (!/^projects\/cfp-money\/rulesets\//.test(release.rulesetName || '')) {
    throw new Error('Unexpected production ruleset target')
  }
  const ruleset = await call(release.rulesetName)
  return normalize(
    ruleset.source?.files?.find((file) => /firestore\.rules$/.test(file.name || ''))?.content ||
      ruleset.source?.files?.[0]?.content,
  )
}

const initialRelease = await getRelease()
const live = await getPublishedSource(initialRelease)
if (live === current) {
  console.log('Firestore rules already match the intended deployment.')
  process.exit(0)
}
if (live !== approvedPrevious) {
  throw new Error('Live Firestore rules have drifted from the verified baseline. Aborted.')
}

const ruleset = await call('projects/' + project + '/rulesets', {
  method: 'POST',
  body: JSON.stringify({
    source: { files: [{ name: 'firestore.rules', content: intended }] },
  }),
})
if (!/^projects\/cfp-money\/rulesets\//.test(ruleset.name || '')) {
  throw new Error('Firebase did not return the expected new ruleset identifier')
}

const beforeRelease = await getRelease()
if (beforeRelease.rulesetName !== initialRelease.rulesetName) {
  throw new Error('Rules changed concurrently. Aborted without replacing the release.')
}

await call(releaseName, {
  method: 'PATCH',
  body: JSON.stringify({
    release: { name: releaseName, rulesetName: ruleset.name },
    updateMask: 'rulesetName',
  }),
})

const published = await getPublishedSource(await getRelease())
if (published !== current) {
  throw new Error('Published rules mismatch. Confirm Firebase release before enabling receipts.')
}
console.log('Cloud Firestore receipt rules published and independently verified.')
