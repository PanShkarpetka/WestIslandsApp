import { firebaseAdminRequire, initializeMigrationApp } from './firebaseAdmin.js'

const { getFirestore, FieldValue } = firebaseAdminRequire('firebase-admin/firestore')

const APPLY = process.argv.includes('--apply')
const DEFAULT_HERO_PASSWORD = 'password'

async function commitInChunks(db, updates) {
  for (let i = 0; i < updates.length; i += 450) {
    const batch = db.batch()
    updates.slice(i, i + 450).forEach(({ ref, data }) => {
      batch.set(ref, data, { merge: true })
    })
    await batch.commit()
  }
}

async function main() {
  initializeMigrationApp()
  const db = getFirestore()

  const heroesSnap = await db.collection('heroes').get()
  const missingPasswordDocs = heroesSnap.docs.filter((docSnap) => {
    const password = docSnap.data()?.password
    return typeof password !== 'string' || !password.trim()
  })

  const updates = missingPasswordDocs.map((docSnap) => ({
    ref: docSnap.ref,
    data: {
      password: DEFAULT_HERO_PASSWORD,
      updatedAt: FieldValue.serverTimestamp(),
    },
  }))

  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    totalHeroes: heroesSnap.size,
    heroesMissingPassword: missingPasswordDocs.length,
    defaultPassword: DEFAULT_HERO_PASSWORD,
    heroIdsToUpdate: missingPasswordDocs.map((docSnap) => docSnap.id),
  }

  console.log(JSON.stringify(report, null, 2))

  if (APPLY) {
    await commitInChunks(db, updates)
    console.log('Hero password backfill applied.')
  } else {
    console.log('Dry run only. Re-run with --apply to write changes.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
