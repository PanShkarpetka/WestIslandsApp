<template>
  <section class="global-cycle-widget">
    <v-container class="py-3">
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-0"
      >
        {{ error }}
      </v-alert>

      <v-skeleton-loader
        v-else-if="loading"
        type="heading, subtitle"
        class="global-cycle-widget__skeleton"
      />

      <CycleSummaryCard
        v-else
        title="Інформація про цикл"
        :current-start-date="currentCycleStartDate"
        :previous-cycle-duration="previousCycleDurationLabel"
        :season="currentSeason"
        :weather="currentWeather"
        :weather-forecast="currentWeatherForecast"
        :can-view-weather-forecast="isAdmin"
      />
    </v-container>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import CycleSummaryCard from '@/components/CycleSummaryCard.vue'
import { db } from '@/services/firebase'
import { useUserStore } from '@/store/userStore'
import { diffInDays, getFaerunSeason, parseFaerunDate } from '@/utils/faerun-date'
import { generateRollingCycleWeatherForecast } from '@/utils/faerun-weather'

const loading = ref(true)
const error = ref('')
const latestCycle = ref(null)
const previousCycle = ref(null)
const now = ref(new Date())
const userStore = useUserStore()
let unsubscribe = null
let clockTimer = null

const currentCycleStartDate = computed(() => latestCycle.value?.startedAt || 'Цикл ще не розпочато')
const currentSeason = computed(() => getFaerunSeason(latestCycle.value?.startedAt))
const currentWeatherForecast = computed(() => {
  const cycle = latestCycle.value
  if (!cycle?.startedAt) return []
  return generateRollingCycleWeatherForecast(cycle, { now: now.value })
})
const currentWeather = computed(() => currentWeatherForecast.value[0] || null)
const isAdmin = computed(() => userStore.isAdmin ?? false)
const previousCycleDurationLabel = computed(() => {
  const startedAt = parseFaerunDate(previousCycle.value?.startedAt)
  const finishedAt = parseFaerunDate(previousCycle.value?.finishedAt)
  const diff = startedAt && finishedAt ? diffInDays(startedAt, finishedAt) : null
  return diff && diff > 0 ? `${diff} днів` : 'невідомо'
})

onMounted(() => {
  error.value = ''
  loading.value = true
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 60000)

  const cyclesQuery = query(collection(db, 'cycles'), orderBy('createdAt', 'desc'), limit(2))
  unsubscribe = onSnapshot(cyclesQuery, (snapshot) => {
    latestCycle.value = snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null
    previousCycle.value = snapshot.docs[1] ? { id: snapshot.docs[1].id, ...snapshot.docs[1].data() } : null
    loading.value = false
  }, () => {
    error.value = 'Не вдалося завантажити дані про цикл.'
    loading.value = false
  })
})

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer)
  unsubscribe?.()
})
</script>

<style scoped>
.global-cycle-widget__skeleton {
  border-radius: 8px;
}
</style>
