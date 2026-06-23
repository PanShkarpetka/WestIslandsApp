import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

export const firebaseAdminRequire = createRequire(new URL('../functions/package.json', import.meta.url))

const { applicationDefault, cert, getApps, initializeApp } = firebaseAdminRequire('firebase-admin/app')
const LOCAL_CONFIG_URL = new URL('./firebaseAdmin.local.json', import.meta.url)

function readLocalCredentialsPath() {
  try {
    const config = JSON.parse(readFileSync(LOCAL_CONFIG_URL, 'utf8'))
    return String(config.googleApplicationCredentials || '').trim()
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
  }
}

function getCredential() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (inlineJson) {
    return cert(JSON.parse(inlineJson))
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || readLocalCredentialsPath()
  if (credentialsPath) {
    return cert(JSON.parse(readFileSync(credentialsPath, 'utf8')))
  }

  return applicationDefault()
}

export function initializeMigrationApp() {
  if (getApps().length) return
  initializeApp({ credential: getCredential() })
}
