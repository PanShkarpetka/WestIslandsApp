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
import { db } from '@/services/firebase'
import {
  applySpellPriceDelta,
  buildSpellRequestDrafts,
  getSpellLevel,
  getSpellName,
  getSpellPrice,
  getSpellTier,
  normalizeSpellLevel,
} from '@/utils/mageGuildRequests'

const SPELL_REQUEST_CONFIG_ID = 'spell-request-prices'
const HERO_COLLECTION = 'heroes'

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
  return Number(data.population ?? data.populationCount ?? data.people ?? 0) || 0
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
  const q = query(collection(db, 'spellRequests'), orderBy('createdAt', 'desc'))
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
    getDocs(collection(db, 'spellRequests')),
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

  const spellRequestsRef = collection(db, 'spellRequests')
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
  const requestSnapshot = await getDocs(collection(db, 'spellRequests'))
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
  telegramPostUrl,
  actorName,
}) {
  if (!spellRequestId) throw new Error('Не вказано документ із заявками.')
  if (!requestId) throw new Error('Не вказано заявку.')
  if (!heroId) throw new Error('Оберіть героя.')

  const requestRef = doc(db, 'spellRequests', spellRequestId)
  const heroRef = doc(db, HERO_COLLECTION, heroId)

  await runTransaction(db, async (transaction) => {
    const [requestSnap, heroSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(heroRef),
    ])

    if (!requestSnap.exists()) {
      throw new Error('Документ із заявками не знайдено.')
    }

    if (!heroSnap.exists()) {
      throw new Error('Героя не знайдено.')
    }

    const data = requestSnap.data() || {}
    const heroData = heroSnap.data() || {}
    const requests = Array.isArray(data.requests) ? [...data.requests] : []
    const requestIndex = requests.findIndex((item) => (item.localId || item.id) === requestId)

    if (requestIndex === -1) {
      throw new Error('Заявку не знайдено.')
    }

    if (requests[requestIndex].fulfilled) {
      throw new Error('Заявка вже виконана.')
    }

    requests[requestIndex] = {
      ...requests[requestIndex],
      fulfilled: true,
      fulfilledAt: new Date().toISOString(),
      fulfilledByHeroId: heroId,
      fulfilledByHeroName: resolveHeroName(heroData, heroId),
      fulfilledByHeroRefPath: heroRef.path,
      telegramPostUrl: telegramPostUrl?.trim() || '',
      updatedBy: actorName || 'Адміністратор',
    }

    transaction.update(requestRef, {
      requests,
      updatedAt: serverTimestamp(),
    })
  })
}
