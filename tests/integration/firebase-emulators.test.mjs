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
  getDocs,
  getFirestore,
  runTransaction,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { persistInvoiceEventOperation } from '../../src/services/invoiceEventPersistence.js'

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
const firestoreAddress = parseHost(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1', 8080)
const functionsAddress = parseHost(process.env.FUNCTIONS_EMULATOR_HOST, '127.0.0.1', 5001)

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

    // Comprovantes: acesso do titular, vínculo obrigatório e limite por fragmento.
    const receiptTransaction = doc(database, 'users', uid, 'transactions', 'receipt-test')
    await setDoc(receiptTransaction, {
      date: '2026-10-22',
      type: 'expense',
      amount: 32,
      description: 'Compra com comprovante',
    })
    const receiptChunk = doc(database, 'users', uid, 'transactionAttachmentChunks', 'receipt_0')
    await setDoc(receiptChunk, {
      txId: 'receipt-test',
      attachmentId: 'receipt',
      chunkIndex: 0,
      data: 'cGRm',
    })
    assert.equal((await getDoc(receiptChunk)).data().data, 'cGRm')
    await assert.rejects(
      () =>
        getDoc(doc(database, 'users', 'another-user', 'transactionAttachmentChunks', 'receipt_0')),
      (error) => error?.code === 'permission-denied',
    )
    await assert.rejects(
      () =>
        setDoc(doc(database, 'users', uid, 'transactionAttachmentChunks', 'unbound_0'), {
          txId: 'not-existing',
          attachmentId: 'unbound',
          chunkIndex: 0,
          data: 'cGRm',
        }),
      (error) => error?.code === 'permission-denied',
    )
    await assert.rejects(
      () =>
        setDoc(doc(database, 'users', uid, 'transactionAttachmentChunks', 'huge_0'), {
          txId: 'receipt-test',
          attachmentId: 'huge',
          chunkIndex: 0,
          data: 'a'.repeat(270001),
        }),
      (error) => error?.code === 'permission-denied',
    )

    // Fragmentos e índice devem coexistir na mesma transação, com Rules ativas.
    const atomicChunk = doc(database, 'users', uid, 'transactionAttachmentChunks', 'atomic_0')
    await runTransaction(database, async (operation) => {
      const current = await operation.get(receiptTransaction)
      assert.equal(current.exists(), true)
      operation.set(atomicChunk, {
        txId: 'receipt-test',
        attachmentId: 'atomic',
        chunkIndex: 0,
        data: 'cGRm',
      })
      operation.update(receiptTransaction, {
        attachments: [{ id: 'atomic', name: 'prova.pdf', size: 3, chunkCount: 1 }],
      })
    })
    assert.equal((await getDoc(atomicChunk)).exists(), true)
    assert.equal((await getDoc(receiptTransaction)).data().attachments.length, 1)
    await runTransaction(database, async (operation) => {
      const current = await operation.get(receiptTransaction)
      assert.equal(current.exists(), true)
      operation.delete(atomicChunk)
      operation.update(receiptTransaction, { attachments: [] })
    })
    assert.equal((await getDoc(atomicChunk)).exists(), false)
    assert.deepEqual((await getDoc(receiptTransaction)).data().attachments, [])

    // A exclusão e seu registro de limpeza são persistidos juntos.
    const deletedTx = doc(database, 'users', uid, 'transactions', 'deleted-with-receipt')
    const orphanChunk = doc(database, 'users', uid, 'transactionAttachmentChunks', 'orphan_0')
    const cleanupJob = doc(database, 'users', uid, 'attachmentCleanupJobs', 'cleanup-test')
    await setDoc(deletedTx, { type: 'expense', amount: 1, date: '2026-10-23' })
    await setDoc(orphanChunk, {
      txId: 'deleted-with-receipt',
      attachmentId: 'orphan',
      chunkIndex: 0,
      data: 'cGRm',
    })
    const deleteWithQueue = writeBatch(database)
    deleteWithQueue.delete(deletedTx)
    deleteWithQueue.set(cleanupJob, { txIds: ['deleted-with-receipt'] })
    await deleteWithQueue.commit()
    assert.equal((await getDoc(deletedTx)).exists(), false)
    assert.deepEqual((await getDoc(cleanupJob)).data().txIds, ['deleted-with-receipt'])
    assert.equal((await getDoc(orphanChunk)).exists(), true)

    // Os fragmentos remanescentes podem ser removidos pelo titular, mesmo
    // depois da exclusão do documento financeiro.
    const recover = writeBatch(database)
    recover.delete(orphanChunk)
    recover.delete(cleanupJob)
    await recover.commit()
    assert.equal((await getDoc(orphanChunk)).exists(), false)
    assert.equal((await getDoc(cleanupJob)).exists(), false)

    // Eventos de fatura: a mesma intenção concorrente em sessões diferentes gera
    // um único documento, inclusive quando o cliente repete após timeout.
    const paymentOperation = 'integration-payment-operation-0001'
    const invoicePayment = {
      operationId: paymentOperation,
      type: 'payment',
      cardId: 'card-integration',
      cardName: 'Cartão de teste',
      cardLast4: '1234',
      invoiceMonth: '2026-11',
      invoiceKey: 'card-integration:2026-11',
      eventDate: '2026-11-15',
      paymentDate: '2026-11-15',
      amount: 150.25,
      sourceAccount: 'Conta de teste',
      notes: '',
    }

    const secondClient = initializeApp(
      {
        apiKey: 'demo-api-key',
        authDomain: `${PROJECT_ID}.firebaseapp.com`,
        projectId: PROJECT_ID,
        appId: '1:123456789:web:invoice-idempotency',
      },
      'firebase-emulator-integration-second-session',
    )
    try {
      const secondAuth = getAuth(secondClient)
      const secondDatabase = getFirestore(secondClient)
      connectAuthEmulator(secondAuth, `http://${authAddress.host}:${authAddress.port}`, {
        disableWarnings: true,
      })
      connectFirestoreEmulator(secondDatabase, firestoreAddress.host, firestoreAddress.port)
      await signInWithEmailAndPassword(secondAuth, 'integration-user@example.com', TEST_PASSWORD)

      const ids = await Promise.all([
        persistInvoiceEventOperation(database, uid, invoicePayment),
        persistInvoiceEventOperation(secondDatabase, uid, invoicePayment),
      ])
      assert.deepEqual(ids, [`op_${paymentOperation}`, `op_${paymentOperation}`])

      const existingReference = doc(database, 'users', uid, 'invoiceEvents', ids[0])
      const originalCreatedAt = (await getDoc(existingReference)).data().createdAt.toMillis()
      assert.equal(await persistInvoiceEventOperation(database, uid, invoicePayment), ids[0])
      assert.equal((await getDoc(existingReference)).data().createdAt.toMillis(), originalCreatedAt)
      await assert.rejects(
        () =>
          persistInvoiceEventOperation(secondDatabase, uid, { ...invoicePayment, amount: 150.26 }),
        /outros dados/,
      )

      const anotherOperation = {
        ...invoicePayment,
        operationId: 'integration-payment-operation-0002',
      }
      assert.equal(
        await persistInvoiceEventOperation(database, uid, anotherOperation),
        'op_integration-payment-operation-0002',
      )
      const events = await getDocs(collection(database, 'users', uid, 'invoiceEvents'))
      assert.equal(events.size, 2)
      assert.equal(
        events.docs.reduce((sum, event) => sum + event.data().amount, 0),
        300.5,
      )
      await assert.rejects(
        () => getDoc(doc(secondDatabase, 'users', 'another-user', 'invoiceEvents', ids[0])),
        (error) => error?.code === 'permission-denied',
      )

      // Corrida real entre duas sessões com IDENTIDADES DIFERENTES para estornar
      // o mesmo pagamento. A trava impede que ambas registrem liquidação inversa.
      const makeReversal = (operationId) => ({
        operationId,
        type: 'reversal',
        cardId: invoicePayment.cardId,
        cardName: invoicePayment.cardName,
        cardLast4: invoicePayment.cardLast4,
        invoiceMonth: invoicePayment.invoiceMonth,
        invoiceKey: invoicePayment.invoiceKey,
        eventDate: '2026-11-16',
        amount: 150.25,
        reversesEventId: ids[0],
        sourceAccount: 'Conta de teste',
        notes: 'Estorno integral em teste',
      })
      const firstReversal = makeReversal('integration-reversal-operation-0001')
      const competingReversal = makeReversal('integration-reversal-operation-0002')
      const reversalResults = await Promise.allSettled([
        persistInvoiceEventOperation(database, uid, firstReversal),
        persistInvoiceEventOperation(secondDatabase, uid, competingReversal),
      ])
      const successes = reversalResults.filter((item) => item.status === 'fulfilled')
      const failures = reversalResults.filter((item) => item.status === 'rejected')
      assert.equal(successes.length, 1)
      assert.equal(failures.length, 1)

      const successfulReversal =
        reversalResults[0].status === 'fulfilled' ? firstReversal : competingReversal
      const successfulId = successes[0].value
      const lockRef = doc(database, 'users', uid, 'invoiceReversalLocks', ids[0])
      const persistedLock = (await getDoc(lockRef)).data()
      assert.equal(persistedLock.paymentId, ids[0])
      assert.equal(persistedLock.reversalEventId, successfulId)
      assert.equal(persistedLock.amountCents, 15025)
      assert.equal(
        await persistInvoiceEventOperation(database, uid, successfulReversal),
        successfulId,
      )
      assert.equal((await getDocs(collection(database, 'users', uid, 'invoiceEvents'))).size, 3)
    } finally {
      await deleteApp(secondClient)
    }

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
    assert.equal(answeredSupport.data().response, 'Atendimento validado pelo teste de integração.')
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
