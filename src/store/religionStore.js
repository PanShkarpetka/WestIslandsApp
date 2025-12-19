import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

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

    if (!refValue || !cacheKey) return { name: fallbackLabel, inactive: false }
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    try {
      const snapshot = await getDoc(refValue)
      const data = snapshot.data() || {}
      const result = {
        name: snapshot.exists() ? (data.name || fallbackLabel) : fallbackLabel,
        inactive: Boolean(data.inactive),
      }

      cache.set(cacheKey, result)
      return result
    } catch (err) {
      console.error('[religion] Failed to resolve hero for', cacheKey, err)
      return { name: fallbackLabel, inactive: false }
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
        const [hero, religionName] = await Promise.all([
          resolveHero(data.hero, heroCache, 'Невідомий герой'),
          resolveName(data.religion, religionCache, 'Невідома релігія'),
        ])
            // [{"id":"Ashkarot","name":"Ашкарот","followers":0},{"id":"Asmodei","name":"Девіл","followers":66},{"id":"Blibdoolpoolp","name":"Блібдулпулп","followers":1},{"id":"Godless","name":"Атеїзм","followers":10},{"id":"Istishia","name":"Істишія","followers":1},{"id":"Panzuriel","name":"Панцуріель","followers":5},{"id":"Umberlee","name":"Амберлі","followers":27},{"id":"Unknown","name":"Не визначено","followers":86},{"id":"quadro","name":"Четвірка","followers":37},{"id":"test","name":"test religion","followers":12},{"id":"trio","name":"Трійка","followers":130}]

        if (hero.inactive) return null

        return {
          id: docSnap.id,
          heroName: hero.name,
          religion: data.religion,
          religionName,
          faith: Number(data.faith ?? 0),
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

    await updateDoc(clergyRef, { faith: increment(amount) })
    await addDoc(collection(clergyRef, 'logs'), {
      delta: amount,
      message: message || '',
      user,
      createdAt: serverTimestamp(),
    })
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
  }
})
