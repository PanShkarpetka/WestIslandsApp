import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../functions/package.json', import.meta.url))
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const APPLY = process.argv.includes('--apply')
const ISLAND_ID = 'island_rock'

function toMillis(value) {
  if (!value) return null
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function resolveFishValue(fish, effectiveRollUsed) {
  const value = fish?.fishValueSilver
  if (typeof value === 'number') return value
  if (!value || typeof value !== 'object') return 0

  const low = Number(value.low ?? 0)
  const high = Number(value.high ?? 0)
  const code = fish.fishCodeNumber
  if (effectiveRollUsed != null && code && typeof code === 'object') {
    const codeMin = Number(code.min)
    const codeMax = Number(code.max)
    const roll = Number(effectiveRollUsed)
    if (Number.isFinite(codeMin) && Number.isFinite(codeMax) && codeMax > codeMin) {
      const t = Math.max(0, Math.min(1, (roll - codeMin) / (codeMax - codeMin)))
      return low + t * (high - low)
    }
    return high
  }

  return (low + high) / 2
}

function bestFishFromLogs(logDocs) {
  const candidates = []
  for (const docSnap of logDocs) {
    const log = docSnap.data()
    const success = log.successFailureResult === true || log.successFailureResult === 'success'
    if (!success) continue
    for (const fish of (Array.isArray(log.fishSelected) ? log.fishSelected : [])) {
      candidates.push({
        fishName: fish.fishName || '?',
        fishValue: resolveFishValue(fish, log.effectiveRollUsed),
        username: log.telegramUsername || String(log.telegramUserId || 'unknown'),
        timestamp: log.timestamp || null,
      })
    }
  }
  return candidates.sort((a, b) => b.fishValue - a.fishValue || String(a.fishName).localeCompare(String(b.fishName), 'uk-UA'))[0] || null
}

function bestCrafterFromLogs(logDocs) {
  const byHero = new Map()
  for (const docSnap of logDocs) {
    const log = docSnap.data()
    const parts = docSnap.ref.path.split('/')
    const heroId = log.heroId || (parts[0] === 'heroes' ? parts[1] : '') || log.createdBy || 'unknown'
    const entry = byHero.get(heroId) || {
      heroId,
      heroName: log.heroName || log.createdBy || heroId,
      totalValue: 0,
      totalItems: 0,
      actions: 0,
    }
    entry.totalValue += Number(log.totalComponentPriceAtTime ?? 0)
    entry.totalItems += Number(log.amountCrafted ?? 0)
    entry.actions += 1
    byHero.set(heroId, entry)
  }

  return [...byHero.values()].sort((a, b) =>
    b.totalValue - a.totalValue || b.totalItems - a.totalItems || String(a.heroName).localeCompare(String(b.heroName), 'uk-UA'),
  )[0] || null
}

async function getCyclePopulation(db, cycleId) {
  const requestSnap = await db.collection('spell-requests').where('cycleId', '==', cycleId).limit(1).get()
  const fromRequest = requestSnap.docs[0]?.data()?.population
  if (Number.isFinite(Number(fromRequest))) return Number(fromRequest)

  const cycleSnap = await db.collection('cycles').doc(cycleId).get()
  const fromCycle = cycleSnap.data()?.populationAtStart
  return Number.isFinite(Number(fromCycle)) ? Number(fromCycle) : null
}

async function commitInChunks(db, updates) {
  for (let i = 0; i < updates.length; i += 450) {
    const batch = db.batch()
    updates.slice(i, i + 450).forEach(({ ref, data, options }) => {
      batch.set(ref, data, options || { merge: true })
    })
    await batch.commit()
  }
}

async function main() {
  const serviceAccount = JSON.parse(readFileSync(new URL('../functions/service-account.json', import.meta.url), 'utf8'))
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  const cyclesSnap = await db.collection('cycles').orderBy('createdAt', 'desc').limit(8).get()
  const cycles = cyclesSnap.docs.map((docSnap) => ({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() }))
  const currentCycle = cycles.find((cycle) => cycle.startedAt && !cycle.finishedAt)
  const lastFinishedCycle = cycles.find((cycle) => cycle.startedAt && cycle.finishedAt)
  if (!lastFinishedCycle) throw new Error('No finished cycle found.')

  const startMs = toMillis(lastFinishedCycle.createdAt)
  const endMs = toMillis(currentCycle?.createdAt)
  if (startMs === null || endMs === null) throw new Error('Cannot resolve cycle timestamp window.')

  const [populationBefore, populationAfter] = await Promise.all([
    getCyclePopulation(db, lastFinishedCycle.id),
    currentCycle ? getCyclePopulation(db, currentCycle.id) : null,
  ])

  const craftSnap = await db.collectionGroup('crafting-logs').get()
  const craftLogsInWindow = craftSnap.docs.filter((docSnap) => {
    const data = docSnap.data()
    const t = toMillis(data.createdAt)
    return t !== null && t >= startMs && t < endMs
  })
  const craftLogsToUpdate = craftLogsInWindow.filter((docSnap) => !docSnap.data().cycleId)

  const heroIds = [...new Set(craftLogsInWindow.map((docSnap) => docSnap.ref.path.split('/')[1]).filter(Boolean))]
  const heroNames = new Map()
  await Promise.all(heroIds.map(async (heroId) => {
    const heroSnap = await db.collection('heroes').doc(heroId).get()
    const data = heroSnap.data() || {}
    heroNames.set(heroId, data.name || data.heroName || data.nickname || heroId)
  }))

  const fishingSnap = await db.collection('fishing-logs')
    .where('timestamp', '>=', new Date(startMs).toISOString())
    .where('timestamp', '<', new Date(endMs).toISOString())
    .get()
  const fishingLogs = fishingSnap.docs.filter((docSnap) => !docSnap.data().cycleId)

  const islandSnap = await db.collection('islands').doc(ISLAND_ID).get()
  const buildings = Object.entries(islandSnap.data()?.buildings || {})
  const buildingsForCycle = buildings.filter(([, entry]) => {
    const builtAtMs = toMillis(entry?.builtAt)
    return entry?.built && !entry.builtCycleId && builtAtMs !== null && builtAtMs >= startMs && builtAtMs < endMs
  })

  const bestCrafter = bestCrafterFromLogs(craftLogsInWindow)
  if (bestCrafter && heroNames.has(bestCrafter.heroId)) {
    bestCrafter.heroName = heroNames.get(bestCrafter.heroId)
  }

  const summary = {
    cycleId: lastFinishedCycle.id,
    cycleStartedAt: lastFinishedCycle.startedAt || '',
    cycleFinishedAt: lastFinishedCycle.finishedAt || '',
    populationBefore,
    populationAfter,
    populationDelta: Number.isFinite(populationBefore) && Number.isFinite(populationAfter)
      ? populationAfter - populationBefore
      : null,
    bestFish: bestFishFromLogs(fishingSnap.docs),
    bestCrafter,
    updatedAt: FieldValue.serverTimestamp(),
    migratedAt: FieldValue.serverTimestamp(),
    migrationSource: 'migrations/backfillDashboardCycleData.js',
  }

  const updates = [
    { ref: db.collection('cycle-summaries').doc(lastFinishedCycle.id), data: summary, options: { merge: true } },
  ]

  if (populationBefore !== null && lastFinishedCycle.populationAtStart == null) {
    updates.push({ ref: lastFinishedCycle.ref, data: { populationAtStart: populationBefore }, options: { merge: true } })
  }
  if (currentCycle && populationAfter !== null && currentCycle.populationAtStart == null) {
    updates.push({ ref: currentCycle.ref, data: { populationAtStart: populationAfter }, options: { merge: true } })
  }

  craftLogsToUpdate.forEach((docSnap) => {
    const heroId = docSnap.ref.path.split('/')[1]
    updates.push({
      ref: docSnap.ref,
      data: {
        cycleId: lastFinishedCycle.id,
        cycleStartedAt: lastFinishedCycle.startedAt || '',
        cycleFinishedAt: lastFinishedCycle.finishedAt || '',
        heroId,
        heroName: heroNames.get(heroId) || heroId,
      },
      options: { merge: true },
    })
  })

  craftLogsInWindow.forEach((docSnap) => {
    const data = docSnap.data()
    const heroId = data.heroId || docSnap.ref.path.split('/')[1]
    updates.push({
      ref: db.collection('cycle-crafting-logs').doc(`${heroId}_${docSnap.id}`),
      data: {
        ...data,
        id: data.id || docSnap.id,
        heroId,
        heroName: heroNames.get(heroId) || data.heroName || data.createdBy || heroId,
        cycleId: lastFinishedCycle.id,
        cycleStartedAt: lastFinishedCycle.startedAt || '',
        cycleFinishedAt: lastFinishedCycle.finishedAt || '',
        sourcePath: docSnap.ref.path,
      },
      options: { merge: true },
    })
  })

  fishingLogs.forEach((docSnap) => {
    updates.push({
      ref: docSnap.ref,
      data: {
        cycleId: lastFinishedCycle.id,
        cycleStartedAt: lastFinishedCycle.startedAt || '',
        cycleFinishedAt: lastFinishedCycle.finishedAt || '',
      },
      options: { merge: true },
    })
  })

  buildingsForCycle.forEach(([key]) => {
    updates.push({
      ref: db.collection('islands').doc(ISLAND_ID),
      data: { [`buildings.${key}.builtCycleId`]: lastFinishedCycle.id },
      options: { merge: true },
    })
  })

  const report = {
    mode: APPLY ? 'apply' : 'dry-run',
    currentCycle: currentCycle?.id || null,
    lastFinishedCycle: lastFinishedCycle.id,
    window: {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    },
    population: {
      before: populationBefore,
      after: populationAfter,
      delta: summary.populationDelta,
    },
    craftLogsToUpdate: craftLogsToUpdate.length,
    cycleCraftingMirrorWrites: craftLogsInWindow.length,
    fishingLogsToUpdate: fishingLogs.length,
    buildingsToUpdate: buildingsForCycle.map(([key]) => key),
    bestCrafter: summary.bestCrafter,
    bestFish: summary.bestFish,
    writes: updates.length,
  }

  console.log(JSON.stringify(report, null, 2))

  if (APPLY) {
    await commitInChunks(db, updates)
    console.log('Migration applied.')
  } else {
    console.log('Dry run only. Re-run with --apply to write changes.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
