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
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { DEFAULT_YEAR, diffInDays, formatFaerunDate, normalizeFaerunDate, parseFaerunDate } from '../utils/faerun-date.js'
import { generateCycleWeatherForecast } from '../utils/faerun-weather.js'
import { rollDice } from '../utils/dice.js'
import { db } from './firebase.js'
import { formatAmount } from '../utils/formatters.js'
import { normalizeAmount } from '../utils/numbers.js'
import { BUILDING_LEVEL_BONUSES } from '../config/religion.js'
import { DEFAULT_ISLAND_ID, PSEUDO_RELIGION_ID } from '../config/constants.js'
import { generateSpellRequestsForCycle, settlePreviousSpellRequests } from './mageGuildService.js'

function normalizeIncomeDestination(value) {
  if (typeof value !== 'string') return 'treasury'
  if (value === 'treasury') return 'treasury'
  if (value.startsWith('guild:') && value.length > 'guild:'.length) return value
  if (value.startsWith('hero:') && value.length > 'hero:'.length) return value
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

function normalizeHeroIds(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))]
}

function isCoinPigPayout(payout) {
  return payout?.mechanic === 'coinPig'
}

function rollCoinPigTotal(durationDays, rng) {
  const days = Math.max(0, Math.floor(Number(durationDays) || 0))
  let total = 0
  for (let day = 0; day < days; day += 1) {
    total += Math.max(rollDice('1d4', rng) - 1, 0)
  }
  return total
}

function expandCoinPigEntry(entry, coinPigCycle, rng) {
  if (entry.mechanic !== 'coinPig') return [entry]

  const participantHeroIds = normalizeHeroIds(entry.participantHeroIds)
  const durationDays = Math.floor(Number(coinPigCycle?.durationDays) || 0)
  if (!participantHeroIds.length || durationDays <= 0) return []

  const total = rollCoinPigTotal(durationDays, rng)
  if (total <= 0) return []

  const share = normalizeAmount(total / participantHeroIds.length)
  if (share <= 0) return []

  return participantHeroIds.map((heroId, index) => ({
    ...entry,
    id: `${entry.id}:hero:${heroId}`,
    coinPigParticipantIndex: index,
    coinPigParticipantCount: participantHeroIds.length,
    coinPigDurationDays: durationDays,
    coinPigTotal: total,
    income: share,
    incomeDestination: `hero:${heroId}`,
    incomeGoods: {},
    cycleId: coinPigCycle?.cycleId || entry.cycleId || null,
    cycleStartedAt: coinPigCycle?.startedAt || entry.cycleStartedAt || null,
    cycleFinishedAt: coinPigCycle?.finishedAt || entry.cycleFinishedAt || null,
  }))
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
      const name = (data.name || '').trim()
      const description = (data.description || '').trim()

      // Expand payouts array, falling back to legacy single-field format
      const payouts = Array.isArray(data.payouts) && data.payouts.length
        ? data.payouts
        : [{ destination: data.incomeDestination, income: data.income, incomeGoods: data.incomeGoods }]

      payouts.forEach((payout, index) => {
        if (isCoinPigPayout(payout)) {
          results.push({
            id: `${docSnap.id}:${index}`,
            manufactureId: docSnap.id,
            name,
            description,
            mechanic: 'coinPig',
            participantHeroIds: normalizeHeroIds(payout.participantHeroIds),
            income: 0,
            incomeDestination: 'treasury',
            incomeGoods: {},
          })
          return
        }

        results.push({
          id: `${docSnap.id}:${index}`,
          manufactureId: docSnap.id,
          name,
          description,
          income: normalizeAmount(payout.income || 0),
          incomeDestination: normalizeIncomeDestination(payout.destination),
          incomeGoods: payout.incomeGoods && typeof payout.incomeGoods === 'object' ? payout.incomeGoods : {},
        })
      })
    })
  }

  const order = new Map(ids.map((id, index) => [id, index]))
  results.sort((a, b) => (order.get(a.manufactureId) ?? 0) - (order.get(b.manufactureId) ?? 0))
  return results
}

function applyBureaucratEffects(populationEntries, rng) {
  const bureaucratGroups = populationEntries.filter((e) => e.faction === 'bureaucrats')
  const nonBureaucratGroups = populationEntries.filter((e) => e.faction !== 'bureaucrats')

  if (!bureaucratGroups.length) return { entries: populationEntries, bureaucratStats: null }

  const bureaucratCount = bureaucratGroups.reduce((s, g) => s + g.count, 0)
  const totalNonBureaucratPop = nonBureaucratGroups.reduce((s, g) => s + g.count, 0)
  const bureaucratCapacity = bureaucratCount * 100
  const coveredCount = Math.min(bureaucratCapacity, totalNonBureaucratPop)
  const isFull = totalNonBureaucratPop > 0 && coveredCount >= totalNonBureaucratPop
  const coveredFraction = totalNonBureaucratPop > 0 ? Math.min(1, bureaucratCapacity / totalNonBureaucratPop) : 0

  const adjustedNonBureaucrats = nonBureaucratGroups.map((group) => {
    const groupCovered = Math.round(group.count * coveredFraction)
    const groupUncovered = group.count - groupCovered
    const bonusPerPerson = Math.max(Math.abs(group.incomePerPerson) * 0.20, 0.01)

    let groupBonus = 0
    if (isFull) {
      for (let i = 0; i < groupCovered; i++) {
        if (rng() < 0.20) groupBonus += bonusPerPerson
      }
    }

    let groupPenalty = 0
    for (let i = 0; i < groupUncovered; i++) {
      if (rng() < 0.20) groupPenalty += Math.abs(group.incomePerPerson)
    }

    return {
      ...group,
      income: normalizeAmount(group.income + groupBonus - groupPenalty),
      _bureaucratBonus: normalizeAmount(groupBonus),
      _bureaucratPenalty: normalizeAmount(groupPenalty),
    }
  })

  return {
    entries: [...bureaucratGroups, ...adjustedNonBureaucrats],
    bureaucratStats: { bureaucratCount, totalNonBureaucratPop, bureaucratCapacity, coveredCount, isFull },
  }
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
  rng = Math.random,
  coinPigCycle = null,
} = {}) {
  const islandSnap = await getDocFn(docFn(firestoreDb, 'islands', islandId || DEFAULT_ISLAND_ID))
  if (!islandSnap.exists()) return

  const manufactureIds = Array.isArray(islandSnap.data()?.manufactures) ? islandSnap.data().manufactures : []
  const loadDeps = { collection: collectionFn, getDocs: getDocsFn, query: queryFn, where: whereFn, documentId: documentIdFn, db: firestoreDb }
  const entries = (await loadManufacturesByIds(manufactureIds, loadDeps))
    .flatMap((item) => expandCoinPigEntry(item, coinPigCycle, rng))
    .filter((item) => (
      item.income !== 0
      || item.mechanic === 'coinPig'
      || (item.incomeDestination?.startsWith('hero:') && Object.keys(item.incomeGoods || {}).length > 0)
    ))
  const rawPopulationEntries = (populationItems || [])
    .map((group) => {
      const count = Number(group.count ?? 0)
      const incomePerPerson = normalizeAmount(group.incomePerPerson ?? group.income ?? group.incomePer ?? 0)
      return {
        id: group.id,
        name: group.name || 'Невідома група',
        description: group.description || '',
        income: normalizeAmount(incomePerPerson * count),
        incomePerPerson,
        count,
        faction: group.faction || null,
        type: 'population',
      }
    })
    .filter((item) => item.income !== 0)

  const { entries: populationEntries } = applyBureaucratEffects(rawPopulationEntries, rng)

  const combinedEntries = [...entries.map((item) => ({ ...item, type: 'manufacture' })), ...populationEntries]
  if (!combinedEntries.length) return

  const metaRef = docFn(firestoreDb, 'treasury/meta')
  const txCol = collectionFn(firestoreDb, 'treasury-transactions')
  const cycleLabel = formatCycleLabel(startedAt, finishedAt)
  const nonHeroManufactures = combinedEntries.filter(
    (item) => item.type !== 'manufacture' || (!item.incomeDestination?.startsWith('guild:') && !item.incomeDestination?.startsWith('hero:')),
  )
  const totalIncome = nonHeroManufactures.reduce((sum, item) => (item.income > 0 ? sum + item.income : sum), 0)
  const totalOutcome = nonHeroManufactures.reduce((sum, item) => (item.income < 0 ? sum + Math.abs(item.income) : sum), 0)

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

    // Pre-read hero balances for hero-destination manufactures
    const heroBalances = new Map()
    const heroGoods = new Map()
    const heroNames = new Map()
    const heroIds = [...new Set(combinedEntries.filter((item) => item.type === 'manufacture' && item.incomeDestination?.startsWith('hero:')).map((item) => item.incomeDestination.slice('hero:'.length)).filter(Boolean))]

    await Promise.all(heroIds.map(async (heroId) => {
      const heroRef = docFn(firestoreDb, 'heroes', heroId)
      const heroSnap = await transaction.get(heroRef)
      const data = heroSnap.exists() ? heroSnap.data() || {} : {}
      heroBalances.set(heroId, Number(data.goldBalance ?? 0))
      heroGoods.set(heroId, { ...(data.goods || {}) })
      heroNames.set(heroId, data.name || heroId)
    }))

    for (const item of combinedEntries) {
      const isGuildDestination = item.type === 'manufacture' && item.incomeDestination?.startsWith('guild:')
      const isHeroDestination = item.type === 'manufacture' && item.incomeDestination?.startsWith('hero:')
      const guildId = isGuildDestination ? item.incomeDestination.slice('guild:'.length) : null
      const heroId = isHeroDestination ? item.incomeDestination.slice('hero:'.length) : null

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

      if (isHeroDestination && heroId) {
        const heroRef = docFn(firestoreDb, 'heroes', heroId)
        const heroCurrent = Number(heroBalances.get(heroId) || 0)
        const heroNext = normalizeAmount(heroCurrent + item.income)
        if (heroNext < 0) throw new Error(`Недостатньо коштів на рахунку героя для списання з мануфактури "${item.name}".`)
        heroBalances.set(heroId, heroNext)

        const currentGoods = heroGoods.get(heroId) || {}
        const updatedGoods = { ...currentGoods }
        const goodsDelta = {}
        for (const [goodId, qty] of Object.entries(item.incomeGoods || {})) {
          const prev = Number(updatedGoods[goodId] ?? 0)
          const next = prev + Number(qty)
          if (next < 0) throw new Error(`Недостатньо товару "${goodId}" на рахунку героя.`)
          updatedGoods[goodId] = next
          goodsDelta[goodId] = Number(qty)
        }
        heroGoods.set(heroId, updatedGoods)

        transaction.set(heroRef, { goldBalance: heroNext, goods: updatedGoods, updatedAt: serverTimestampFn() }, { merge: true })
        transaction.set(docFn(collectionFn(firestoreDb, 'hero-transactions')), {
          heroId,
          heroName: heroNames.get(heroId) || heroId,
          goldAmount: item.income,
          goods: goodsDelta,
          type: item.income >= 0 ? 'income' : 'deduction',
          comment: (
            item.mechanic === 'coinPig'
              ? `Coin Pig "${item.name || 'Без назви'}": ${item.coinPigDurationDays} дн. × 1d4-1 = ${formatAmount(item.coinPigTotal)} зм, частка ${item.coinPigParticipantIndex + 1}/${item.coinPigParticipantCount} за цикл ${formatCycleLabel(item.cycleStartedAt || startedAt, item.cycleFinishedAt || finishedAt)}.`
              : `Автонарахування з мануфактури "${item.name || 'Без назви'}" за цикл ${cycleLabel}.`
          ).slice(0, 500),
          cycleId: item.cycleId || cycleId,
          cycleStartedAt: item.cycleStartedAt || startedAt,
          cycleFinishedAt: item.cycleFinishedAt || finishedAt || null,
          manufactureId: item.manufactureId || null,
          manufactureName: item.name || null,
          manufactureMechanic: item.mechanic || 'fixed',
          createdAt: serverTimestampFn(),
        })
        continue
      }

      currentBalance += item.income
      const label = item.income >= 0 ? 'Дохід' : 'Витрати'
      const commentParts = item.type === 'population'
        ? [`${label} населення групи "${item.name}"`, `(${item.count} осіб × ${formatAmount(item.incomePerPerson)} зм)`]
        : [`${label} мануфактури "${item.name || 'Без назви'}"`]
      if (item.type === 'manufacture' && item.description) commentParts.push(item.description)
      if (item._bureaucratBonus > 0) commentParts.push(`+${formatAmount(item._bureaucratBonus)} зм бонус бюрократів`)
      if (item._bureaucratPenalty > 0) commentParts.push(`-${formatAmount(item._bureaucratPenalty)} зм несплачено (без нагляду)`)
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

export function buildExpeditionDetails(expedition = {}) {
  const adventureTitle = String(expedition.adventureTitle || '').trim()
  const durationDays = Number(expedition.durationDays)
  const participantHeroIds = normalizeHeroIds(expedition.participantHeroIds)
  const crewGroups = (Array.isArray(expedition.crewGroups) ? expedition.crewGroups : [])
    .map((group) => ({
      role: String(group?.role || '').trim(),
      count: Number(group?.count),
      dailyRate: normalizeAmount(Number(group?.dailyRate)),
    }))

  if (!adventureTitle) throw new Error('EXPEDITION_TITLE_REQUIRED')
  if (!Number.isInteger(durationDays) || durationDays < 1) throw new Error('INVALID_EXPEDITION_DURATION')
  if (!participantHeroIds.length) throw new Error('EXPEDITION_PARTICIPANTS_REQUIRED')
  if (!crewGroups.length || crewGroups.some((group) => !group.role || !Number.isInteger(group.count) || group.count < 1 || !Number.isFinite(group.dailyRate) || group.dailyRate < 0)) {
    throw new Error('INVALID_CREW_GROUPS')
  }

  const totalCrewCount = crewGroups.reduce((sum, group) => sum + group.count, 0)
  const totalCostCents = crewGroups.reduce(
    (sum, group) => sum + Math.round(group.dailyRate * 100) * group.count * durationDays,
    0,
  )
  const baseShare = Math.floor(totalCostCents / participantHeroIds.length)
  const remainder = totalCostCents % participantHeroIds.length
  const participantShares = participantHeroIds.map((heroId, index) => ({
    heroId,
    amount: (baseShare + (index < remainder ? 1 : 0)) / 100,
  }))

  return {
    adventureTitle,
    durationDays,
    participantHeroIds,
    crewGroups,
    totalCrewCount,
    totalCost: totalCostCents / 100,
    autoDeduct: expedition.autoDeduct !== false,
    participantShares,
  }
}

async function settleExpedition(cycleRef, cycleData, expedition, finishedAt, {
  collectionFn, docFn, runTransactionFn, serverTimestampFn, firestoreDb,
}) {
  const details = buildExpeditionDetails(expedition)
  await runTransactionFn(firestoreDb, async (transaction) => {
    const heroRows = []
    for (const share of details.participantShares) {
      const heroRef = docFn(firestoreDb, 'heroes', share.heroId)
      const heroSnap = await transaction.get(heroRef)
      if (!heroSnap.exists()) throw new Error(`EXPEDITION_HERO_NOT_FOUND:${share.heroId}`)
      const hero = heroSnap.data() || {}
      if (hero.inactive) throw new Error(`EXPEDITION_HERO_INACTIVE:${share.heroId}`)
      heroRows.push({ ref: heroRef, share, hero })
    }

    const participantNames = heroRows.map(({ share, hero }) => ({
      heroId: share.heroId,
      heroName: hero.name || share.heroId,
    }))
    const participantShares = heroRows.map(({ share, hero }) => ({
      ...share,
      heroName: hero.name || share.heroId,
    }))
    const storedExpedition = {
      ...details,
      participants: participantNames,
      participantShares,
      paymentStatus: details.autoDeduct ? 'deducted' : 'skipped',
    }
    transaction.update(cycleRef, { finishedAt, expedition: storedExpedition })

    if (!details.autoDeduct) return
    for (const { ref, share, hero } of heroRows) {
      const nextBalance = normalizeAmount(Number(hero.goldBalance ?? 0) - share.amount)
      transaction.set(ref, { goldBalance: nextBalance, updatedAt: serverTimestampFn() }, { merge: true })
      transaction.set(docFn(collectionFn(firestoreDb, 'hero-transactions')), {
        heroId: share.heroId,
        heroName: hero.name || share.heroId,
        goldAmount: -share.amount,
        goods: {},
        type: 'crew-payment',
        comment: `Оплата екіпажу за пригоду "${details.adventureTitle}": ${details.durationDays} дн., частка ${formatAmount(share.amount)} зм.`.slice(0, 500),
        cycleId: cycleRef.id,
        cycleStartedAt: cycleData.startedAt || '',
        cycleFinishedAt: finishedAt,
        adventureTitle: details.adventureTitle,
        createdAt: serverTimestampFn(),
      })
    }
  })
  return details
}

export async function updateExpeditionDetails(cycleId, expedition, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  runTransaction: runTransactionFn = runTransaction,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
} = {}) {
  if (!cycleId) throw new Error('EXPEDITION_CYCLE_REQUIRED')
  const cycleRef = docFn(firestoreDb, 'cycles', cycleId)

  return runTransactionFn(firestoreDb, async (transaction) => {
    const cycleSnap = await transaction.get(cycleRef)
    if (!cycleSnap.exists()) throw new Error('EXPEDITION_CYCLE_NOT_FOUND')
    const cycleData = cycleSnap.data() || {}
    const existingExpedition = cycleData.expedition || {}
    const adventureTitle = String(expedition.adventureTitle || existingExpedition.adventureTitle || '').trim()
    if (!adventureTitle) throw new Error('EXPEDITION_NOT_FOUND')

    const details = buildExpeditionDetails({
      ...expedition,
      adventureTitle,
      autoDeduct: existingExpedition.autoDeduct ?? false,
    })
    const participants = []
    const participantShares = []
    for (const share of details.participantShares) {
      const heroSnap = await transaction.get(docFn(firestoreDb, 'heroes', share.heroId))
      if (!heroSnap.exists()) throw new Error(`EXPEDITION_HERO_NOT_FOUND:${share.heroId}`)
      const hero = heroSnap.data() || {}
      participants.push({ heroId: share.heroId, heroName: hero.name || share.heroId })
      participantShares.push({ ...share, heroName: hero.name || share.heroId })
    }

    const updatedExpedition = {
      ...existingExpedition,
      ...details,
      participants,
      participantShares,
      paymentStatus: 'edited',
      editedAt: serverTimestampFn(),
    }
    transaction.update(cycleRef, { expedition: updatedExpedition })
    return updatedExpedition
  })
}

/**
 * Consumes the Deva's monthly faith when a newly-created cycle crosses into a
 * new Faerun month. The transaction and cycle marker make retries idempotent.
 */
export async function consumeDevaFaithForMonthChange(cycleId, currentStartedAt, previousStartedAt, {
  doc: docFn = doc,
  runTransaction: runTransactionFn = runTransaction,
  db: firestoreDb = db,
} = {}) {
  const current = typeof currentStartedAt === 'string' ? parseFaerunDate(currentStartedAt) : currentStartedAt
  const previous = typeof previousStartedAt === 'string' ? parseFaerunDate(previousStartedAt) : previousStartedAt

  if (!cycleId || !current || !previous) return false
  if (current.month === previous.month && current.year === previous.year) return false

  const devaRef = docFn(firestoreDb, 'religions', PSEUDO_RELIGION_ID, 'customs', 'Deva')
  let consumed = false

  await runTransactionFn(firestoreDb, async (transaction) => {
    const snap = await transaction.get(devaRef)
    const data = snap.data() || {}
    if (data.lastConsumedCycleId === cycleId) return

    const faithPerDay = Math.max(0, Number(data.devaFaithPerDay ?? 1))
    const currentFaith = Math.max(0, Number(data.devaFaith ?? 0))
    const newFaith = currentFaith - faithPerDay * 30
    const updates = { lastConsumedCycleId: cycleId }

    if (newFaith < 0) {
      updates.devaFaith = 0
      updates.deathMarkers = Math.min(3, Number(data.deathMarkers ?? 0) + 1)
    } else {
      updates.devaFaith = newFaith
    }

    transaction.set(devaRef, updates, { merge: true })
    consumed = true
  })

  return consumed
}

export async function applyParkBuildingGrowth(islandId, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  getDoc: getDocFn = getDoc,
  getDocs: getDocsFn = getDocs,
  updateDoc: updateDocFn = updateDoc,
  db: firestoreDb = db,
} = {}) {
  const buildingsSnap = await getDocsFn(collectionFn(firestoreDb, 'buildings'))
  const parkBuildings = buildingsSnap.docs
    .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
    .filter((b) => b.growthPerCycle && Number(b.currentLvl) > 0)

  if (!parkBuildings.length) return

  for (const building of parkBuildings) {
    const lvl = Number(building.currentLvl)
    const growth = Number(building.growthPerCycle?.[lvl] ?? 0)
    if (!growth) continue

    const peasantsRef = docFn(firestoreDb, 'population', 'peasants')
    const peasantsSnap = await getDocFn(peasantsRef)
    if (peasantsSnap.exists()) {
      await updateDocFn(peasantsRef, { count: Number(peasantsSnap.data().count ?? 0) + growth })
    }

    const islandRef = docFn(firestoreDb, 'islands', islandId || DEFAULT_ISLAND_ID)
    const islandSnap = await getDocFn(islandRef)
    if (islandSnap.exists()) {
      await updateDocFn(islandRef, { population: Number(islandSnap.data().population ?? 0) + growth })
    }

    const unknownReligionRef = docFn(firestoreDb, 'religions', 'Unknown')
    const unknownReligionSnap = await getDocFn(unknownReligionRef)
    if (unknownReligionSnap.exists()) {
      await updateDocFn(unknownReligionRef, { followers: Number(unknownReligionSnap.data().followers ?? 0) + growth })
    }
  }
}

/**
 * Distributes goods for a single yield event to its destination hero.
 * Returns the rolled amounts, or an empty object for non-hero destinations.
 * Mutates nothing in Firestore — callers handle persistence.
 * @returns {{ rolledAmounts: Record<string,number>, heroUpdates: Record<string,number>|null, heroData: object|null, heroId: string|null }}
 */
async function _distributeYieldEvent(event, buildingKey, buildingEntry, labelDate, cycleId, {
  docFn, getDocFn, updateDocFn, addDocFn, collectionFn, serverTimestampFn, firestoreDb, rng, manuallyFulfilled = false,
}) {
  const destination = normalizeIncomeDestination(event.destination)
  const goodsMap = event.goods && typeof event.goods === 'object' ? event.goods : {}
  const buildingName = buildingEntry.name || buildingKey
  const suffix = manuallyFulfilled ? ' [вручну]' : ''
  const eventDateStr = event.date || labelDate

  // ── Hero destination ──────────────────────────────────────
  if (destination.startsWith('hero:')) {
    const heroId = destination.slice('hero:'.length)
    const heroRef = docFn(firestoreDb, 'heroes', heroId)
    const heroSnap = await getDocFn(heroRef)
    if (!heroSnap.exists()) {
      console.warn(`[cycle] Building yield: hero "${heroId}" not found — skipping event ${event.id}`)
      return { rolledAmounts: {}, skipped: true }
    }

    const heroData = heroSnap.data() || {}
    const rolledAmounts = {}
    const newHeroGoods = { ...(heroData.goods || {}) }

    for (const [goodId, notation] of Object.entries(goodsMap)) {
      const rolled = rollDice(notation, rng)
      if (rolled <= 0) continue
      rolledAmounts[goodId] = rolled
      newHeroGoods[goodId] = (Number(newHeroGoods[goodId] ?? 0)) + rolled
    }

    if (Object.keys(rolledAmounts).length > 0) {
      await updateDocFn(heroRef, { goods: newHeroGoods })
      await addDocFn(collectionFn(firestoreDb, 'hero-transactions'), {
        heroId,
        heroName: heroData.name || heroId,
        goldAmount: 0,
        goods: rolledAmounts,
        type: 'building-yield',
        comment: `Врожай: ${buildingName} (${eventDateStr})${suffix}.`.slice(0, 500),
        cycleId: cycleId || null,
        cycleStartedAt: labelDate,
        cycleFinishedAt: null,
        createdAt: serverTimestampFn(),
      })
    }

    return { rolledAmounts, skipped: false }
  }

  // ── Guild destination ─────────────────────────────────────
  if (destination.startsWith('guild:')) {
    const guildId = destination.slice('guild:'.length)
    const guildRef = docFn(firestoreDb, 'guilds', guildId)
    const guildSnap = await getDocFn(guildRef)
    if (!guildSnap.exists()) {
      console.warn(`[cycle] Building yield: guild "${guildId}" not found — skipping event ${event.id}`)
      return { rolledAmounts: {}, skipped: true }
    }

    const guildData = guildSnap.data() || {}
    const rolledAmounts = {}
    const newGuildGoods = { ...(guildData.goods || {}) }

    for (const [goodId, notation] of Object.entries(goodsMap)) {
      const rolled = rollDice(notation, rng)
      if (rolled <= 0) continue
      rolledAmounts[goodId] = rolled
      newGuildGoods[goodId] = (Number(newGuildGoods[goodId] ?? 0)) + rolled
    }

    if (Object.keys(rolledAmounts).length > 0) {
      await updateDocFn(guildRef, { goods: newGuildGoods, updatedAt: serverTimestampFn() })
      await addDocFn(collectionFn(firestoreDb, 'guilds', guildId, 'logs'), {
        amount: 0,
        type: 'goods-deposit',
        comment: `Врожай: ${buildingName} (${eventDateStr})${suffix}.`.slice(0, 500),
        userNickname: 'Система',
        createdAt: serverTimestampFn(),
        treasureAfter: Number(guildData.treasure || 0),
        goods: rolledAmounts,
        goodsAfter: newGuildGoods,
      })
    }

    return { rolledAmounts, skipped: false }
  }

  console.warn(`[cycle] Building yield: unrecognised destination "${event.destination}" — skipping event ${event.id}`)
  return { rolledAmounts: {}, skipped: true }
}

export async function processBuildingYields(cycleId, newCycleStart, islandId, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  getDoc: getDocFn = getDoc,
  updateDoc: updateDocFn = updateDoc,
  addDoc: addDocFn = addDoc,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
  rng = Math.random,
} = {}) {
  const islandRef = docFn(firestoreDb, 'islands', islandId || DEFAULT_ISLAND_ID)
  const islandSnap = await getDocFn(islandRef)
  if (!islandSnap.exists()) return

  const buildings = islandSnap.data().buildings || {}
  const newCycleStartAt = formatFaerunDate(newCycleStart)
  const updatedBuildings = {}
  let anyProcessed = false

  for (const [buildingKey, buildingEntry] of Object.entries(buildings)) {
    const yields = Array.isArray(buildingEntry.yields) ? buildingEntry.yields : []
    const pendingEvents = yields.filter((event) => {
      if (event.processed) return false
      const parsedEventDate = parseFaerunDate(event.date)
      if (!parsedEventDate) return false
      // diffInDays(A, B) > 1 means B is strictly after A, i.e. eventDate < newCycleStart
      const diff = diffInDays(parsedEventDate, newCycleStart)
      return diff !== null && diff > 1
    })

    if (!pendingEvents.length) continue

    const updatedYields = [...yields]
    const sharedEventDeps = { docFn, getDocFn, updateDocFn, addDocFn, collectionFn, serverTimestampFn, firestoreDb, rng }
    for (const event of pendingEvents) {
      const { rolledAmounts, skipped } = await _distributeYieldEvent(
        event, buildingKey, buildingEntry, newCycleStartAt, cycleId, sharedEventDeps,
      )
      if (skipped && !rolledAmounts) continue

      const idx = updatedYields.findIndex((y) => y.id === event.id)
      if (idx !== -1) {
        updatedYields[idx] = { ...updatedYields[idx], processed: true, processedAt: newCycleStartAt, processedAmounts: rolledAmounts }
      }
      anyProcessed = true
    }

    updatedBuildings[buildingKey] = { ...buildingEntry, yields: updatedYields }
  }

  if (anyProcessed) {
    const buildingUpdates = {}
    for (const [key, entry] of Object.entries(updatedBuildings)) {
      buildingUpdates[`buildings.${key}.yields`] = entry.yields
    }
    await updateDocFn(islandRef, buildingUpdates)
  }
}

/**
 * Manually fulfills a single yield event: rolls dice, delivers goods to hero, writes a transaction log,
 * then marks the event as processed with manuallyFulfilled: true.
 * Called from the admin UI "Виконати вручну" button.
 */
export async function fulfillYieldEventManually(islandId, buildingKey, eventId, {
  collection: collectionFn = collection,
  doc: docFn = doc,
  getDoc: getDocFn = getDoc,
  updateDoc: updateDocFn = updateDoc,
  addDoc: addDocFn = addDoc,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
  rng = Math.random,
} = {}) {
  const islandRef = docFn(firestoreDb, 'islands', islandId || DEFAULT_ISLAND_ID)
  const islandSnap = await getDocFn(islandRef)
  if (!islandSnap.exists()) throw new Error('Island not found.')

  const buildings = islandSnap.data().buildings || {}
  const buildingEntry = buildings[buildingKey]
  if (!buildingEntry) throw new Error(`Building "${buildingKey}" not found on island.`)

  const yields = Array.isArray(buildingEntry.yields) ? buildingEntry.yields : []
  const eventIdx = yields.findIndex((y) => y.id === eventId)
  if (eventIdx === -1) throw new Error(`Yield event "${eventId}" not found.`)

  const event = yields[eventIdx]
  if (event.processed) throw new Error('Ця подія вже виконана.')

  const nowLabel = event.date || formatFaerunDate({ day: 1, month: 0, year: DEFAULT_YEAR })
  const deps = { docFn, getDocFn, updateDocFn, addDocFn, collectionFn, serverTimestampFn, firestoreDb, rng, manuallyFulfilled: true }
  const { rolledAmounts } = await _distributeYieldEvent(event, buildingKey, buildingEntry, nowLabel, null, deps)

  const updatedYields = [...yields]
  updatedYields[eventIdx] = {
    ...event,
    processed: true,
    manuallyFulfilled: true,
    processedAt: nowLabel,
    processedAmounts: rolledAmounts,
  }

  await updateDocFn(islandRef, { [`buildings.${buildingKey}.yields`]: updatedYields })
}

export async function createNewCycleWithEffects({
  startedDate,
  expedition = null,
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
  setDoc: setDocFn = setDoc,
  documentId: documentIdFn = documentId,
  runTransaction: runTransactionFn = runTransaction,
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

  const sharedDeps = {
    collection: collectionFn,
    doc: docFn,
    getDoc: getDocFn,
    getDocs: getDocsFn,
    addDoc: addDocFn,
    updateDoc: updateDocFn,
    query: queryFn,
    where: whereFn,
    documentId: documentIdFn,
    runTransaction: runTransactionFn,
    serverTimestamp: serverTimestampFn,
    db: firestoreDb,
    rng,
  }

  const cyclesRef = collectionFn(firestoreDb, 'cycles')
  const lastCycleSnapshot = await getDocsFn(queryFn(cyclesRef, orderByFn('createdAt', 'desc'), limitFn(1)))
  const lastCycleDoc = lastCycleSnapshot.docs[0]
  const startedAt = formatFaerunDate(normalizedStart)
  const populationAtStart = Number(population ?? 0)
  const cycleDoc = await addDocFn(cyclesRef, { startedAt, populationAtStart, createdAt: serverTimestampFn() })
  const weatherForecast = generateCycleWeatherForecast({ cycleId: cycleDoc.id, startedAt })
  if (weatherForecast.length) {
    await updateDocFn(cycleDoc, { weatherForecast })
  }
  let coinPigCycle = null

  if (lastCycleDoc && !lastCycleDoc.data().finishedAt) {
    const previousCycle = lastCycleDoc.data()
    const parsedPreviousStart = parseFaerunDate(previousCycle.startedAt)
    const previousFinishedDate = {
      day: normalizedStart.day === 1 ? 30 : normalizedStart.day - 1,
      month: normalizedStart.day === 1 ? (normalizedStart.month === 0 ? 11 : normalizedStart.month - 1) : normalizedStart.month,
      year: normalizedStart.day === 1 && normalizedStart.month === 0 ? normalizedStart.year - 1 : normalizedStart.year,
    }
    const previousDuration = parsedPreviousStart ? diffInDays(parsedPreviousStart, previousFinishedDate) : null
    const previousUpdate = { finishedAt: formatFaerunDate(previousFinishedDate) }
    if (previousDuration && previousDuration > 0) previousUpdate.duration = previousDuration
    if (expedition) {
      await settleExpedition(lastCycleDoc.ref, previousCycle, expedition, previousUpdate.finishedAt, {
        collectionFn, docFn, runTransactionFn, serverTimestampFn, firestoreDb,
      })
      if (previousUpdate.duration) await updateDocFn(lastCycleDoc.ref, { duration: previousUpdate.duration })
    } else {
      await updateDocFn(lastCycleDoc.ref, previousUpdate)
    }
    coinPigCycle = {
      cycleId: lastCycleDoc.id,
      startedAt: previousCycle.startedAt || '',
      finishedAt: previousUpdate.finishedAt,
      durationDays: previousDuration,
    }

    const populationBefore = Number(previousCycle.populationAtStart)
    const hasPopulationBefore = Number.isFinite(populationBefore)
    const hasPopulationAfter = Number.isFinite(populationAtStart)
    await setDocFn(docFn(firestoreDb, 'cycle-summaries', lastCycleDoc.id), {
      cycleId: lastCycleDoc.id,
      cycleStartedAt: previousCycle.startedAt || '',
      cycleFinishedAt: previousUpdate.finishedAt,
      populationBefore: hasPopulationBefore ? populationBefore : null,
      populationAfter: hasPopulationAfter ? populationAtStart : null,
      populationDelta: hasPopulationBefore && hasPopulationAfter ? populationAtStart - populationBefore : null,
      updatedAt: serverTimestampFn(),
    }, { merge: true })
  }

  await consumeDevaFaithForMonthChange(
    cycleDoc.id,
    normalizedStart,
    lastCycleDoc?.data().startedAt,
    sharedDeps,
  )
  await resetReligionsSvTemp(sharedDeps)
  await addDocFn(collectionFn(firestoreDb, 'religion-actions'), {
    actionType: docFn(firestoreDb, 'religion-action-types', 'cycleStart'),
    cycleId: cycleDoc.id,
    notes: '',
    createdAt: serverTimestampFn(),
    convertedFollowers: 0,
    result: 0,
  })
  await applyParkBuildingGrowth(islandId, sharedDeps)
  await distributeBuildingFaithIncome(cycleDoc.id, sharedDeps)
  await distributeManufactureIncome(cycleDoc.id, startedAt, null, islandId, populationItems, { ...sharedDeps, coinPigCycle })
  await processBuildingYields(cycleDoc.id, normalizedStart, islandId, sharedDeps)
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
