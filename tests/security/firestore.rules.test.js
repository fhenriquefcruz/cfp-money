import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { Timestamp, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

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
