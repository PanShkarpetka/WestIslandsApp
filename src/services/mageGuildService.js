import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { DEFAULT_ISLAND_ID } from '../config/constants.js'
import {
  applySpellPriceDelta,
  buildSpellRequestDrafts,
  getSpellLevel,
  getSpellName,
  getSpellPrice,
  getSpellTier,
  normalizeSpellLevel,
} from '../utils/mageGuildRequests.js'
import { normalizeAmount } from '../utils/numbers.js'

const SPELL_REQUEST_CONFIG_ID = 'spell-request-prices'
const HERO_COLLECTION = 'heroes'

export function calculateSpellRequestPayout(compensation, islandTaxRate, mageGuildTaxRate) {
  const gross = normalizeAmount(Number(compensation ?? 0))
  const treasuryTaxRate = Number(islandTaxRate ?? 0)
  const guildTaxRate = Number(mageGuildTaxRate ?? 0)

  if (!Number.isFinite(treasuryTaxRate) || treasuryTaxRate < 0) {
    throw new Error('Island tax rate must be a non-negative number.')
  }

  if (!Number.isFinite(guildTaxRate) || guildTaxRate < 0) {
    throw new Error('Mage guild tax rate must be a non-negative number.')
  }

  if (treasuryTaxRate + guildTaxRate > 1) {
    throw new Error('Total tax rate cannot exceed 100%.')
  }

  const treasuryTax = normalizeAmount(gross * treasuryTaxRate)
  const guildTax = normalizeAmount(gross * guildTaxRate)
  const heroNet = normalizeAmount(gross - treasuryTax - guildTax)

  return {
    gross,
    heroNet,
    treasuryTax,
    treasuryTaxRate,
    guildTax,
    guildTaxRate,
  }
}

function resolveHeroName(heroData, fallback = 'Невідомий герой') {
  return heroData?.name || heroData?.heroName || heroData?.nickname || fallback
}

function formatCycleLabel(cycleData = {}, fallbackLabel = '') {
  const startedAt = cycleData.startedAt || ''
  const finishedAt = cycleData.finishedAt || ''

  if (startedAt && finishedAt) return `${startedAt} — ${finishedAt}`
  if (startedAt) return `${startedAt} (триває)`
  return fallbackLabel
}

async function resolveCycleInfo(data, cycleCache) {
  const cachedKey = data.cycle?.path || data.cycleId || ''
  const existing = cachedKey ? cycleCache.get(cachedKey) : null
  if (existing) return existing

  const fromDocument = {
    cycleStartedAt: data.cycleStartedAt || '',
    cycleFinishedAt: data.cycleFinishedAt || '',
    cycleLabel: formatCycleLabel(data, data.cycleId || ''),
  }

  if (fromDocument.cycleStartedAt || fromDocument.cycleFinishedAt) {
    if (cachedKey) cycleCache.set(cachedKey, fromDocument)
    return fromDocument
  }

  if (!data.cycle?.path) {
    if (cachedKey) cycleCache.set(cachedKey, fromDocument)
    return fromDocument
  }

  try {
    const cycleSnapshot = await getDoc(doc(db, data.cycle.path))
    if (!cycleSnapshot.exists()) {
      if (cachedKey) cycleCache.set(cachedKey, fromDocument)
      return fromDocument
    }

    const cycleData = cycleSnapshot.data() || {}
    const resolved = {
      cycleStartedAt: cycleData.startedAt || '',
      cycleFinishedAt: cycleData.finishedAt || '',
      cycleLabel: formatCycleLabel(cycleData, data.cycleId || ''),
    }

    if (cachedKey) cycleCache.set(cachedKey, resolved)
    return resolved
  } catch (_error) {
    if (cachedKey) cycleCache.set(cachedKey, fromDocument)
    return fromDocument
  }
}

function mapSpell(docSnap) {
  const data = docSnap.data() || {}

  return {
    id: docSnap.id,
    ref: docSnap.ref,
    refPath: docSnap.ref.path,
    name: getSpellName({ ...data, id: docSnap.id }),
    spellLevel: getSpellLevel(data),
    spellTier: getSpellTier(data),
    currentPrice: getSpellPrice(data, 0),
    raw: data,
  }
}

function mapHero(docSnap) {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    ref: docSnap.ref,
    name: resolveHeroName(data, docSnap.id),
    inactive: Boolean(data.inactive),
  }
}

function sortRequests(requests = []) {
  return [...requests].sort((a, b) => {
    if (Number(Boolean(a.fulfilled)) !== Number(Boolean(b.fulfilled))) {
      return Number(Boolean(a.fulfilled)) - Number(Boolean(b.fulfilled))
    }

    const compensationDiff = Number(b.compensation ?? 0) - Number(a.compensation ?? 0)
    if (compensationDiff !== 0) return compensationDiff

    return String(a.spellName || '').localeCompare(String(b.spellName || ''), 'uk-UA')
  })
}

function getIslandPopulationValue(data = {}) {
  return Number(data.population ?? 0) || 0
}

async function resolvePopulation(islandId, fallbackPopulation) {
  const normalizedFallback = Number(fallbackPopulation)
  if (Number.isFinite(normalizedFallback) && normalizedFallback > 0) {
    return normalizedFallback
  }

  if (!islandId) return 0

  const islandSnapshot = await getDoc(doc(db, 'islands', islandId))
  if (!islandSnapshot.exists()) return 0

  return getIslandPopulationValue(islandSnapshot.data() || {})
}

export function subscribeSpellRequests(callback, onError) {
  const q = query(collection(db, 'spell-requests'), orderBy('createdAt', 'desc'))
  const cycleCache = new Map()

  return onSnapshot(q, async (snapshot) => {
    try {
      const docs = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() || {}
        const cycleInfo = await resolveCycleInfo(data, cycleCache)

        return {
          id: docSnap.id,
          ...data,
          ...cycleInfo,
          isTest: Boolean(data.isTest),
          requests: sortRequests(Array.isArray(data.requests) ? data.requests : []),
        }
      }))

      callback(docs)
    } catch (error) {
      onError?.(error)
    }
  }, onError)
}

export function subscribeHeroes(callback, onError) {
  return onSnapshot(collection(db, HERO_COLLECTION), (snapshot) => {
    callback(
      snapshot.docs
        .map(mapHero)
        .filter((hero) => !hero.inactive)
        .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA')),
    )
  }, onError)
}

export async function fetchMageGuildConfig() {
  const configRef = doc(db, 'mage-guild-configs', SPELL_REQUEST_CONFIG_ID)
  const snapshot = await getDoc(configRef)

  if (!snapshot.exists()) {
    throw new Error('Не знайдено конфігурацію гільдії магів.')
  }

  return { id: snapshot.id, ref: snapshot.ref, ...snapshot.data() }
}

export async function fetchSpells() {
  const snapshot = await getDocs(collection(db, 'spells'))
  return snapshot.docs.map(mapSpell)
}

export async function fetchLatestCycle() {
  const snapshot = await getDocs(query(collection(db, 'cycles'), orderBy('createdAt', 'desc'), limit(1)))
  const docSnap = snapshot.docs[0]

  if (!docSnap) {
    throw new Error('Спершу створіть хоча б один цикл.')
  }

  return {
    id: docSnap.id,
    ref: docSnap.ref,
    ...docSnap.data(),
  }
}

export async function settlePreviousSpellRequests() {
  const [config, spellRequestsSnapshot, spellsSnapshot] = await Promise.all([
    fetchMageGuildConfig(),
    getDocs(collection(db, 'spell-requests')),
    getDocs(collection(db, 'spells')),
  ])

  const requestDocs = spellRequestsSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ref: docSnap.ref, ...docSnap.data() }))
    .filter((item) => !item.priceChangesAppliedAt && !item.isTest)

  if (!requestDocs.length) {
    return { processedDocuments: 0, processedRequests: 0 }
  }

  const spellCache = new Map(spellsSnapshot.docs.map((docSnap) => [docSnap.id, mapSpell(docSnap)]))
  const spellUpdates = new Map()
  let processedRequests = 0

  for (const requestDoc of requestDocs) {
    for (const request of Array.isArray(requestDoc.requests) ? requestDoc.requests : []) {
      const spellId = request.spellId || request.spellRefPath?.split('/')?.[1] || ''
      const spellLevel = normalizeSpellLevel(request.spellLevel)
      const levelConfig = config.spellTypes?.[spellLevel]
      const priceConfig = levelConfig?.price
      const spell = spellCache.get(spellId)

      if (!spell || !priceConfig) continue

      const current = spellUpdates.get(spellId) || {
        ref: spell.ref,
        nextPrice: getSpellPrice(spell.raw, priceConfig?.default ?? 0),
        historyEntries: [],
      }

      current.nextPrice = applySpellPriceDelta(
        current.nextPrice,
        priceConfig,
        request.fulfilled ? 'decrease' : 'increase',
      )

      if (request.fulfilled) {
        current.historyEntries.push({
          requestId: request.localId || request.id || '',
          spellRequestId: requestDoc.id,
          cycleId: requestDoc.cycleId || '',
          fulfilledAt: request.fulfilledAt || null,
          heroId: request.fulfilledByHeroId || '',
          heroName: request.fulfilledByHeroName || '',
          telegramPostUrl: request.telegramPostUrl || '',
          spellName: request.spellName || spell.name,
          compensation: Number(request.compensation ?? 0),
          downtimeDays: Number(request.downtimeDays ?? 0),
          recordedAt: new Date().toISOString(),
        })
      }

      spellUpdates.set(spellId, current)
      processedRequests += 1
    }
  }

  for (const update of spellUpdates.values()) {
    const payload = {
      currentPrice: update.nextPrice,
      updatedAt: serverTimestamp(),
    }

    if (update.historyEntries.length) {
      payload.requestHistory = arrayUnion(...update.historyEntries)
    }

    await updateDoc(update.ref, payload)
  }

  for (const requestDoc of requestDocs) {
    await updateDoc(requestDoc.ref, {
      priceChangesAppliedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return {
    processedDocuments: requestDocs.length,
    processedRequests,
  }
}

export async function generateSpellRequestsForCycle({
  cycleRef,
  cycleId,
  islandId,
  population,
  createdBy = '',
  cycleStartedAt = '',
  cycleFinishedAt = '',
}) {
  const [config, spells] = await Promise.all([fetchMageGuildConfig(), fetchSpells()])
  const generation = buildSpellRequestDrafts({
    population,
    spellTypes: config.spellTypes || {},
    spells,
  })

  const spellRequestsRef = collection(db, 'spell-requests')
  const spellRequestDoc = await addDoc(spellRequestsRef, {
    cycle: cycleRef,
    cycleId,
    cycleStartedAt,
    cycleFinishedAt,
    islandId: islandId || '',
    population: Number(population ?? 0),
    requestsMin: generation.requestsMin,
    requestsMax: generation.requestsMax,
    rolledRequestsCount: generation.requestsCount,
    requestsCount: generation.requests.length,
    requests: generation.requests,
    createdBy: createdBy || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    priceChangesAppliedAt: null,
  })

  return spellRequestDoc
}

export async function ensureCurrentCycleSpellRequests({ islandId, population, createdBy = '' }) {
  const latestCycle = await fetchLatestCycle()
  const requestSnapshot = await getDocs(collection(db, 'spell-requests'))
  const existingDoc = requestSnapshot.docs.find((docSnap) => {
    const data = docSnap.data() || {}
    return !data.isTest && data.cycleId === latestCycle.id
  })

  if (existingDoc) {
    return {
      created: false,
      cycleId: latestCycle.id,
      spellRequestId: existingDoc.id,
    }
  }

  const resolvedPopulation = await resolvePopulation(islandId, population)
  const createdDoc = await generateSpellRequestsForCycle({
    cycleRef: latestCycle.ref,
    cycleId: latestCycle.id,
    islandId,
    population: resolvedPopulation,
    createdBy,
    cycleStartedAt: latestCycle.startedAt || '',
    cycleFinishedAt: latestCycle.finishedAt || '',
  })

  return {
    created: true,
    cycleId: latestCycle.id,
    spellRequestId: createdDoc.id,
  }
}

export async function fulfillSpellRequest({
  spellRequestId,
  requestId,
  heroId,
  guildId,
  mageGuildTaxRate = 0,
  islandId = DEFAULT_ISLAND_ID,
  telegramPostUrl,
  actorName,
}, {
  db: firestoreDb = db,
  runTransactionFn = runTransaction,
  docFn = doc,
  collectionFn = collection,
  serverTimestampFn = serverTimestamp,
} = {}) {
  if (!spellRequestId) throw new Error('Не вказано документ із заявками.')
  if (!requestId) throw new Error('Не вказано заявку.')
  if (!heroId) throw new Error('Оберіть героя.')
  if (!guildId) throw new Error('Оберіть гільдію для частки магів.')

  const requestRef = docFn(firestoreDb, 'spell-requests', spellRequestId)
  const heroRef = docFn(firestoreDb, HERO_COLLECTION, heroId)
  const treasuryRef = docFn(firestoreDb, 'treasury/meta')
  const guildRef = docFn(firestoreDb, 'guilds', guildId)
  const islandRef = docFn(firestoreDb, 'islands', islandId || DEFAULT_ISLAND_ID)

  return runTransactionFn(firestoreDb, async (transaction) => {
    const [requestSnap, heroSnap, treasurySnap, guildSnap, islandSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(heroRef),
      transaction.get(treasuryRef),
      transaction.get(guildRef),
      transaction.get(islandRef),
    ])

    if (!requestSnap.exists()) {
      throw new Error('Документ із заявками не знайдено.')
    }

    if (!heroSnap.exists()) {
      throw new Error('Героя не знайдено.')
    }
    if (!guildSnap.exists()) {
      throw new Error('Гільдію для частки магів не знайдено.')
    }
    if (!islandSnap.exists()) {
      throw new Error('Острів із податковою ставкою не знайдено.')
    }

    const data = requestSnap.data() || {}
    const heroData = heroSnap.data() || {}
    const treasuryData = treasurySnap.exists() ? treasurySnap.data() || {} : {}
    const guildData = guildSnap.data() || {}
    const islandData = islandSnap.data() || {}
    const requests = Array.isArray(data.requests) ? [...data.requests] : []
    const requestIndex = requests.findIndex((item) => (item.localId || item.id) === requestId)

    if (requestIndex === -1) {
      throw new Error('Заявку не знайдено.')
    }

    if (requests[requestIndex].fulfilled) {
      throw new Error('Заявка вже виконана.')
    }

    const request = requests[requestIndex]
    const heroName = resolveHeroName(heroData, heroId)
    const guildName = guildData.name || guildData.shortName || guildId
    const fulfilledAt = new Date().toISOString()
    const payout = calculateSpellRequestPayout(request.compensation, islandData.taxRate, mageGuildTaxRate)
    const nextHeroBalance = normalizeAmount(Number(heroData.goldBalance ?? 0) + payout.heroNet)
    const nextTreasuryBalance = normalizeAmount(Number(treasuryData.balance ?? 0) + payout.treasuryTax)
    const nextGuildTreasure = normalizeAmount(Number(guildData.treasure ?? 0) + payout.guildTax)
    const actor = actorName || 'Адміністратор'

    requests[requestIndex] = {
      ...request,
      fulfilled: true,
      fulfilledAt,
      fulfilledByHeroId: heroId,
      fulfilledByHeroName: heroName,
      fulfilledByHeroRefPath: heroRef.path,
      telegramPostUrl: telegramPostUrl?.trim() || '',
      updatedBy: actor,
      grossReward: payout.gross,
      heroNetReward: payout.heroNet,
      treasuryTax: payout.treasuryTax,
      treasuryTaxRate: payout.treasuryTaxRate,
      guildTax: payout.guildTax,
      guildTaxRate: payout.guildTaxRate,
      mageGuildId: guildId,
      mageGuildName: guildName,
    }

    transaction.update(requestRef, {
      requests,
      updatedAt: serverTimestampFn(),
    })

    transaction.set(heroRef, { goldBalance: nextHeroBalance, updatedAt: serverTimestampFn() }, { merge: true })
    transaction.set(treasuryRef, { balance: nextTreasuryBalance, updatedAt: serverTimestampFn() }, { merge: true })
    transaction.set(guildRef, { treasure: nextGuildTreasure, updatedAt: serverTimestampFn() }, { merge: true })

    transaction.set(docFn(collectionFn(firestoreDb, 'hero-transactions')), {
      heroId,
      heroName,
      goldAmount: payout.heroNet,
      goods: {},
      type: 'mage-guild-reward',
      comment: `Магічна допомога: ${request.spellName || requestId}. Винагорода ${payout.gross.toFixed(2)} зм, податок острова ${(payout.treasuryTaxRate * 100).toFixed(2)}%: ${payout.treasuryTax.toFixed(2)} зм, частка гільдії ${(payout.guildTaxRate * 100).toFixed(2)}%: ${payout.guildTax.toFixed(2)} зм, герою: ${payout.heroNet.toFixed(2)} зм.`,
      spellRequestId,
      requestId,
      mageGuildId: guildId,
      grossAmount: payout.gross,
      treasuryTaxAmount: payout.treasuryTax,
      treasuryTaxRate: payout.treasuryTaxRate,
      guildTaxAmount: payout.guildTax,
      guildTaxRate: payout.guildTaxRate,
      createdAt: serverTimestampFn(),
    })

    transaction.set(docFn(collectionFn(firestoreDb, 'treasury-transactions')), {
      amount: payout.treasuryTax,
      type: 'mage-guild-tax',
      comment: `Податок із магічної допомоги: ${request.spellName || requestId}, герой ${heroName}.`,
      userId: heroId || 'system',
      nickname: heroName,
      createdAt: serverTimestampFn(),
      balanceAfter: nextTreasuryBalance,
      spellRequestId,
      requestId,
      taxRate: payout.treasuryTaxRate,
      grossAmount: payout.gross,
    })

    transaction.set(docFn(collectionFn(firestoreDb, 'guilds', guildId, 'logs')), {
      amount: payout.guildTax,
      type: 'mage-guild-tax',
      comment: `Частка гільдії з магічної допомоги: ${request.spellName || requestId}, герой ${heroName}.`,
      userNickname: actor.slice(0, 80),
      createdAt: serverTimestampFn(),
      treasureAfter: nextGuildTreasure,
      spellRequestId,
      requestId,
      taxRate: payout.guildTaxRate,
      grossAmount: payout.gross,
    })

    return {
      spellRequestId,
      requestId,
      heroId,
      guildId,
      heroBalanceAfter: nextHeroBalance,
      treasuryBalanceAfter: nextTreasuryBalance,
      guildTreasureAfter: nextGuildTreasure,
      ...payout,
    }
  })
}
