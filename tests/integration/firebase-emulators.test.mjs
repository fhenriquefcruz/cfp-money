import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth'
import {
  Timestamp,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

const PROJECT_ID = 'demo-cfp-money-integration'
const REGION = 'southamerica-east1'

function parseHost(value, fallbackHost, fallbackPort) {
  const normalized = String(value || '').replace(/^https?:\/\//, '')
  const [host = fallbackHost, rawPort = fallbackPort] = normalized.split(':')
  return {
    host: host || fallbackHost,
    port: Number(rawPort || fallbackPort),
  }
}

const authAddress = parseHost(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1', 9099)
const firestoreAddress = parseHost(
  process.env.FIRESTORE_EMULATOR_HOST,
  '127.0.0.1',
  8080,
)
const functionsAddress = parseHost(
  process.env.FUNCTIONS_EMULATOR_HOST,
  '127.0.0.1',
  5001,
)

test('integra Auth, Firestore Rules e Functions callable no Emulator Suite', async () => {
  const app = initializeApp(
    {
      apiKey: 'demo-api-key',
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
      projectId: PROJECT_ID,
      appId: '1:123456789:web:emulator',
    },
    'firebase-emulator-integration',
  )

  const auth = getAuth(app)
  const database = getFirestore(app)
  const functions = getFunctions(app, REGION)

  connectAuthEmulator(auth, `http://${authAddress.host}:${authAddress.port}`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(database, firestoreAddress.host, firestoreAddress.port)
  connectFunctionsEmulator(functions, functionsAddress.host, functionsAddress.port)

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      'integration-user@example.com',
      'MeuReal-Integration-123!',
    )
    const uid = credential.user.uid
    const now = Timestamp.now()

    const userReference = doc(database, 'users', uid)

    await setDoc(userReference, {
      email: credential.user.email,
      displayName: 'Integration User',
      plan: 'trial',
      trialStart: now,
      premiumUntil: null,
      blocked: false,
      createdAt: now,
    })

    const ownProfile = await getDoc(userReference)
    assert.equal(ownProfile.exists(), true)
    assert.equal(ownProfile.data().plan, 'trial')

    await assert.rejects(
      () => getDoc(doc(database, 'users', 'another-user')),
      (error) => error?.code === 'permission-denied',
    )

    const getBackendStatus = httpsCallable(functions, 'getBackendStatus')
    const backendStatus = await getBackendStatus()
    assert.equal(backendStatus.data.ok, true)
    assert.equal(backendStatus.data.uid, uid)
    assert.equal(backendStatus.data.region, REGION)

    const getAccountEntitlement = httpsCallable(functions, 'getAccountEntitlement')
    const entitlement = await getAccountEntitlement()
    assert.equal(entitlement.data.plan, 'trial')
    assert.equal(entitlement.data.isTrial, true)
    assert.equal(entitlement.data.blocked, false)

    const adminListUsers = httpsCallable(functions, 'adminListUsers')
    await assert.rejects(
      () => adminListUsers(),
      (error) => error?.code === 'functions/permission-denied',
    )

    await signOut(auth)

    await assert.rejects(
      () => getBackendStatus(),
      (error) => error?.code === 'functions/unauthenticated',
    )
  } finally {
    await deleteApp(app)
  }
})
