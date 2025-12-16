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
  const loading = ref(false)
  const error = ref('')
  const logsByClergy = ref({})
  const logsLoading = ref(false)
  const logsError = ref('')
  let unsubscribe = null
  const logUnsubscribes = new Map()

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

  function startListening() {
    stopListening()
    loading.value = true
    error.value = ''

    const colRef = collection(db, 'clergy')
    const heroCache = new Map()
    const religionCache = new Map()

    unsubscribe = onSnapshot(colRef, (snapshot) => {
      const tasks = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() || {}
        const [heroName, religionName] = await Promise.all([
          resolveName(data.hero, heroCache, 'Невідомий герой'),
          resolveName(data.religion, religionCache, 'Невідома релігія'),
        ])

        return {
          id: docSnap.id,
          heroName,
          religionName,
          faith: Number(data.faith ?? 0),
        }
      })

      Promise.all(tasks)
        .then((result) => {
          records.value = result
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
