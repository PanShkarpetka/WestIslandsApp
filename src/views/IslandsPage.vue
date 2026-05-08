<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Острів Камінь</h1>
      </v-col>
    </v-row>

    <div class="p-6">
      <!-- MATERIAL TABS -->
      <nav class="tabs-md mb-2">
        <div class="tabs-row">
          <!-- Інфо -->
          <RouterLink :to="`/islands/${islandName}`" custom v-slot="{ href, navigate, isExactActive }">
            <a :href="href"
               @click="navigate"
               class="tab"
               :data-active="isExactActive"
               :aria-current="isExactActive ? 'page' : null"
            >ℹ️ Інфо</a>
          </RouterLink>

          <!-- Будівлі -->
          <RouterLink :to="`/islands/${islandName}/buildings`" custom v-slot="{ href, navigate, isExactActive }">
            <a :href="href"
               @click="navigate"
               class="tab"
               :data-active="isExactActive"
               :aria-current="isExactActive ? 'page' : null"
            >🏗️ Будівлі</a>
          </RouterLink>

          <!-- Населення -->
          <RouterLink :to="`/islands/${islandName}/population`" custom v-slot="{ href, navigate, isExactActive }">
            <a :href="href"
               @click="navigate"
               class="tab"
               :data-active="isExactActive"
               :aria-current="isExactActive ? 'page' : null"
            >👥 Населення</a>
          </RouterLink>

          <!-- Казна -->
          <RouterLink :to="`/islands/${islandName}/treasury`" custom v-slot="{ href, navigate, isExactActive }">
            <a :href="href"
               @click="navigate"
               class="tab"
               :data-active="isExactActive"
               :aria-current="isExactActive ? 'page' : null"
            >🪙 Скарбниця</a>
          </RouterLink>

          <!-- Мануфактури -->
          <RouterLink :to="`/islands/${islandName}/manufactures`" custom v-slot="{ href, navigate, isExactActive }">
            <a :href="href"
               @click="navigate"
               class="tab"
               :data-active="isExactActive"
               :aria-current="isExactActive ? 'page' : null"
            >🏭 Мануфактури</a>
          </RouterLink>
        </div>
      </nav>

      <section class="pt-2">
        <RouterView />
      </section>
    </div>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useIslandStore } from '@/store/islandStore'
import { useBuildingStore } from '@/store/buildingStore'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useUserStore } from '@/store/userStore.js'

const islandName = 'Камінь'
const islandStore = useIslandStore()
const buildingStore = useBuildingStore()
const donationStore = useDonationGoalStore()
const auth = useUserStore()

const { data: island } = storeToRefs(islandStore)
const isAdmin = computed(() => auth?.isAdmin ?? false)

onMounted(() => {
  islandStore.subscribe()
  buildingStore.subscribe()
  donationStore.subscribeToGoals?.() // існуючий listener для донатів
})
onUnmounted(() => {
  islandStore.stop()
  buildingStore.stop()
  donationStore.stop?.()
})

/* -------- заголовок + знижка -------- */

/* -------- форма редагування острова -------- */

/* -------- інтеракція з мапою -------- */

</script>

<style scoped>
.tabs-md {
  border-bottom: 1px solid #e5e7eb; /* gray-200 */
}

/* Горизонтальний ряд (без <ul>/<li>) */
.tabs-row {
  display: flex;
  gap: 12px;
}

/* Базовий вигляд таба */
.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  padding: .75rem 1rem;            /* py-3 px-4 */
  text-decoration: none;           /* прибрати синє підкреслення */
  color: #6b7280;                  /* gray-600 */
  font: 500 0.875rem/1.25rem system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  letter-spacing: .02em;           /* легкий tracking */
  text-transform: uppercase;
  transition: color .2s ease;
}

.tab:hover { color: #111827; }     /* gray-900 */

/* Активний таб */
.tab[data-active="true"] {
  color: #2563eb;                  /* blue-600 */
  font-weight: 600;
}

/* Індикатор під активним табом */
.tab::after {
  content: "";
  position: absolute;
  left: 12px;                      /* вирівняти з текстом */
  right: 12px;
  bottom: -1px;
  height: 2px;
  background: transparent;
  border-radius: 9999px;
  transition: background-color .2s ease;
}
.tab[data-active="true"]::after {
  background: #2563eb;             /* blue-600 */
}

/* Доступність: фокус */
.tab:focus-visible {
  outline: 2px solid #93c5fd;      /* blue-300 */
  outline-offset: 2px;
  border-radius: 8px;
}
</style>
