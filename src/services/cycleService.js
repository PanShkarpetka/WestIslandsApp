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
import { diffInDays, formatFaerunDate, normalizeFaerunDate, parseFaerunDate } from 'faerun-date'
import { db } from '@/services/firebase'
import { BUILDING_LEVEL_BONUSES } from '@/store/religionStore'
import { formatAmount } from '@/utils/formatters'
import { generateSpellRequestsForCycle, settlePreviousSpellRequests } from '@/services/mageGuildService'

function normalizeAmount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

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

async function resetReligionsSvTemp() {
  const religionsRef = collection(db, 'religions')
  const religionsSnapshot = await getDocs(religionsRef)
  if (religionsSnapshot.empty) return

  const batch = writeBatch(db)
  religionsSnapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, { svTemp: 0 })
  })
  await batch.commit()
}

async function loadManufacturesByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return []

  const chunks = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  const results = []
  for (const chunk of chunks) {
    const q = query(collection(db, 'manufactures'), where(documentId(), 'in', chunk))
    const snapshot = await getDocs(q)
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

async function distributeManufactureIncome(cycleId, startedAt, finishedAt, islandId, populationItems) {
  const islandSnap = await getDoc(doc(db, 'islands', islandId || 'island_rock'))
  if (!islandSnap.exists()) return

  const manufactureIds = Array.isArray(islandSnap.data()?.manufactures) ? islandSnap.data().manufactures : []
  const entries = (await loadManufacturesByIds(manufactureIds)).filter((item) => item.income !== 0)
  const populationEntries = (populationItems || [])
    .map((group) => {
      const count = Number(group.count ?? group.amount ?? 0)
      const incomePerPerson = normalizeAmount(group.incomePerPerson ?? group.income ?? group.incomePer ?? 0)
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

  const metaRef = doc(db, 'treasury/meta')
  const txCol = collection(db, 'treasuryTransactions')
  const cycleLabel = formatCycleLabel(startedAt, finishedAt)
  const treasuryEntries = combinedEntries.filter((item) => item.type !== 'manufacture' || !item.incomeDestination?.startsWith('guild:'))
  const totalIncome = treasuryEntries.reduce((sum, item) => (item.income > 0 ? sum + item.income : sum), 0)
  const totalOutcome = treasuryEntries.reduce((sum, item) => (item.income < 0 ? sum + Math.abs(item.income) : sum), 0)

  await runTransaction(db, async (transaction) => {
    const metaSnap = await transaction.get(metaRef)
    let currentBalance = metaSnap.exists() ? metaSnap.data()?.balance || 0 : 0
    const guildBalances = new Map()
    const guildIds = [...new Set(combinedEntries.filter((item) => item.type === 'manufacture' && item.incomeDestination?.startsWith('guild:')).map((item) => item.incomeDestination.slice('guild:'.length)).filter(Boolean))]

    await Promise.all(guildIds.map(async (guildId) => {
      const guildRef = doc(db, 'guilds', guildId)
      const guildSnap = await transaction.get(guildRef)
      guildBalances.set(guildId, Number(guildSnap.exists() ? guildSnap.data()?.treasure || 0 : 0))
    }))

    for (const item of combinedEntries) {
      const isGuildDestination = item.type === 'manufacture' && item.incomeDestination?.startsWith('guild:')
      const guildId = isGuildDestination ? item.incomeDestination.slice('guild:'.length) : null

      if (isGuildDestination && guildId) {
        const guildRef = doc(db, 'guilds', guildId)
        const guildLogsRef = collection(db, 'guilds', guildId, 'logs')
        const guildCurrent = Number(guildBalances.get(guildId) || 0)
        const guildNext = normalizeAmount(guildCurrent + item.income)
        guildBalances.set(guildId, guildNext)
        transaction.set(guildRef, { treasure: guildNext, updatedAt: serverTimestamp() }, { merge: true })
        transaction.set(doc(guildLogsRef), {
          amount: item.income,
          type: item.income >= 0 ? 'deposit' : 'withdraw',
          comment: `Автооперація з мануфактури "${item.name || 'Без назви'}" за цикл ${cycleLabel}.`.slice(0, 500),
          userNickname: 'Система',
          createdAt: serverTimestamp(),
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

      transaction.set(doc(txCol), {
        amount: item.income,
        type: item.income >= 0 ? 'deposit' : 'withdraw',
        comment: commentParts.join(' ').slice(0, 500),
        userId: 'system',
        nickname: 'Система',
        createdAt: serverTimestamp(),
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
      updatedAt: serverTimestamp(),
    }, { merge: true })
  })
}

async function distributeBuildingFaithIncome(cycleId) {
  const religionsSnapshot = await getDocs(collection(db, 'religions'))
  const religionsWithIncome = religionsSnapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() || {}
      const buildingLevel = data.buildingLevel || 'none'
      return { id: docSnap.id, name: data.name || 'Невідома релігія', ref: docSnap.ref, buildingLevel, passiveFaith: getBuildingFaithIncome(buildingLevel) }
    })
    .filter((religion) => religion.passiveFaith > 0)

  for (const religion of religionsWithIncome) {
    const clergySnapshot = await getDocs(query(collection(db, 'clergy'), where('religion', '==', religion.ref)))
    if (clergySnapshot.empty) continue
    const eligibilityChecks = await Promise.all(clergySnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data() || {}
      const heroRef = data.hero
      if (!heroRef) return { docSnap, eligible: true }

      try {
        const heroSnap = await getDoc(heroRef)
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
    const remainderIndex = remainder > 0 ? Math.floor(Math.random() * heroCount) : -1

    await Promise.all(eligible.map(async (docSnap, index) => {
      const bonus = baseShare + (index === remainderIndex ? remainder : 0)
      if (!bonus) return
      const data = docSnap.data() || {}
      const newFaith = Number(data.faith ?? 0) + bonus
      const updates = { faith: newFaith }
      if (Number(data.faithMax ?? 0) < newFaith) updates.faithMax = newFaith
      await updateDoc(docSnap.ref, updates)
      await addDoc(collection(docSnap.ref, 'logs'), {
        delta: bonus,
        message: `Пасивний дохід від споруди (${religion.buildingLevel}) за цикл ${cycleId}.`,
        user: 'Система',
        cycleId,
        religionId: religion.id,
        religionName: religion.name,
        createdAt: serverTimestamp(),
      })
    }))
  }
}

export async function createNewCycleWithEffects({
  startedDate,
  notes = '',
  islandId = 'island_rock',
  population = 0,
  populationItems = [],
}) {
  const normalizedStart = normalizeFaerunDate(startedDate)
  if (!normalizedStart) throw new Error('INVALID_START_DATE')

  const cyclesRef = collection(db, 'cycles')
  const lastCycleSnapshot = await getDocs(query(cyclesRef, orderBy('createdAt', 'desc'), limit(1)))
  const lastCycleDoc = lastCycleSnapshot.docs[0]
  const startedAt = formatFaerunDate(normalizedStart)
  const cycleDoc = await addDoc(cyclesRef, { startedAt, createdAt: serverTimestamp() })

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
    await updateDoc(lastCycleDoc.ref, previousUpdate)
  }

  await resetReligionsSvTemp()
  await addDoc(collection(db, 'religionActions'), {
    actionType: doc(db, 'religionActionTypes', 'cycleStart'),
    cycleId: cycleDoc.id,
    notes: notes?.trim() || '',
    createdAt: serverTimestamp(),
    convertedFollowers: 0,
    result: 0,
  })
  await distributeBuildingFaithIncome(cycleDoc.id)
  await distributeManufactureIncome(cycleDoc.id, startedAt, null, islandId, populationItems)
  await settlePreviousSpellRequests()
  await generateSpellRequestsForCycle({
    cycleRef: cycleDoc,
    cycleId: cycleDoc.id,
    islandId,
    population,
    cycleStartedAt: startedAt,
    cycleFinishedAt: '',
  })

  return { id: cycleDoc.id, startedAt }
}
