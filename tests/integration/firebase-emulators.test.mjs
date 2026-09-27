import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { deleteApp, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  getIdTokenResult,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  Timestamp,
  collection,
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

const requireFromFunctions = createRequire(new URL('../../functions/package.json', import.meta.url))
const { deleteApp: deleteAdminApp, initializeApp: initializeAdminApp } =
  requireFromFunctions('firebase-admin/app')
const { getAuth: getAdminAuth } = requireFromFunctions('firebase-admin/auth')

const PROJECT_ID = 'demo-cfp-money-integration'
const REGION = 'southamerica-east1'
const TEST_PASSWORD = ['emulator', 'integration', '123456'].join('-')

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
  const adminApp = initializeAdminApp(
    { projectId: PROJECT_ID },
    'firebase-emulator-integration-admin',
  )

  const auth = getAuth(app)
  const database = getFirestore(app)
  const functions = getFunctions(app, REGION)
  const adminAuth = getAdminAuth(adminApp)

  connectAuthEmulator(auth, `http://${authAddress.host}:${authAddress.port}`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(database, firestoreAddress.host, firestoreAddress.port)
  connectFunctionsEmulator(functions, functionsAddress.host, functionsAddress.port)

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      'integration-user@example.com',
      TEST_PASSWORD,
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

    const supportReference = doc(collection(database, 'supportRequests'))

    await setDoc(supportReference, {
      uid,
      email: credential.user.email,
      protocol: supportReference.id,
      category: 'technical',
      subject: 'Teste integrado',
      message: 'Validação completa do fluxo administrativo no emulador.',
      status: 'open',
      createdAt: now,
      updatedAt: now,
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

    const adminUser = await adminAuth.createUser({
      email: 'integration-admin@example.com',
      password: TEST_PASSWORD,
    })
    await adminAuth.setCustomUserClaims(adminUser.uid, { admin: true })

    await signOut(auth)
    const adminCredential = await signInWithEmailAndPassword(
      auth,
      'integration-admin@example.com',
      TEST_PASSWORD,
    )
    const adminToken = await getIdTokenResult(adminCredential.user, true)
    assert.equal(adminToken.claims.admin, true)

    const usersResult = await adminListUsers()
    assert.equal(
      usersResult.data.users.some((user) => user.uid === uid),
      true,
    )

    const adminSetUserAccess = httpsCallable(functions, 'adminSetUserAccess')
    const accessResult = await adminSetUserAccess({
      targetUid: uid,
      action: 'activate',
      months: 1,
    })
    assert.equal(accessResult.data.ok, true)

    const premiumProfile = await getDoc(userReference)
    assert.equal(premiumProfile.data().plan, 'premium')
    assert.equal(premiumProfile.data().blocked, false)
    assert.ok(premiumProfile.data().premiumUntil)

    const adminListSupportRequests = httpsCallable(functions, 'adminListSupportRequests')
    const supportResult = await adminListSupportRequests()
    assert.equal(
      supportResult.data.requests.some((request) => request.id === supportReference.id),
      true,
    )

    const adminRespondSupportRequest = httpsCallable(functions, 'adminRespondSupportRequest')
    const responseResult = await adminRespondSupportRequest({
      requestId: supportReference.id,
      status: 'answered',
      response: 'Atendimento validado pelo teste de integração.',
    })
    assert.equal(responseResult.data.ok, true)

    const answeredSupport = await getDoc(supportReference)
    assert.equal(answeredSupport.data().status, 'answered')
    assert.equal(
      answeredSupport.data().response,
      'Atendimento validado pelo teste de integração.',
    )
    assert.equal(answeredSupport.data().responderUid, adminUser.uid)

    await signOut(auth)

    await assert.rejects(
      () => getBackendStatus(),
      (error) => error?.code === 'functions/unauthenticated',
    )
  } finally {
    await deleteApp(app)
    await deleteAdminApp(adminApp)
  }
})
