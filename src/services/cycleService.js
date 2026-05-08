import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { diffInDays, formatFaerunDate, normalizeFaerunDate, parseFaerunDate } from '../utils/faerun-date.js'
import { db } from './firebase.js'
import { formatAmount } from '../utils/formatters.js'
import { normalizeAmount } from '../utils/numbers.js'
import { BUILDING_LEVEL_BONUSES } from '../config/religion.js'
import { DEFAULT_ISLAND_ID } from '../config/constants.js'
import { generateSpellRequestsForCycle, settlePreviousSpellRequests } from './mageGuildService.js'

function normalizeIncomeDestination(value) {
  if (typeof value !== 'string') return 'treasury'
  if (value === 'treasury') return 'treasury'
  if (value.startsWith('guild:') && value.length > 'guild:'.length) return value
  return 'treasury'
}

function formatCycleLabel(startedAt, finishedAt) {
  if (startedAt && finishedAt) return `${startedAt} — ${finishedAt}`
  if (startedAt) return `з ${startedAt}`
  return 'без дат'
}

function getBuildingFaithIncome(level) {
  return BUILDING_LEVEL_BONUSES[level]?.passiveFaith || 0
}

export async function resetReligionsSvTemp({
  collection: collectionFn = collection,
  getDocs: getDocsFn = getDocs,
  writeBatch: writeBatchFn = writeBatch,
  db: firestoreDb = db,
} = {}) {
  const religionsRef = collectionFn(firestoreDb, 'religions')
  const religionsSnapshot = await getDocsFn(religionsRef)
  if (religionsSnapshot.empty) return

  const batch = writeBatchFn(firestoreDb)
  religionsSnapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { svTemp: 0 })
  })
  await batch.commit()
}

export async function loadManufacturesByIds(ids, {
  collection: collectionFn = collection,
  getDocs: getDocsFn = getDocs,
  query: queryFn = query,
  where: whereFn = where,
  documentId: documentIdFn = documentId,
  db: firestoreDb = db,
} = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return []

  const chunks = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  const results = []
  for (const chunk of chunks) {
    const q = queryFn(collectionFn(firestoreDb, 'manufactures'), whereFn(documentIdFn(), 'in', chunk))
    const snapshot = await getDocsFn(q)
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {}
      results.push({
        id: docSnap.id,
        name: (data.name || '').trim(),
        description: (data.description || '').trim(),
        income: normalizeAmount(data.income || 0),
        incomeDestination: normalizeIncomeDestination(data.incomeDestination),
      })
    })
  }

  const order = new Map(ids.map((id, index) => [id, index]))
  results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return results
}

export async function distributeManufactureIncome(cycleId, startedAt, finishedAt, islandId, populationItems, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  getDoc: getDocFn = getDoc,
  getDocs: getDocsFn = getDocs,
  query: queryFn = query,
  where: whereFn = where,
  documentId: documentIdFn = documentId,
  runTransaction: runTransactionFn = runTransaction,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
} = {}) {
  const islandSnap = await getDocFn(docFn(firestoreDb, 'islands', islandId || DEFAULT_ISLAND_ID))
  if (!islandSnap.exists()) return

  const manufactureIds = Array.isArray(islandSnap.data()?.manufactures) ? islandSnap.data().manufactures : []
  const loadDeps = { collection: collectionFn, getDocs: getDocsFn, query: queryFn, where: whereFn, documentId: documentIdFn, db: firestoreDb }
  const entries = (await loadManufacturesByIds(manufactureIds, loadDeps)).filter((item) => item.income !== 0)
  const populationEntries = (populationItems || [])
    .map((group) => {
      const count = Number(group.count ?? 0)
      const incomePerPerson = normalizeAmount(group.incomePerPerson ?? 0)
      return {
        id: group.id,
        name: group.name || 'Невідома група',
        description: group.description || '',
        income: normalizeAmount(incomePerPerson * count),
        incomePerPerson,
        count,
        type: 'population',
      }
    })
    .filter((item) => item.income !== 0)

  const combinedEntries = [...entries.map((item) => ({ ...item, type: 'manufacture' })), ...populationEntries]
  if (!combinedEntries.length) return

  const metaRef = docFn(firestoreDb, 'treasury/meta')
  const txCol = collectionFn(firestoreDb, 'treasury-transactions')
  const cycleLabel = formatCycleLabel(startedAt, finishedAt)
  const treasuryEntries = combinedEntries.filter((item) => item.type !== 'manufacture' || !item.incomeDestination?.startsWith('guild:'))
  const totalIncome = treasuryEntries.reduce((sum, item) => (item.income > 0 ? sum + item.income : sum), 0)
  const totalOutcome = treasuryEntries.reduce((sum, item) => (item.income < 0 ? sum + Math.abs(item.income) : sum), 0)

  await runTransactionFn(firestoreDb, async (transaction) => {
    const metaSnap = await transaction.get(metaRef)
    let currentBalance = metaSnap.exists() ? metaSnap.data()?.balance || 0 : 0
    const guildBalances = new Map()
    const guildIds = [...new Set(combinedEntries.filter((item) => item.type === 'manufacture' && item.incomeDestination?.startsWith('guild:')).map((item) => item.incomeDestination.slice('guild:'.length)).filter(Boolean))]

    await Promise.all(guildIds.map(async (guildId) => {
      const guildRef = docFn(firestoreDb, 'guilds', guildId)
      const guildSnap = await transaction.get(guildRef)
      guildBalances.set(guildId, Number(guildSnap.exists() ? guildSnap.data()?.treasure || 0 : 0))
    }))

    for (const item of combinedEntries) {
      const isGuildDestination = item.type === 'manufacture' && item.incomeDestination?.startsWith('guild:')
      const guildId = isGuildDestination ? item.incomeDestination.slice('guild:'.length) : null

      if (isGuildDestination && guildId) {
        const guildRef = docFn(firestoreDb, 'guilds', guildId)
        const guildLogsRef = collectionFn(firestoreDb, 'guilds', guildId, 'logs')
        const guildCurrent = Number(guildBalances.get(guildId) || 0)
        const guildNext = normalizeAmount(guildCurrent + item.income)
        guildBalances.set(guildId, guildNext)
        transaction.set(guildRef, { treasure: guildNext, updatedAt: serverTimestampFn() }, { merge: true })
        transaction.set(docFn(guildLogsRef), {
          amount: item.income,
          type: item.income >= 0 ? 'deposit' : 'withdraw',
          comment: `Автооперація з мануфактури "${item.name || 'Без назви'}" за цикл ${cycleLabel}.`.slice(0, 500),
          userNickname: 'Система',
          createdAt: serverTimestampFn(),
          treasureAfter: guildNext,
        })
        continue
      }

      currentBalance += item.income
      const label = item.income >= 0 ? 'Дохід' : 'Витрати'
      const commentParts = item.type === 'population'
        ? [`${label} населення групи "${item.name}"`, `(${item.count} осіб × ${formatAmount(item.incomePerPerson)} 🪙)`]
        : [`${label} мануфактури "${item.name || 'Без назви'}"`]
      if (item.type === 'manufacture' && item.description) commentParts.push(item.description)
      commentParts.push(`за цикл ${cycleLabel}.`)

      transaction.set(docFn(txCol), {
        amount: item.income,
        type: item.income >= 0 ? 'deposit' : 'withdraw',
        comment: commentParts.join(' ').slice(0, 500),
        userId: 'system',
        nickname: 'Система',
        createdAt: serverTimestampFn(),
        balanceAfter: currentBalance,
        cycleId,
        cycleStartedAt: startedAt,
        cycleFinishedAt: finishedAt || null,
      })
    }

    transaction.set(metaRef, {
      balance: currentBalance,
      totalIncome: normalizeAmount(totalIncome),
      totalOutcome: normalizeAmount(totalOutcome),
      updatedAt: serverTimestampFn(),
    }, { merge: true })
  })
}

export async function distributeBuildingFaithIncome(cycleId, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  getDoc: getDocFn = getDoc,
  getDocs: getDocsFn = getDocs,
  query: queryFn = query,
  where: whereFn = where,
  addDoc: addDocFn = addDoc,
  updateDoc: updateDocFn = updateDoc,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
  rng = Math.random,
} = {}) {
  const religionsSnapshot = await getDocsFn(collectionFn(firestoreDb, 'religions'))
  const religionsWithIncome = religionsSnapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() || {}
      const buildingLevel = data.buildingLevel || 'none'
      return { id: docSnap.id, name: data.name || 'Невідома релігія', ref: docSnap.ref, buildingLevel, passiveFaith: getBuildingFaithIncome(buildingLevel) }
    })
    .filter((religion) => religion.passiveFaith > 0)

  for (const religion of religionsWithIncome) {
    const clergySnapshot = await getDocsFn(queryFn(collectionFn(firestoreDb, 'clergy'), whereFn('religion', '==', religion.ref)))
    if (clergySnapshot.empty) continue
    const eligibilityChecks = await Promise.all(clergySnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data() || {}
      const heroRef = data.hero
      if (!heroRef) return { docSnap, eligible: true }

      try {
        const heroSnap = await getDocFn(heroRef)
        const heroData = heroSnap.exists() ? heroSnap.data() || {} : {}
        return { docSnap, eligible: heroData.passiveOVInactive !== true }
      } catch (error) {
        console.error('[cycle] Failed to load hero for passive faith distribution', error)
        return { docSnap, eligible: true }
      }
    }))
    const eligible = eligibilityChecks.filter((entry) => entry.eligible).map((entry) => entry.docSnap)
    const heroCount = eligible.length
    if (!heroCount) continue
    const baseShare = Math.floor(religion.passiveFaith / heroCount)
    const remainder = religion.passiveFaith - baseShare * heroCount
    const remainderIndex = remainder > 0 ? Math.floor(rng() * heroCount) : -1

    await Promise.all(eligible.map(async (docSnap, index) => {
      const bonus = baseShare + (index === remainderIndex ? remainder : 0)
      if (!bonus) return
      const data = docSnap.data() || {}
      const newFaith = Number(data.faith ?? 0) + bonus
      const updates = { faith: newFaith }
      if (Number(data.faithMax ?? 0) < newFaith) updates.faithMax = newFaith
      await updateDocFn(docSnap.ref, updates)
      await addDocFn(collectionFn(docSnap.ref, 'logs'), {
        delta: bonus,
        message: `Пасивний дохід від споруди (${religion.buildingLevel}) за цикл ${cycleId}.`,
        user: 'Система',
        cycleId,
        religionId: religion.id,
        religionName: religion.name,
        createdAt: serverTimestampFn(),
      })
    }))
  }
}

export async function createNewCycleWithEffects({
  startedDate,
  notes = '',
  islandId = DEFAULT_ISLAND_ID,
  population = 0,
  populationItems = [],
}, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  getDoc: getDocFn = getDoc,
  getDocs: getDocsFn = getDocs,
  addDoc: addDocFn = addDoc,
  updateDoc: updateDocFn = updateDoc,
  query: queryFn = query,
  where: whereFn = where,
  orderBy: orderByFn = orderBy,
  limit: limitFn = limit,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
  rng = Math.random,
  settlePreviousSpellRequestsFn = settlePreviousSpellRequests,
  generateSpellRequestsForCycleFn = generateSpellRequestsForCycle,
} = {}) {
  const parsed = typeof startedDate === 'string' ? parseFaerunDate(startedDate) : startedDate
  const normalizedStart = parsed ? normalizeFaerunDate(parsed) : null
  if (!normalizedStart) throw new Error('INVALID_START_DATE')

  const sharedDeps = { collection: collectionFn, doc: docFn, getDoc: getDocFn, getDocs: getDocsFn, addDoc: addDocFn, updateDoc: updateDocFn, query: queryFn, where: whereFn, serverTimestamp: serverTimestampFn, db: firestoreDb, rng }

  const cyclesRef = collectionFn(firestoreDb, 'cycles')
  const lastCycleSnapshot = await getDocsFn(queryFn(cyclesRef, orderByFn('createdAt', 'desc'), limitFn(1)))
  const lastCycleDoc = lastCycleSnapshot.docs[0]
  const startedAt = formatFaerunDate(normalizedStart)
  const cycleDoc = await addDocFn(cyclesRef, { startedAt, createdAt: serverTimestampFn() })

  if (lastCycleDoc && !lastCycleDoc.data().finishedAt) {
    const previousCycle = lastCycleDoc.data()
    const parsedPreviousStart = parseFaerunDate(previousCycle.startedAt)
    const previousDuration = parsedPreviousStart ? diffInDays(parsedPreviousStart, normalizedStart) : null
    const previousFinishedDate = {
      day: normalizedStart.day === 1 ? 30 : normalizedStart.day - 1,
      month: normalizedStart.day === 1 ? (normalizedStart.month === 0 ? 11 : normalizedStart.month - 1) : normalizedStart.month,
      year: normalizedStart.day === 1 && normalizedStart.month === 0 ? normalizedStart.year - 1 : normalizedStart.year,
    }
    const previousUpdate = { finishedAt: formatFaerunDate(previousFinishedDate) }
    if (previousDuration && previousDuration > 0) previousUpdate.duration = previousDuration
    await updateDocFn(lastCycleDoc.ref, previousUpdate)
  }

  await resetReligionsSvTemp(sharedDeps)
  await addDocFn(collectionFn(firestoreDb, 'religion-actions'), {
    actionType: docFn(firestoreDb, 'religion-action-types', 'cycleStart'),
    cycleId: cycleDoc.id,
    notes: notes?.trim() || '',
    createdAt: serverTimestampFn(),
    convertedFollowers: 0,
    result: 0,
  })
  await distributeBuildingFaithIncome(cycleDoc.id, sharedDeps)
  await distributeManufactureIncome(cycleDoc.id, startedAt, null, islandId, populationItems, sharedDeps)
  await settlePreviousSpellRequestsFn()
  await generateSpellRequestsForCycleFn({
    cycleRef: cycleDoc,
    cycleId: cycleDoc.id,
    islandId,
    population,
    cycleStartedAt: startedAt,
    cycleFinishedAt: '',
  })

  return { id: cycleDoc.id, startedAt }
}
