import admin from 'firebase-admin'
import { readFileSync } from 'node:fs'

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8'),
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const email = 'fhenriquefcruz@gmail.com'

const user = await admin.auth().getUserByEmail(email)

await admin.auth().setCustomUserClaims(user.uid, {
  ...user.customClaims,
  admin: true,
})

console.log(`Admin concedido para ${email}`)
