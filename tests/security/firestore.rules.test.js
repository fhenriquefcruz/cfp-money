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
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

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

test('evento de fatura com identidade de operação é imutável e isolado por UID', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const operationId = 'payment-operation-2026-11-0001'
  const path = ['users', 'alice', 'invoiceEvents', `op_${operationId}`]
  const reference = doc(alice, ...path)
  const data = {
    operationId,
    type: 'payment',
    cardId: 'card-1',
    cardName: 'Cartão',
    cardLast4: '1234',
    invoiceMonth: '2026-11',
    invoiceKey: 'card-1:2026-11',
    eventDate: '2026-11-15',
    paymentDate: '2026-11-15',
    amount: 150.25,
    sourceAccount: 'Banco',
    notes: '',
    createdAt: serverTimestamp(),
  }

  await assertSucceeds(setDoc(reference, data))
  await assertSucceeds(getDoc(reference))
  await assertFails(getDoc(doc(bob, ...path)))
  await assertFails(setDoc(doc(bob, ...path), data))
  await assertFails(updateDoc(reference, { amount: 300 }))
  await assertFails(deleteDoc(reference))
  await assertFails(
    setDoc(doc(alice, 'users', 'alice', 'invoiceEvents', 'op_unknown-field-000001'), {
      ...data,
      operationId: 'unknown-field-000001',
      extraValue: 'não permitido',
    }),
  )

  await assertFails(
    setDoc(doc(alice, 'users', 'alice', 'invoiceEvents', 'op_wrong-operation-0001'), data),
  )
  await assertFails(
    setDoc(doc(alice, 'users', 'alice', 'invoiceEvents', 'op_bad-payment-000001'), {
      ...data,
      operationId: 'bad-payment-000001',
      amount: -1,
    }),
  )

  // IDs sem prefixo não podem criar novos pagamentos e burlar a idempotência.
  const legacy = doc(alice, 'users', 'alice', 'invoiceEvents', 'legacy-event-1')
  const legacyPayload = { type: 'payment', amount: 25, eventDate: '2025-02-10' }
  await assertFails(setDoc(legacy, legacyPayload))
  await assertFails(
    setDoc(doc(alice, 'users', 'alice', 'invoiceEvents', 'legacy-forged-payment'), data),
  )

  // Registros históricos permanecem legíveis sem regravação ou migração.
  // O payload antigo não precisa obedecer ao schema moderno de criação.
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), 'users', 'alice', 'invoiceEvents', 'legacy-event-1'),
      legacyPayload,
    )
  })

  const beforeAttempt = await assertSucceeds(getDoc(legacy))
  assert.deepEqual(beforeAttempt.data(), legacyPayload)
  await assertFails(updateDoc(legacy, { notes: 'Tentativa de editar histórico' }))
  await assertFails(updateDoc(legacy, { amount: 300 }))
  await assertFails(setDoc(legacy, { ...legacyPayload, amount: 1 }))
  await assertFails(deleteDoc(legacy))
  await assertFails(getDoc(doc(bob, 'users', 'alice', 'invoiceEvents', 'legacy-event-1')))

  const afterAttempt = await assertSucceeds(getDoc(legacy))
  assert.deepEqual(afterAttempt.data(), legacyPayload)
})

test('MR-003: regras de eventos rejeitam frações de centavo e campos cruzados', async () => {
  const db = environment.authenticatedContext('alice').firestore()
  const send = (operationId, payload) =>
    setDoc(doc(db, 'users', 'alice', 'invoiceEvents', `op_${operationId}`), {
      ...payload,
      operationId,
    })

  const payment = {
    type: 'payment',
    cardId: 'card-1',
    cardName: 'Cartão',
    cardLast4: '1234',
    invoiceMonth: '2026-11',
    invoiceKey: 'card-1:2026-11',
    eventDate: '2026-11-15',
    paymentDate: '2026-11-15',
    amount: 0.01,
    sourceAccount: 'Banco',
    notes: '',
    createdAt: serverTimestamp(),
  }
  await assertSucceeds(send('schema-valid-payment-0001', payment))
  for (const [id, changes] of [
    ['fraction', { amount: 1.001 }],
    ['subcent', { amount: 0.00000001 }],
    ['negative', { amount: -1 }],
    ['text', { amount: '1.00' }],
    ['mixed-adjustment', { signedAmount: -1.5, direction: 'credit' }],
    ['mixed-reversal', { reversesEventId: 'op_not-a-payment' }],
    ['source-too-long', { sourceAccount: 'x'.repeat(121) }],
  ]) {
    await assertFails(send(`schema-invalid-payment-${id}-0001`, { ...payment, ...changes }))
  }

  const { amount, paymentDate, sourceAccount, ...common } = payment
  const adjustment = {
    ...common,
    type: 'adjustment',
    signedAmount: -0.01,
    direction: 'credit',
    notes: 'Ajuste de um centavo',
  }
  await assertSucceeds(send('schema-valid-adjustment-0001', adjustment))
  for (const [id, changes] of [
    ['fraction', { signedAmount: -1.005 }],
    ['subcent', { signedAmount: -0.00000001 }],
    ['mixed-payment', { amount: 10 }],
    ['wrong-direction', { direction: 'charge' }],
    ['empty-notes', { notes: '' }],
  ]) {
    await assertFails(send(`schema-invalid-adjustment-${id}-0001`, { ...adjustment, ...changes }))
  }

  await assertSucceeds(
    send('schema-valid-manual-close-0001', {
      ...common,
      type: 'manual_close',
    }),
  )
  await assertFails(
    send('schema-invalid-manual-close-0001', {
      ...common,
      type: 'manual_close',
      amount: 0.01,
    }),
  )
})

test('MR-003: duas intenções de estorno não conseguem reverter o mesmo pagamento', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const paymentId = 'op_original-payment-operation-0001'
  const paymentRef = doc(alice, 'users', 'alice', 'invoiceEvents', paymentId)
  const payment = {
    operationId: 'original-payment-operation-0001',
    type: 'payment',
    cardId: 'card-1',
    cardName: 'Cartão',
    cardLast4: '1234',
    invoiceMonth: '2026-11',
    invoiceKey: 'card-1:2026-11',
    eventDate: '2026-11-15',
    paymentDate: '2026-11-15',
    amount: 150.25,
    sourceAccount: 'Banco',
    notes: '',
    createdAt: serverTimestamp(),
  }
  await assertSucceeds(setDoc(paymentRef, payment))

  const lockRef = doc(alice, 'users', 'alice', 'invoiceReversalLocks', paymentId)
  const reverse = (operationId) => {
    const eventId = `op_${operationId}`
    return {
      id: eventId,
      ref: doc(alice, 'users', 'alice', 'invoiceEvents', eventId),
      data: {
        operationId,
        type: 'reversal',
        cardId: 'card-1',
        cardName: 'Cartão',
        cardLast4: '1234',
        invoiceMonth: '2026-11',
        invoiceKey: 'card-1:2026-11',
        eventDate: '2026-11-16',
        amount: 150.25,
        reversesEventId: paymentId,
        sourceAccount: 'Banco',
        notes: 'Estorno',
        createdAt: serverTimestamp(),
      },
    }
  }
  const first = reverse('reversal-operation-000001')
  const second = reverse('reversal-operation-000002')
  const lock = (item) => ({
    paymentId,
    reversalEventId: item.id,
    invoiceKey: item.data.invoiceKey,
    amountCents: 15025,
    createdAt: serverTimestamp(),
  })

  // Uma criação solta não é aceita, nem a gravação isolada de uma trava.
  await assertFails(setDoc(first.ref, first.data))
  await assertFails(setDoc(lockRef, lock(first)))

  await assertSucceeds(
    runTransaction(alice, async (write) => {
      const original = await write.get(paymentRef)
      const alreadyLocked = await write.get(lockRef)
      assert.equal(original.exists(), true)
      assert.equal(alreadyLocked.exists(), false)
      write.set(first.ref, first.data)
      write.set(lockRef, lock(first))
    }),
  )
  assert.equal((await getDoc(first.ref)).exists(), true)
  assert.equal((await getDoc(lockRef)).data().reversalEventId, first.id)

  await assertFails(
    runTransaction(alice, async (write) => {
      await write.get(paymentRef)
      await write.get(lockRef)
      write.set(second.ref, second.data)
      write.set(lockRef, lock(second))
    }),
  )
  assert.equal((await getDoc(second.ref)).exists(), false)
  await assertFails(updateDoc(lockRef, { amountCents: 1 }))
  await assertFails(deleteDoc(lockRef))
  await assertFails(getDoc(doc(bob, 'users', 'alice', 'invoiceReversalLocks', paymentId)))
})

test('MR-007: novas transações exigem montante numérico positivo e campos financeiros válidos', async () => {
  const db = environment.authenticatedContext('alice').firestore()
  const ref = (suffix) => doc(db, 'users', 'alice', 'transactions', suffix)
  const valid = {
    type: 'expense',
    description: 'Mercado',
    amount: 12.34,
    date: '2026-11-16',
    paymentStatus: 'pending',
    isSavings: false,
  }

  await assertSucceeds(setDoc(ref('valid'), valid))
  await assertSucceeds(
    setDoc(ref('card'), {
      ...valid,
      cardId: '',
      invoiceMonth: '2026-11',
      dueDate: '2026-11-25',
    }),
  )

  for (const [id, changes] of [
    ['text', { amount: '12.34' }],
    ['zero', { amount: 0 }],
    ['negative', { amount: -10 }],
    ['huge', { amount: 100000001 }],
    ['missing', { amount: undefined }],
    ['type', { type: 'invalid' }],
    ['date', { date: 1710000000 }],
    ['due', { dueDate: 'invalid' }],
    ['purchase', { purchaseDate: 123 }],
    ['month', { invoiceMonth: '2026-13' }],
    ['card', { cardId: { id: 'fake' } }],
    ['savings', { isSavings: 'yes' }],
    ['status', { paymentStatus: 'settled' }],
    ['uid', { uid: 'bob' }],
  ]) {
    const payload = { ...valid, ...changes }
    if (id === 'missing') delete payload.amount
    await assertFails(setDoc(ref(id), payload))
  }
})

test('MR-007: campos históricos inválidos não bloqueiam edição de descrição, mas não podem ser recriados', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const legacyRef = doc(alice, 'users', 'alice', 'transactions', 'legacy-string')

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'alice', 'transactions', 'legacy-string'), {
      type: 'expense',
      date: 'data-legada',
      amount: '15.20',
      description: 'Registro legado',
    })
  })

  await assertSucceeds(updateDoc(legacyRef, { description: 'Descrição atualizada' }))
  await assertSucceeds(updateDoc(legacyRef, { amount: 15.2, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(legacyRef, { amount: '15.20' }))
  await assertFails(updateDoc(legacyRef, { type: 'refund_invalid' }))
  await assertFails(updateDoc(legacyRef, { date: null }))
  await assertSucceeds(updateDoc(legacyRef, { date: '2026-11-16' }))

  await assertFails(
    updateDoc(doc(bob, 'users', 'alice', 'transactions', 'legacy-string'), {
      amount: 20,
    }),
  )
  await assertSucceeds(getDoc(legacyRef))
})

test('MR-007: alterações de pagamento são permitidas e escrita financeira entre UIDs é negada', async () => {
  const alice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const ref = doc(alice, 'users', 'alice', 'transactions', 'transaction-1')
  await assertSucceeds(
    updateDoc(ref, {
      paymentStatus: 'paid',
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  )
  await assertSucceeds(updateDoc(ref, { paymentStatus: 'pending', paidAt: null }))
  await assertFails(
    setDoc(doc(bob, 'users', 'alice', 'transactions', 'attempt'), {
      type: 'expense',
      amount: 20,
      date: '2026-11-16',
    }),
  )
  await assertFails(
    setDoc(doc(alice, 'users', 'alice', 'transactions', 'transaction-1', 'nested', 'bad'), {
      amount: 20,
    }),
  )
})

test('MR-008: duas sessões do mesmo UID recebem mudanças de cartões, metas e orçamentos', async () => {
  const sessionA = environment.authenticatedContext('alice').firestore()
  const sessionB = environment.authenticatedContext('alice').firestore()
  const otherUser = environment.authenticatedContext('bob').firestore()

  const waitForUpdate = (reference, expectedName) =>
    new Promise((resolve, reject) => {
      let unsubscribe = () => {}
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('Snapshot atualizado não recebido: ' + expectedName))
      }, 8000)
      unsubscribe = onSnapshot(
        reference,
        (snapshot) => {
          if (snapshot.data()?.name !== expectedName) return
          clearTimeout(timeout)
          unsubscribe()
          resolve(snapshot.data())
        },
        (error) => {
          clearTimeout(timeout)
          unsubscribe()
          reject(error)
        },
      )
    })

  for (const collectionName of ['creditCards', 'goals', 'budgets']) {
    const path = ['users', 'alice', collectionName, 'sync-test']
    const referenceA = doc(sessionA, ...path)
    const referenceB = doc(sessionB, ...path)
    const otherReference = doc(otherUser, ...path)

    await assertSucceeds(setDoc(referenceA, { name: 'Antes', amount: 25 }))
    const synced = waitForUpdate(referenceA, 'Depois')
    await assertSucceeds(updateDoc(referenceB, { name: 'Depois' }))
    assert.equal((await synced).name, 'Depois')
    await assertFails(updateDoc(otherReference, { name: 'Intruso' }))
    assert.equal((await getDoc(referenceA)).data().name, 'Depois')
  }
})
