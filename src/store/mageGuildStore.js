import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  ensureCurrentCycleSpellRequests,
  fulfillSpellRequest,
  subscribeHeroes,
  subscribeSpellRequests,
} from '@/services/mageGuildService'

export const useMageGuildStore = defineStore('mageGuild', () => {
  const requestDocuments = ref([])
  const heroes = ref([])
  const loading = ref(false)
  const error = ref('')
  const heroesLoading = ref(false)
  const heroesError = ref('')
  const actionLoading = ref(false)
  const actionError = ref('')
  const syncLoading = ref(false)
  const syncError = ref('')

  let stopRequests = null
  let stopHeroes = null

  const productionDocuments = computed(() => requestDocuments.value.filter((item) => !item.isTest))
  const latestRequestDocument = computed(() => productionDocuments.value[0] || null)
  const latestRequests = computed(() => latestRequestDocument.value?.requests || [])
  const fulfilledCount = computed(() => latestRequests.value.filter((item) => item.fulfilled).length)
  const openCount = computed(() => latestRequests.value.filter((item) => !item.fulfilled).length)

  function startListening() {
    stopListening()
    loading.value = true
    error.value = ''
    heroesLoading.value = true
    heroesError.value = ''

    stopRequests = subscribeSpellRequests((docs) => {
      requestDocuments.value = docs
      loading.value = false
    }, (err) => {
      console.error('[mageGuild] Failed to subscribe requests', err)
      error.value = 'Не вдалося завантажити заявки гільдії магів.'
      loading.value = false
    })

    stopHeroes = subscribeHeroes((items) => {
      heroes.value = items
      heroesLoading.value = false
    }, (err) => {
      console.error('[mageGuild] Failed to subscribe heroes', err)
      heroesError.value = 'Не вдалося завантажити список героїв.'
      heroesLoading.value = false
    })
  }

  function stopListening() {
    if (stopRequests) {
      stopRequests()
      stopRequests = null
    }

    if (stopHeroes) {
      stopHeroes()
      stopHeroes = null
    }
  }

  async function markFulfilled(payload) {
    actionLoading.value = true
    actionError.value = ''

    try {
      await fulfillSpellRequest(payload)
    } catch (err) {
      console.error('[mageGuild] Failed to fulfill request', err)
      actionError.value = err?.message || 'Не вдалося позначити заявку як виконану.'
      throw err
    } finally {
      actionLoading.value = false
    }
  }

  async function ensureCurrentCycleRequests(payload) {
    syncLoading.value = true
    syncError.value = ''

    try {
      return await ensureCurrentCycleSpellRequests(payload)
    } catch (err) {
      console.error('[mageGuild] Failed to ensure current cycle requests', err)
      syncError.value = err?.message || 'Не вдалося підготувати заявки поточного циклу.'
      throw err
    } finally {
      syncLoading.value = false
    }
  }

  return {
    requestDocuments,
    productionDocuments,
    heroes,
    loading,
    error,
    heroesLoading,
    heroesError,
    actionLoading,
    actionError,
    syncLoading,
    syncError,
    latestRequestDocument,
    latestRequests,
    fulfilledCount,
    openCount,
    startListening,
    stopListening,
    markFulfilled,
    ensureCurrentCycleRequests,
  }
})
