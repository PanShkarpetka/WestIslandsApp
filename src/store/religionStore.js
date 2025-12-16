import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'

export const useReligionStore = defineStore('religion', () => {
  const records = ref([])
  const loading = ref(false)
  const error = ref('')
  let unsubscribe = null

  function stopListening() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
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

  return {
    records,
    loading,
    error,
    startListening,
    stopListening,
  }
})
