// Safety gate for publishing the checked-in Firestore rules without overwriting
// unexpected Console changes. Read-only check before and after Firebase CLI deploy.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { GoogleAuth } = require('google-auth-library')

const mode = process.argv[2]
if (!['before', 'after'].includes(mode)) throw new Error('Expected before or after')
const normalize = (input) => String(input || '').replace(/\r\n/g, '\n').trim()
const intended = normalize(readFileSync('firestore.rules', 'utf8'))
const baseline =
  mode === 'before'
    ? normalize(execFileSync('git', ['show', 'HEAD^:firestore.rules'], { encoding: 'utf8' }))
    : intended

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
})
const token = await auth.getAccessToken()

async function getRules(url) {
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
  if (!response.ok) throw new Error('Firebase Rules API returned HTTP ' + response.status)
  return response.json()
}

const release = await getRules(
  'https://firebaserules.googleapis.com/v1/projects/cfp-money/releases/cloud.firestore',
)
if (!/^projects\/cfp-money\/rulesets\//.test(release.rulesetName || '')) {
  throw new Error('Unexpected Firebase project or ruleset')
}
const result = await getRules('https://firebaserules.googleapis.com/v1/' + release.rulesetName)
const live = normalize(
  result.source?.files?.find((file) => /firestore\.rules$/.test(file.name || ''))?.content ||
    result.source?.files?.[0]?.content,
)
if (!live) throw new Error('Could not read published Firestore rules')

if (mode === 'before') {
  if (live !== baseline && live !== intended) {
    throw new Error('Live Firebase rules diverged from main baseline; deployment blocked')
  }
  console.log('Guard: live rules match the previous main baseline or the intended release.')
} else {
  if (live !== intended) throw new Error('Post-deployment rules do not match repository content')
  console.log('Verified: Firestore rules were published and match the reviewed source.')
}
