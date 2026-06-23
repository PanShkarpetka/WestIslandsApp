import { firebaseAdminRequire, initializeMigrationApp } from './firebaseAdmin.js'

const { getFirestore, FieldValue } = firebaseAdminRequire('firebase-admin/firestore')

const APPLY = process.argv.includes('--apply')

const DEFAULT_TREASURES = {
  enabled: true,
  table: [
    { id: 'diamond', name: 'Diamond', chance: 1 / 1000, valueGold: { min: 50, max: 350 } },
    { id: 'small-ruby', name: 'Small Ruby', chance: 1 / 250, valueGold: { min: 20, max: 100 } },
    { id: 'silver-ring', name: 'Silver Ring', chance: 1 / 100, valueGold: { min: 1, max: 50 } },
    { id: 'pearl', name: 'Pearl', chance: 1 / 40, valueGold: { min: 1, max: 50 } },
  ],
}

function mergeTreasureConfig(existing = {}) {
  const existingById = new Map((Array.isArray(existing.table) ? existing.table : []).map((item) => [item.id, item]))
  const table = DEFAULT_TREASURES.table.map((item) => existingById.get(item.id) || item)
  for (const item of existingById.values()) {
    if (!table.some((entry) => entry.id === item.id)) table.push(item)
  }

  return {
    enabled: existing.enabled ?? DEFAULT_TREASURES.enabled,
    table,
  }
}

async function main() {
  initializeMigrationApp()
  const db = getFirestore()
  const ref = db.collection('bot-configs').doc('fishing')
  const snap = await ref.get()
  const existing = snap.data()?.treasures || {}
  const treasures = mergeTreasureConfig(existing)

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    existing,
    next: treasures,
  }, null, 2))

  if (APPLY) {
    await ref.set({
      treasures,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    console.log('Fishing treasure config seeded.')
  } else {
    console.log('Dry run only. Re-run with --apply to write changes.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
