import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

export const DEFAULT_VALUES = {
  farmBase: 10,
  farmDCBase: 10,
  minSpreadFollowersResult: 5,
  shieldBonus: 0,
  svBase: 10,
  svTemp: 0,
};

export const BUILDING_LEVEL_BONUSES = {
  none: {
    svBonus: 0,
    passiveFaith: 0,
  },
  chapel: {
    svBonus: 1,
    passiveFaith: 10,
  },
  temple:  {
    svBonus: 2,
    passiveFaith: 20,
  },
  cathedral: {
    svBonus: 3,
    passiveFaith: 30,
  },
}

function getTempSV(data) {
  const svTemp = Number(data.svTemp ?? DEFAULT_VALUES.svTemp)
  const buildingBonus = Number(data.buildingLevel ? BUILDING_LEVEL_BONUSES[data.buildingLevel].svBonus : 0);

  return svTemp + buildingBonus;
}

export const useReligionStore = defineStore('religion', () => {
  const records = ref([])
  const religions = ref([])
  const loading = ref(false)
  const error = ref('')
  const logsByClergy = ref({})
  const logsLoading = ref(false)
  const logsError = ref('')
  let unsubscribe = null
  const logUnsubscribes = new Map()
  let religionUnsubscribe = null

  function stopLogs(clergyId) {
    const stop = logUnsubscribes.get(clergyId)
    if (stop) {
      stop()
      logUnsubscribes.delete(clergyId)
    }
  }

  function stopAllLogs() {
    for (const key of [...logUnsubscribes.keys()]) {
      stopLogs(key)
    }
  }

  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    if (religionUnsubscribe) {
      religionUnsubscribe()
      religionUnsubscribe = null
    }
    stopAllLogs()
  }

  async function resolveName(refValue, cache, fallbackLabel) {
    const cacheKey = refValue?.path

    if (!refValue || !cacheKey) return fallbackLabel
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    try {
      const snapshot = await getDoc(refValue)
      const name = snapshot.exists() ? (snapshot.data()?.name || fallbackLabel) : fallbackLabel
      cache.set(cacheKey, name)
      return name
    } catch (err) {
      console.error('[religion] Failed to resolve name for', cacheKey, err)
      return fallbackLabel
    }
  }

  async function resolveHero(refValue, cache, fallbackLabel) {
    const cacheKey = refValue?.path

    if (!refValue || !cacheKey) {
      return { name: fallbackLabel, inactive: false, downtimeAvailable: true, ref: null }
    }
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    try {
      const snapshot = await getDoc(refValue)
      const data = snapshot.data() || {}
      const result = {
        name: snapshot.exists() ? (data.name || fallbackLabel) : fallbackLabel,
        inactive: Boolean(data.inactive),
        downtimeAvailable: data.downtimeAvailable,
        ref: doc(db, snapshot.ref.path),
      }

      cache.set(cacheKey, result)
      return result
    } catch (err) {
      console.error('[religion] Failed to resolve hero for', cacheKey, err)
      return { name: fallbackLabel, inactive: false, downtimeAvailable: true, ref: null }
    }
  }

  function startListening() {
    stopListening()
    loading.value = true
    error.value = ''

    const colRef = collection(db, 'clergy')
    const religionsRef = collection(db, 'religions')
    const heroCache = new Map()
    const religionCache = new Map()

    unsubscribe = onSnapshot(colRef, (snapshot) => {
      const tasks = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() || {}
        const heroRef = data.hero?.path ? doc(db, data.hero.path) : data.hero
        const religionRef = data.religion?.path ? doc(db, data.religion.path) : data.religion
        const [hero, religionName] = await Promise.all([
          resolveHero(heroRef, heroCache, 'Невідомий герой'),
          resolveName(religionRef, religionCache, 'Невідома релігія'),
        ])
            // [{"id":"Ashkarot","name":"Ашкарот","followers":0},{"id":"Asmodei","name":"Девіл","followers":66},{"id":"Blibdoolpoolp","name":"Блібдулпулп","followers":1},{"id":"Godless","name":"Атеїзм","followers":10},{"id":"Istishia","name":"Істишія","followers":1},{"id":"Panzuriel","name":"Панцуріель","followers":5},{"id":"Umberlee","name":"Амберлі","followers":27},{"id":"Unknown","name":"Не визначено","followers":86},{"id":"quadro","name":"Четвірка","followers":37},{"id":"test","name":"test religion","followers":12},{"id":"trio","name":"Трійка","followers":130}]

        if (hero.inactive) return null

        return {
          id: docSnap.id,
          heroName: hero.name,
          religion: religionRef,
          religionName,
          faith: Number(data.faith ?? 0),
          faithMax: Number(data.faithMax ?? 0),
          downtimeAvailable: hero.downtimeAvailable,
          heroRef: hero.ref,
        }
      })

      Promise.all(tasks)
        .then((result) => {
          records.value = result.filter(Boolean)
          loading.value = false
        })
        .catch((err) => {
          console.error('[religion] Failed to prepare records', err)
          error.value = 'Не вдалося обробити дані релігії.'
          loading.value = false
        })
    }, (err) => {
      console.error('[religion] Snapshot error', err)
      error.value = 'Не вдалося завантажити дані релігії.'
      loading.value = false
    })

    religionUnsubscribe = onSnapshot(religionsRef, (snapshot) => {
      religions.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {}
        return {
          id: docSnap.id,
          name: data.name || 'Невідома релігія',
          followers: Number(data.followers ?? 0),
          buildingLevel: data.buildingLevel || '—',
          buildingFaithIncome: data.buildingLevel ? BUILDING_LEVEL_BONUSES[data.buildingLevel].passiveFaith : 0,
          buildingUpdatedAt: data.buildingUpdatedAt || null,
          farmBase: Number(data.farmBase ?? DEFAULT_VALUES.farmBase),
          farmDCBase: Number(data.farmDCBase ?? DEFAULT_VALUES.farmDCBase),
          minSpreadFollowersResult: Number(data.minSpreadFollowers ?? DEFAULT_VALUES.minSpreadFollowersResult),
          shieldActive: Boolean(data.shieldActive),
          shieldBonus: Number(data.shieldBonus ?? DEFAULT_VALUES.shieldBonus),
          svBase: Number(data.svBase ?? DEFAULT_VALUES.svBase),
          svTemp: getTempSV(data),
        }
      })
    }, (err) => {
      console.error('[religion] Failed to fetch religions', err)
    })
  }

  function mapLog(logDoc) {
    const data = logDoc.data() || {}
    return {
      id: logDoc.id,
      delta: Number(data.delta ?? 0),
      message: data.message || '',
      user: data.user || 'Невідомо',
      createdAt: data.createdAt?.toDate?.() || null,
    }
  }

  function listenLogs(clergyId) {
    if (!clergyId) return
    stopLogs(clergyId)
    logsLoading.value = true
    logsError.value = ''

    const q = query(collection(db, 'clergy', clergyId, 'logs'), orderBy('createdAt', 'desc'))

    const unsub = onSnapshot(q, (snapshot) => {
      logsByClergy.value = {
        ...logsByClergy.value,
        [clergyId]: snapshot.docs.map(mapLog),
      }
      logsLoading.value = false
    }, (err) => {
      console.error('[religion] Failed to fetch logs', err)
      logsError.value = 'Не вдалося завантажити історію змін.'
      logsLoading.value = false
    })

    logUnsubscribes.set(clergyId, unsub)
  }

  async function changeFaith({ clergyId, delta, message = '', user = 'Невідомо' }) {
    if (!clergyId) throw new Error('Необхідний ідентифікатор духовенства.')
    const amount = Number(delta)
    if (!amount || Number.isNaN(amount)) throw new Error('Некоректна зміна віри.')

    const clergyRef = doc(db, 'clergy', clergyId)

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(clergyRef)
      if (!snapshot.exists()) {
        throw new Error('Духовенство не знайдено.')
      }

      const data = snapshot.data() || {}
      const currentFaith = Number(data.faith ?? 0)
      const currentFaithMax = Number(data.faithMax ?? 0)
      const updatedFaith = currentFaith + amount

      const updates = { faith: updatedFaith }

      if (amount > 0 && updatedFaith > currentFaithMax) {
        updates.faithMax = updatedFaith
      }

      transaction.update(clergyRef, updates)
    })
    await addDoc(collection(clergyRef, 'logs'), {
      delta: amount,
      message: message || '',
      user,
      createdAt: serverTimestamp(),
    })
  }

  function setDowntimeAvailability(clergyId, downtimeAvailable) {
    const index = records.value.findIndex((item) => item.id === clergyId)
    if (index === -1) return

    const updated = { ...records.value[index], downtimeAvailable }
    records.value = [
      ...records.value.slice(0, index),
      updated,
      ...records.value.slice(index + 1),
    ]
  }

  return {
    records,
    loading,
    error,
    religions,
    logsByClergy,
    logsLoading,
    logsError,
    startListening,
    stopListening,
    listenLogs,
    stopLogs,
    changeFaith,
    setDowntimeAvailability,
  }
})
