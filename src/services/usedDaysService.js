import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase.js'

export const RELIGION_ACTION_DAYS = 7

function refId(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.split('/').filter(Boolean).at(-1) || value
  if (value.id) return value.id
  if (value.path) return String(value.path).split('/').filter(Boolean).at(-1) || ''
  if (value.__path) return String(value.__path).split('/').filter(Boolean).at(-1) || ''
  return ''
}

function makeEmptyBreakdown(heroId = '') {
  return {
    heroId,
    craftingDays: 0,
    mageGuildDays: 0,
    religionDays: 0,
    religionActions: 0,
    totalDays: 0,
  }
}

function addToMap(map, heroId, patch) {
  if (!heroId) return
  const current = map.get(heroId) || makeEmptyBreakdown(heroId)
  const next = {
    ...current,
    ...patch,
    craftingDays: current.craftingDays + Number(patch.craftingDays || 0),
    mageGuildDays: current.mageGuildDays + Number(patch.mageGuildDays || 0),
    religionDays: current.religionDays + Number(patch.religionDays || 0),
    religionActions: current.religionActions + Number(patch.religionActions || 0),
  }
  next.totalDays = next.craftingDays + next.mageGuildDays + next.religionDays
  map.set(heroId, next)
}

export function buildUsedDaysByHero({
  heroIds = [],
  craftingLogs = [],
  spellRequestDocuments = [],
  religionActions = [],
  clergyHeroById = new Map(),
} = {}) {
  const result = new Map()
  for (const heroId of heroIds) {
    if (heroId) result.set(heroId, makeEmptyBreakdown(heroId))
  }

  for (const log of craftingLogs || []) {
    addToMap(result, log.heroId, { craftingDays: Number(log.craftDaysSpent || 0) })
  }

  for (const docItem of spellRequestDocuments || []) {
    for (const request of Array.isArray(docItem.requests) ? docItem.requests : []) {
      if (!request?.fulfilled) continue
      addToMap(result, request.fulfilledByHeroId, { mageGuildDays: Number(request.downtimeDays || 0) })
    }
  }

  for (const action of religionActions || []) {
    const actionTypeId = refId(action.actionType)
    if (actionTypeId === 'cycleStart' || actionTypeId === 'religionsDistributionChange') continue

    const heroId = action.heroId || refId(action.hero) || clergyHeroById.get(refId(action.clergy)) || ''
    if (!heroId) continue
    addToMap(result, heroId, { religionDays: RELIGION_ACTION_DAYS, religionActions: 1 })
  }

  return result
}

async function fetchActiveCycleId({
  collectionFn = collection,
  getDocsFn = getDocs,
  queryFn = query,
  orderByFn = orderBy,
  limitFn = limit,
  firestoreDb = db,
} = {}) {
  const snapshot = await getDocsFn(queryFn(collectionFn(firestoreDb, 'cycles'), orderByFn('createdAt', 'desc'), limitFn(10)))
  const active = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
    .find((cycle) => cycle.startedAt && !cycle.finishedAt)
  return active?.id || ''
}

export async function fetchCurrentCycleUsedDays({
  heroIds = [],
  cycleId = '',
  firestoreDb = db,
  collectionFn = collection,
  getDocsFn = getDocs,
  queryFn = query,
  whereFn = where,
  orderByFn = orderBy,
  limitFn = limit,
} = {}) {
  const activeCycleId = cycleId || await fetchActiveCycleId({ collectionFn, getDocsFn, queryFn, orderByFn, limitFn, firestoreDb })
  if (!activeCycleId) return buildUsedDaysByHero({ heroIds })

  const [craftingSnap, spellSnap, religionSnap, clergySnap] = await Promise.all([
    getDocsFn(queryFn(collectionFn(firestoreDb, 'cycle-crafting-logs'), whereFn('cycleId', '==', activeCycleId))),
    getDocsFn(queryFn(collectionFn(firestoreDb, 'spell-requests'), whereFn('cycleId', '==', activeCycleId))),
    getDocsFn(queryFn(collectionFn(firestoreDb, 'religion-actions'), whereFn('cycleId', '==', activeCycleId))),
    getDocsFn(collectionFn(firestoreDb, 'clergy')),
  ])

  const clergyHeroById = new Map(clergySnap.docs.map((docSnap) => [docSnap.id, refId(docSnap.data()?.hero)]))

  return buildUsedDaysByHero({
    heroIds,
    craftingLogs: craftingSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    spellRequestDocuments: spellSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    religionActions: religionSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
    clergyHeroById,
  })
}

export function subscribeCurrentCycleUsedDays({ heroIds = [], cycleId = '' }, callback, onError) {
  let closed = false
  let cycleStop = null
  let dataStops = []
  let subscribedCycleId = ''
  const state = {
    craftingLogs: [],
    spellRequestDocuments: [],
    religionActions: [],
    clergyRows: [],
  }

  function emit() {
    if (closed) return
    const clergyHeroById = new Map(state.clergyRows.map((row) => [row.id, refId(row.hero)]))
    callback(buildUsedDaysByHero({
      heroIds,
      craftingLogs: state.craftingLogs,
      spellRequestDocuments: state.spellRequestDocuments,
      religionActions: state.religionActions,
      clergyHeroById,
    }))
  }

  function stopDataListeners() {
    for (const stop of dataStops) stop?.()
    dataStops = []
  }

  function resetState() {
    state.craftingLogs = []
    state.spellRequestDocuments = []
    state.religionActions = []
    state.clergyRows = []
  }

  function subscribeCycleData(activeCycleId) {
    if (closed || subscribedCycleId === activeCycleId) return

    stopDataListeners()
    resetState()
    subscribedCycleId = activeCycleId || ''

    if (!activeCycleId) {
      callback(buildUsedDaysByHero({ heroIds }))
      return
    }

    dataStops = [
      onSnapshot(query(collection(db, 'cycle-crafting-logs'), where('cycleId', '==', activeCycleId)), (snap) => {
        state.craftingLogs = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        emit()
      }, onError),
      onSnapshot(query(collection(db, 'spell-requests'), where('cycleId', '==', activeCycleId)), (snap) => {
        state.spellRequestDocuments = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        emit()
      }, onError),
      onSnapshot(query(collection(db, 'religion-actions'), where('cycleId', '==', activeCycleId)), (snap) => {
        state.religionActions = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        emit()
      }, onError),
      onSnapshot(collection(db, 'clergy'), (snap) => {
        state.clergyRows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        emit()
      }, onError),
    ]
  }

  function activeCycleIdFromSnapshot(snapshot) {
    const active = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
      .find((item) => item.startedAt && !item.finishedAt)
    return active?.id || ''
  }

  async function start() {
    try {
      if (cycleId) {
        subscribeCycleData(cycleId)
        return
      }

      cycleStop = onSnapshot(query(collection(db, 'cycles'), orderBy('createdAt', 'desc'), limit(10)), (snapshot) => {
        subscribeCycleData(activeCycleIdFromSnapshot(snapshot))
      }, (error) => {
        onError?.(error)
        subscribeCycleData('')
      })
    } catch (error) {
      onError?.(error)
      callback(buildUsedDaysByHero({ heroIds }))
    }
  }

  start()

  return () => {
    closed = true
    cycleStop?.()
    stopDataListeners()
  }
}
