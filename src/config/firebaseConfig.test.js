import {
  buildFirebaseConfig,
  resolveFirebaseConfig,
  validateFirebaseConfig,
} from './firebaseConfig'

const validEnv = {
  VITE_FIREBASE_API_KEY: 'AIza-real-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'cfp-money.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'cfp-money',
  VITE_FIREBASE_STORAGE_BUCKET: 'cfp-money.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '473890737703',
  VITE_FIREBASE_APP_ID: '1:473890737703:web:abc123',
  MODE: 'production',
}

test('monta a configuração Firebase a partir do ambiente', () => {
  expect(buildFirebaseConfig(validEnv)).toEqual({
    apiKey: 'AIza-real-key',
    authDomain: 'cfp-money.firebaseapp.com',
    projectId: 'cfp-money',
    storageBucket: 'cfp-money.firebasestorage.app',
    messagingSenderId: '473890737703',
    appId: '1:473890737703:web:abc123',
  })
})

test('detecta campos ausentes e placeholders', () => {
  const issues = validateFirebaseConfig(
    buildFirebaseConfig({
      VITE_FIREBASE_AUTH_DOMAIN: 'seu-projeto.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'your_project_id',
    }),
  )

  expect(issues.map((issue) => issue.envKey)).toContain(
    'VITE_FIREBASE_AUTH_DOMAIN',
  )
  expect(issues.map((issue) => issue.envKey)).toContain(
    'VITE_FIREBASE_PROJECT_ID',
  )
})

test('rejeita configuração inválida fora dos testes', () => {
  expect(() =>
    resolveFirebaseConfig({
      MODE: 'production',
      VITE_FIREBASE_PROJECT_ID: 'seu-projeto',
    }),
  ).toThrow(/Configuração Firebase inválida/)
})

test('usa configuração neutra no ambiente de testes', () => {
  expect(resolveFirebaseConfig({ MODE: 'test' })).toMatchObject({
    projectId: 'test-project',
    authDomain: 'test-project.firebaseapp.com',
  })
})
