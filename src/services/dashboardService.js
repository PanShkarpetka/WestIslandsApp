import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { DEFAULT_ISLAND_ID } from '../config/constants.js'
import { resolveFishValue } from '../utils/fishingUtils.js'

function toMillis(value) {
  if (!value) return null
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeCycle(docSnap) {
  const data = docSnap.data?.() || docSnap || {}
  return { id: docSnap.id || data.id || '', ...data }
}

export function selectDashboardCycles(cycles = []) {
  const ordered = [...cycles].sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0))
  return {
    currentCycle: ordered.find((cycle) => cycle.startedAt && !cycle.finishedAt) || null,
    lastFinishedCycle: ordered.find((cycle) => cycle.startedAt && cycle.finishedAt) || null,
  }
}

export function getDamagedShips(ships = []) {
  return ships
    .filter((ship) => (ship.visibility ?? ship.visible) === true)
    .map((ship) => {
      const hp = Number(ship.hp ?? ship.currentHP ?? 0)
      const hpMax = Number(ship.hpMax ?? ship.maxHP ?? 0)
      const missingHp = Math.max(0, hpMax - hp)
      const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hp / hpMax) * 100))) : 100
      return { ...ship, hp, hpMax, missingHp, hpPercent }
    })
    .filter((ship) => ship.hpMax > 0 && ship.hp < ship.hpMax)
    .sort((a, b) => a.hpPercent - b.hpPercent || b.missingHp - a.missingHp || String(a.name || '').localeCompare(String(b.name || ''), 'uk-UA'))
}

export function summarizeTreasuryTransactions(transactions = []) {
  const income = transactions.reduce((sum, tx) => Number(tx.amount ?? 0) > 0 ? sum + Number(tx.amount ?? 0) : sum, 0)
  const expenses = transactions.reduce((sum, tx) => Number(tx.amount ?? 0) < 0 ? sum + Math.abs(Number(tx.amount ?? 0)) : sum, 0)
  return { income, expenses, net: income - expenses, count: transactions.length }
}

export function selectBestMageRequest(requestDocuments = []) {
  const fulfilled = requestDocuments.flatMap((docItem) =>
    (Array.isArray(docItem.requests) ? docItem.requests : [])
      .filter((request) => request.fulfilled)
      .map((request) => ({
        ...request,
        spellRequestId: docItem.id,
        cycleId: docItem.cycleId,
        cycleLabel: docItem.cycleLabel,
      })),
  )

  return fulfilled.sort((a, b) =>
    Number(b.compensation ?? 0) - Number(a.compensation ?? 0)
    || Number(b.downtimeDays ?? 0) - Number(a.downtimeDays ?? 0)
    || String(a.spellName || '').localeCompare(String(b.spellName || ''), 'uk-UA'),
  )[0] || null
}

function getFaithSpendValue(action = {}) {
  const candidates = [
    action.faithInvested,
    action.invested,
    action.faithSpent,
    action.faithCost,
    action.faithPenalty,
    action.cost,
  ]
  return Math.max(0, ...candidates.map((value) => Number(value ?? 0)).filter(Number.isFinite))
}

export function selectLargestFaithSpend(actions = []) {
  return actions
    .map((action) => ({ ...action, faithSpent: getFaithSpendValue(action) }))
    .filter((action) => action.faithSpent > 0)
    .sort((a, b) => b.faithSpent - a.faithSpent || String(a.id || '').localeCompare(String(b.id || '')))[0] || null
}

export function aggregateBestCrafter(logs = []) {
  const byHero = new Map()
  for (const log of logs) {
    const heroId = log.heroId || log.heroRefPath || log.createdBy || 'unknown'
    const entry = byHero.get(heroId) || {
      heroId,
      heroName: log.heroName || log.createdBy || 'Невідомий майстер',
      totalValue: 0,
      totalItems: 0,
      actions: 0,
    }
    entry.heroName = log.heroName || entry.heroName
    entry.totalValue += Number(log.totalComponentPriceAtTime ?? 0)
    entry.totalItems += Number(log.amountCrafted ?? 0)
    entry.actions += 1
    byHero.set(heroId, entry)
  }

  return [...byHero.values()].sort((a, b) =>
    b.totalValue - a.totalValue || b.totalItems - a.totalItems || a.heroName.localeCompare(b.heroName, 'uk-UA'),
  )[0] || null
}

export function getBuildingsAdded(buildings = {}, definitionsById = new Map(), cycleId = '') {
  return Object.entries(buildings)
    .filter(([, entry]) => entry?.built && entry.builtCycleId === cycleId)
    .map(([key, entry]) => ({
      key,
      name: entry.name || definitionsById.get(key)?.name || key,
      builtAt: entry.builtAt || null,
      ...entry,
    }))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'uk-UA'))
}

export function selectBestFishCatch(logs = [], { startAt = null, endAt = null } = {}) {
  const startMs = toMillis(startAt)
  const endMs = toMillis(endAt)
  const candidates = []

  for (const log of logs) {
    const timestampMs = toMillis(log.timestamp)
    if (startMs !== null && timestampMs !== null && timestampMs < startMs) continue
    if (endMs !== null && timestampMs !== null && timestampMs >= endMs) continue
    const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true
    if (!isSuccess) continue

    for (const fish of (Array.isArray(log.fishSelected) ? log.fishSelected : [])) {
      candidates.push({
        fishName: fish.fishName || '?',
        fishValue: resolveFishValue(fish, log.effectiveRollUsed),
        username: log.telegramUsername || String(log.telegramUserId || 'unknown'),
        timestamp: log.timestamp,
      })
    }
  }

  return candidates.sort((a, b) => b.fishValue - a.fishValue || String(a.fishName).localeCompare(String(b.fishName), 'uk-UA'))[0] || null
}

export function normalizePopulationSummary(summary = null) {
  if (!summary) return null
  const before = Number(summary.populationBefore)
  const after = Number(summary.populationAfter)
  const delta = Number(summary.populationDelta)
  return {
    ...summary,
    populationBefore: Number.isFinite(before) ? before : null,
    populationAfter: Number.isFinite(after) ? after : null,
    populationDelta: Number.isFinite(delta) ? delta : null,
  }
}

async function fetchCollectionByCycle(collectionName, cycleId) {
  const snap = await getDocs(query(collection(db, collectionName), where('cycleId', '==', cycleId)))
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

async function fetchCollectionByCycleSafe(collectionName, cycleId) {
  try {
    return await fetchCollectionByCycle(collectionName, cycleId)
  } catch (error) {
    console.warn(`[dashboard] Failed to load ${collectionName} by cycle`, error)
    return []
  }
}

export async function fetchDashboardData({ islandId = DEFAULT_ISLAND_ID } = {}) {
  const cyclesSnap = await getDocs(query(collection(db, 'cycles'), orderBy('createdAt', 'desc'), limit(12)))
  const cycles = cyclesSnap.docs.map(normalizeCycle)
  const { currentCycle, lastFinishedCycle } = selectDashboardCycles(cycles)

  const [shipsSnap, islandSnap, buildingsSnap] = await Promise.all([
    getDocs(collection(db, 'ships')),
    getDoc(doc(db, 'islands', islandId)),
    getDocs(collection(db, 'buildings')),
  ])

  const ships = shipsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  const island = islandSnap.exists() ? { id: islandSnap.id, ...islandSnap.data() } : { buildings: {} }
  const definitionsById = new Map(buildingsSnap.docs.map((docSnap) => [docSnap.id, { id: docSnap.id, ...docSnap.data() }]))

  const emptyLastCycle = {
    treasury: summarizeTreasuryTransactions([]),
    population: null,
    buildingsAdded: [],
    bestFish: null,
    bestCrafter: null,
    bestMageRequest: null,
    largestFaithSpend: null,
  }

  if (!lastFinishedCycle) {
    return { currentCycle, lastFinishedCycle, damagedShips: getDamagedShips(ships), lastCycle: emptyLastCycle }
  }

  const [treasuryTx, spellRequests, religionActions, populationSummarySnap, craftingLogs, fishingLogsByCycle] = await Promise.all([
    fetchCollectionByCycleSafe('treasury-transactions', lastFinishedCycle.id),
    fetchCollectionByCycleSafe('spell-requests', lastFinishedCycle.id),
    fetchCollectionByCycleSafe('religion-actions', lastFinishedCycle.id),
    getDoc(doc(db, 'cycle-summaries', lastFinishedCycle.id)),
    fetchCollectionByCycleSafe('cycle-crafting-logs', lastFinishedCycle.id),
    fetchCollectionByCycleSafe('fishing-logs', lastFinishedCycle.id),
  ])

  const populationSummary = populationSummarySnap.exists() ? populationSummarySnap.data() : null
  let fishingLogs = fishingLogsByCycle
  if (!fishingLogs.length && !populationSummary?.bestFish) {
    const fishingLogsFallbackSnap = await getDocs(query(collection(db, 'fishing-logs'), orderBy('timestamp', 'desc'), limit(1500)))
    fishingLogs = fishingLogsFallbackSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  }
  const currentCycleStart = currentCycle?.createdAt || null
  const bestCrafter = aggregateBestCrafter(craftingLogs) || populationSummary?.bestCrafter || null
  const bestFish = selectBestFishCatch(fishingLogs, fishingLogsByCycle.length ? {} : { startAt: lastFinishedCycle.createdAt, endAt: currentCycleStart })
    || populationSummary?.bestFish
    || null

  return {
    currentCycle,
    lastFinishedCycle,
    damagedShips: getDamagedShips(ships),
    lastCycle: {
      treasury: summarizeTreasuryTransactions(treasuryTx),
      population: normalizePopulationSummary(populationSummary),
      buildingsAdded: getBuildingsAdded(island.buildings || {}, definitionsById, lastFinishedCycle.id),
      bestFish,
      bestCrafter,
      bestMageRequest: selectBestMageRequest(spellRequests),
      largestFaithSpend: selectLargestFaithSpend(religionActions),
    },
  }
}
