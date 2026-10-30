import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  getDocs,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { persistInvoiceEventOnce } from '../../src/services/invoiceEventsRepository.js'

const PROJECT_ID = 'demo-cfp-money-security'

const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'

const [host, rawPort] = emulatorAddress.split(':')
const port = Number(rawPort || 8080)

let environment

const initialUser = (email) => ({
  email,
  displayName: email.split('@')[0],
  plan: 'trial',
  trialStart: Timestamp.now(),
  premiumUntil: null,
  blocked: false,
  createdAt: Timestamp.now(),
})

const customCategory = (ownerUid, name = 'Categoria própria') => ({
  name,
  icon: '🧪',
  color: '#334155',
  type: 'expense',
  isDefault: false,
  ownerUid,
})

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
})

after(async () => {
  await environment?.cleanup()
})

beforeEach(async () => {
  await environment.clearFirestore()

  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()

    await Promise.all([
      setDoc(doc(database, 'users', 'alice'), initialUser('alice@example.com')),
      setDoc(doc(database, 'users', 'bob'), initialUser('bob@example.com')),
      setDoc(doc(database, 'users', 'alice', 'transactions', 'transaction-1'), {
        description: 'Registro privado',
        amount: 100,
      }),
      setDoc(doc(database, 'categories', 'default-food'), {
        name: 'Alimentação',
        icon: '🍔',
        color: '#f97316',
        type: 'expense',
        isDefault: true,
        ownerUid: null,
      }),
      setDoc(doc(database, 'categories', 'alice-custom'), customCategory('alice')),
      setDoc(doc(database, 'adminAudit', 'audit-1'), {
        actorUid: 'admin-user',
        action: 'test',
      }),
    ])
  })
})

test('nega acesso para usuário não autenticado', async () => {
  const database = environment.unauthenticatedContext().firestore()

  await assertFails(getDoc(doc(database, 'users', 'alice')))
})

test('isola documentos principais entre usuários', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  await assertSucceeds(getDoc(doc(aliceDatabase, 'users', 'alice')))

  await assertFails(getDoc(doc(aliceDatabase, 'users', 'bob')))
})

test('isola subcoleções financeiras entre usuários', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  const bobDatabase = environment.authenticatedContext('bob').firestore()

  await assertSucceeds(
    getDoc(doc(aliceDatabase, 'users', 'alice', 'transactions', 'transaction-1')),
  )

  await assertFails(getDoc(doc(bobDatabase, 'users', 'alice', 'transactions', 'transaction-1')))

  await assertSucceeds(
    setDoc(doc(aliceDatabase, 'users', 'alice', 'transactions', 'transaction-2'), {
      description: 'Registro da Alice',
      amount: 50,
    }),
  )
})

test('permite somente criação inicial segura do usuário', async () => {
  const charlieDatabase = environment.authenticatedContext('charlie').firestore()

  await assertSucceeds(
    setDoc(doc(charlieDatabase, 'users', 'charlie'), initialUser('charlie@example.com')),
  )

  const premiumDatabase = environment.authenticatedContext('premium-client').firestore()

  await assertFails(
    setDoc(doc(premiumDatabase, 'users', 'premium-client'), {
      ...initialUser('premium@example.com'),
      plan: 'premium',
    }),
  )

  const adminFieldDatabase = environment.authenticatedContext('fake-admin').firestore()

  await assertFails(
    setDoc(doc(adminFieldDatabase, 'users', 'fake-admin'), {
      ...initialUser('fake-admin@example.com'),
      admin: true,
    }),
  )

  const anotherUserDatabase = environment.authenticatedContext('mallory').firestore()

  await assertFails(
    setDoc(doc(anotherUserDatabase, 'users', 'victim'), initialUser('victim@example.com')),
  )
})

test('permite alterações comuns do perfil', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  const userReference = doc(aliceDatabase, 'users', 'alice')

  await assertSucceeds(
    updateDoc(userReference, {
      displayName: 'Alice atualizada',
      updatedAt: Timestamp.now(),
    }),
  )

  await assertSucceeds(
    updateDoc(userReference, {
      email: 'alice.updated@example.com',
      updatedAt: Timestamp.now(),
    }),
  )

  await assertSucceeds(
    updateDoc(userReference, {
      moneySettings: {
        preferredLanguage: 'pt-BR',
      },
      moneySettingsUpdatedAt: Timestamp.now(),
    }),
  )
})

test('permite telemetria própria de atividade sem liberar campos administrativos', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()
  const userReference = doc(aliceDatabase, 'users', 'alice')

  await assertSucceeds(
    updateDoc(userReference, {
      lastSignInAt: Timestamp.fromDate(new Date('2026-09-30T11:00:00.000Z')),
      lastSeenAt: serverTimestamp(),
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      lastSeenAt: Timestamp.fromDate(new Date('2030-01-01T00:00:00.000Z')),
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      lastSignInAt: Timestamp.fromDate(new Date('2030-01-01T00:00:00.000Z')),
      lastSeenAt: serverTimestamp(),
    }),
  )
})

test('impede escalação de plano e bloqueio pelo cliente', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  const userReference = doc(aliceDatabase, 'users', 'alice')

  await assertFails(
    updateDoc(userReference, {
      plan: 'premium',
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      blocked: true,
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      premiumUntil: Timestamp.now(),
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      accessUpdatedBy: 'alice',
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      email: 123,
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      displayName: {
        value: 'Alice',
      },
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      moneySettings: 'configuração inválida',
    }),
  )

  await assertFails(deleteDoc(userReference))
})

test('protege categorias padrão e propriedade', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  const bobDatabase = environment.authenticatedContext('bob').firestore()

  await assertSucceeds(getDoc(doc(aliceDatabase, 'categories', 'default-food')))

  await assertSucceeds(getDoc(doc(aliceDatabase, 'categories', 'alice-custom')))

  await assertFails(getDoc(doc(bobDatabase, 'categories', 'alice-custom')))

  await assertSucceeds(
    setDoc(
      doc(aliceDatabase, 'categories', 'alice-created'),
      customCategory('alice', 'Nova categoria'),
    ),
  )

  await assertFails(
    setDoc(doc(aliceDatabase, 'categories', 'fake-default'), {
      ...customCategory('alice'),
      isDefault: true,
    }),
  )

  await assertFails(setDoc(doc(aliceDatabase, 'categories', 'fake-owner'), customCategory('bob')))
})

test('impede transferência ou promoção de categoria', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  const categoryReference = doc(aliceDatabase, 'categories', 'alice-custom')

  await assertSucceeds(
    updateDoc(categoryReference, {
      name: 'Categoria atualizada',
    }),
  )

  await assertFails(
    updateDoc(categoryReference, {
      ownerUid: 'bob',
    }),
  )

  await assertFails(
    updateDoc(categoryReference, {
      isDefault: true,
    }),
  )

  const bobDatabase = environment.authenticatedContext('bob').firestore()

  await assertFails(deleteDoc(doc(bobDatabase, 'categories', 'alice-custom')))
})

test('permite leituras administrativas previstas', async () => {
  const adminDatabase = environment.authenticatedContext('admin-user', { admin: true }).firestore()

  await assertSucceeds(getDoc(doc(adminDatabase, 'users', 'alice')))

  await assertSucceeds(getDoc(doc(adminDatabase, 'adminAudit', 'audit-1')))

  await assertSucceeds(getDoc(doc(adminDatabase, 'categories', 'alice-custom')))

  await assertFails(
    setDoc(doc(adminDatabase, 'adminAudit', 'client-audit'), {
      action: 'forbidden',
    }),
  )
})

test('valida assinantes de notificações', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  await assertSucceeds(
    setDoc(doc(aliceDatabase, 'notificationSubscribers', 'alice'), {
      uid: 'alice',
      enabled: true,
      updatedAt: Timestamp.now(),
    }),
  )

  await assertFails(
    setDoc(doc(aliceDatabase, 'notificationSubscribers', 'bob'), {
      uid: 'bob',
      enabled: true,
      updatedAt: Timestamp.now(),
    }),
  )

  await assertFails(
    setDoc(doc(aliceDatabase, 'notificationSubscribers', 'alice'), {
      uid: 'alice',
      enabled: true,
      updatedAt: Timestamp.now(),
      destination: 'external@example.com',
    }),
  )

  await assertFails(
    setDoc(doc(aliceDatabase, 'notificationSubscribers', 'alice'), {
      uid: 'alice',
      enabled: false,
      updatedAt: Timestamp.now(),
    }),
  )
})

test('bloqueia coleções internas e caminhos desconhecidos', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()

  await assertFails(
    setDoc(doc(aliceDatabase, 'privacyAudit', 'client-write'), {
      uid: 'alice',
    }),
  )

  await assertFails(
    setDoc(doc(aliceDatabase, 'unexpectedCollection', 'document'), {
      value: true,
    }),
  )
})

test('permite ao admin atualizar somente campos de acesso com autoria própria', async () => {
  const adminDatabase = environment.authenticatedContext('admin-user', { admin: true }).firestore()
  const userReference = doc(adminDatabase, 'users', 'alice')
  const now = Timestamp.now()

  await assertSucceeds(
    updateDoc(userReference, {
      plan: 'premium',
      premiumUntil: Timestamp.fromMillis(now.toMillis() + 30 * 86_400_000),
      blocked: false,
      updatedAt: now,
      accessUpdatedAt: now,
      accessUpdatedBy: 'admin-user',
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      blocked: true,
      updatedAt: now,
      accessUpdatedAt: now,
      accessUpdatedBy: 'outro-admin',
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      displayName: 'Alterado pelo admin',
      updatedAt: now,
      accessUpdatedAt: now,
      accessUpdatedBy: 'admin-user',
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      plan: 'premium',
      premiumUntil: null,
      updatedAt: now,
      accessUpdatedAt: now,
      accessUpdatedBy: 'admin-user',
    }),
  )

  await assertFails(
    updateDoc(userReference, {
      plan: 'trial',
      premiumUntil: null,
      updatedAt: now,
      accessUpdatedAt: now,
      accessUpdatedBy: 'admin-user',
    }),
  )
})

test('protege solicitações de suporte e permite resposta administrativa', async () => {
  const aliceDatabase = environment.authenticatedContext('alice').firestore()
  const bobDatabase = environment.authenticatedContext('bob').firestore()
  const adminDatabase = environment.authenticatedContext('admin-user', { admin: true }).firestore()
  const requestReference = doc(aliceDatabase, 'supportRequests', 'support-alice-1')
  const now = Timestamp.now()

  await assertSucceeds(
    setDoc(requestReference, {
      uid: 'alice',
      email: 'alice@example.com',
      protocol: 'support-alice-1',
      category: 'privacy',
      subject: 'Exercício de direito',
      message: 'Quero confirmar quais dados estão vinculados à minha conta.',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }),
  )

  await assertSucceeds(getDoc(requestReference))
  await assertFails(getDoc(doc(bobDatabase, 'supportRequests', 'support-alice-1')))
  await assertSucceeds(getDoc(doc(adminDatabase, 'supportRequests', 'support-alice-1')))

  await assertFails(
    updateDoc(requestReference, {
      status: 'closed',
    }),
  )

  await assertSucceeds(
    updateDoc(doc(adminDatabase, 'supportRequests', 'support-alice-1'), {
      status: 'answered',
      response: 'Solicitação recebida e respondida pelo canal oficial.',
      respondedAt: now,
      updatedAt: now,
      responderUid: 'admin-user',
    }),
  )

  await assertFails(
    setDoc(doc(aliceDatabase, 'supportRequests', 'support-alice-invalid'), {
      uid: 'alice',
      email: 'alice@example.com',
      protocol: 'outro-protocolo',
      category: 'privacy',
      subject: 'Teste',
      message: 'Mensagem suficientemente longa.',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }),
  )
})

test('conciliação de cartão respeita titularidade e restaura dados sem duplicar despesas', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const transaction = doc(alice, 'users', 'alice', 'transactions', 'legacy-card-test')
  const card = doc(alice, 'users', 'alice', 'creditCards', 'card-test')
  const original = {
    type: 'expense',
    paymentMethod: 'credit_card',
    amount: 92.41,
    date: '2026-10-07',
    installmentNum: 2,
    installmentOf: 3,
    categoryId: 'food',
  }

  await assertSucceeds(setDoc(transaction, original))
  await assertSucceeds(
    setDoc(card, { name: 'Cartão de teste', last4: '1234', closingDay: 5, dueDay: 12 }),
  )
  const forbidden = doc(bob, 'users', 'alice', 'transactions', 'legacy-card-test')
  await assertFails(updateDoc(forbidden, { cardId: 'card-test' }))

  await assertSucceeds(
    runTransaction(alice, async (operation) => {
      const [purchase, registeredCard] = await Promise.all([
        operation.get(transaction),
        operation.get(card),
      ])
      assert.equal(purchase.exists(), true)
      assert.equal(registeredCard.exists(), true)
      assert.equal(purchase.data().cardId, undefined)
      const changes = {
        cardId: registeredCard.id,
        cardName: registeredCard.data().name,
        cardLast4: registeredCard.data().last4,
        cardClosingDay: registeredCard.data().closingDay,
        cardDueDay: registeredCard.data().dueDay,
        invoiceMonth: '2026-10',
        isCreditPurchase: true,
      }
      operation.update(transaction, {
        ...changes,
        cardReconciliation: {
          version: 1,
          cardId: registeredCard.id,
          previous: {},
          absent: Object.keys(changes),
          applied: changes,
        },
        updatedAt: serverTimestamp(),
      })
    }),
  )

  const linked = (await getDoc(transaction)).data()
  assert.equal(linked.cardId, 'card-test')
  assert.equal(linked.invoiceMonth, '2026-10')
  for (const key of Object.keys(original)) assert.deepEqual(linked[key], original[key])
  await assertFails(updateDoc(forbidden, { invoiceMonth: '2026-11' }))

  await assertSucceeds(
    runTransaction(alice, async (operation) => {
      const snapshot = await operation.get(transaction)
      const current = snapshot.data()
      assert.equal(current.cardReconciliation.cardId, current.cardId)
      operation.update(transaction, {
        ...Object.fromEntries(current.cardReconciliation.absent.map((key) => [key, deleteField()])),
        cardReconciliation: deleteField(),
        updatedAt: serverTimestamp(),
      })
    }),
  )
  const restored = (await getDoc(transaction)).data()
  for (const key of Object.keys(original)) assert.deepEqual(restored[key], original[key])
  assert.equal(restored.cardId, undefined)
  assert.equal(restored.cardReconciliation, undefined)
})

const syntheticInvoicePayment = (changes = {}) => ({
  operationId: 'evt_123e4567-e89b-42d3-a456-426614174000',
  type: 'payment',
  invoiceKey: 'card-demo:2026-10',
  cardId: 'card-demo',
  cardName: 'Cartão de teste',
  cardLast4: '5186',
  invoiceMonth: '2026-10',
  eventDate: '2026-10-30',
  notes: '',
  amount: 300,
  paymentDate: '2026-10-30',
  sourceAccount: 'Conta fictícia',
  ...changes,
})

test('Gate 2: retry e duas sessões concorrentes com mesma operação criam um único pagamento', async () => {
  const first = environment.authenticatedContext('alice').firestore()
  const second = environment.authenticatedContext('alice').firestore()
  const event = syntheticInvoicePayment()

  const results = await Promise.all([
    persistInvoiceEventOnce(first, 'alice', event),
    persistInvoiceEventOnce(second, 'alice', event),
  ])
  assert.deepEqual(results, [event.operationId, event.operationId])
  assert.equal(await persistInvoiceEventOnce(first, 'alice', event), event.operationId)

  const events = await getDocs(collection(first, 'users', 'alice', 'invoiceEvents'))
  assert.equal(events.size, 1)
  assert.equal(events.docs[0].data().amount, 300)
  assert.ok(events.docs[0].data().createdAt)
})

test('Gate 2: chave repetida com outro valor rejeita colisão e preserva pagamento original', async () => {
  const database = environment.authenticatedContext('alice').firestore()
  const event = syntheticInvoicePayment()
  await persistInvoiceEventOnce(database, 'alice', event)
  await assert.rejects(
    persistInvoiceEventOnce(database, 'alice', { ...event, amount: 450 }),
    /Chave de operação já utilizada/,
  )
  const stored = await getDoc(doc(database, 'users', 'alice', 'invoiceEvents', event.operationId))
  assert.equal(stored.data().amount, 300)
})

test('Gate 2: Firestore impede evento inválido, alteração e acesso cruzado', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const event = syntheticInvoicePayment()
  const path = ['users', 'alice', 'invoiceEvents', event.operationId]

  await assertFails(setDoc(doc(alice, ...path), { ...event, amount: -100, createdAt: Timestamp.now() }))
  await assertFails(setDoc(doc(alice, ...path), { ...event, amount: '300', createdAt: Timestamp.now() }))
  await assertFails(setDoc(doc(alice, ...path), { ...event, invoiceKey: 'wrong', createdAt: Timestamp.now() }))
  await assertFails(setDoc(doc(alice, ...path), { ...event, operationId: 'different', createdAt: Timestamp.now() }))
  await assertFails(setDoc(doc(bob, ...path), { ...event, createdAt: Timestamp.now() }))

  await persistInvoiceEventOnce(alice, 'alice', event)
  await assertFails(getDoc(doc(bob, ...path)))
  await assertFails(updateDoc(doc(alice, ...path), { amount: 900 }))
  await assertFails(deleteDoc(doc(alice, ...path)))
})

test('Gate 2: titular lê fatura legada, mas não altera documento histórico', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'alice', 'invoiceEvents', 'old-payment'), {
      type: 'payment',
      cardId: 'legacy-card',
      invoiceMonth: '2025-12',
      invoiceKey: 'legacy-card:2025-12',
      amount: 100,
    })
  })
  const ref = doc(alice, 'users', 'alice', 'invoiceEvents', 'old-payment')
  assert.equal((await assertSucceeds(getDoc(ref))).data().amount, 100)
  await assertFails(updateDoc(ref, { amount: 300 }))
})

test('Gate 2: novas transações exigem amount numérico, sem bloquear correção de legado', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const path = ['users', 'alice', 'transactions', 'synthetic-finance-record']
  await assertFails(setDoc(doc(alice, ...path), { type: 'expense', amount: '100.50' }))
  await assertFails(setDoc(doc(alice, ...path), { type: 'expense', amount: 1000000000 }))
  await assertSucceeds(setDoc(doc(alice, ...path), { type: 'expense', amount: 100.5, date: '2026-10-30' }))
  await assertFails(updateDoc(doc(alice, ...path), { amount: '200.00' }))
  await assertFails(setDoc(doc(bob, ...path), { type: 'expense', amount: 10 }))
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'alice', 'transactions', 'legacy-textual'), {
      type: 'expense', amount: '100.50', categoryId: 'old',
    })
  })
  const legacy = doc(alice, 'users', 'alice', 'transactions', 'legacy-textual')
  await assertSucceeds(updateDoc(legacy, { categoryId: 'new' }))
  await assertFails(updateDoc(legacy, { amount: '105.50' }))
  await assertSucceeds(updateDoc(legacy, { amount: 105.5 }))
})
