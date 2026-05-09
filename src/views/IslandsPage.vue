<template>
  <v-container class="island-container">

    <!-- Island heading -->
    <div class="island-heading">
      <v-icon class="mr-2" color="primary">mdi-island</v-icon>
      <h1 class="wi-heading">Острів Камінь</h1>
    </div>

    <!-- Plank tab bar -->
    <nav class="plank-tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        custom
        v-slot="{ href, navigate, isExactActive }"
      >
        <a
          :href="href"
          @click="navigate"
          class="plank-tab"
          :class="{ 'plank-tab--active': isExactActive }"
          :aria-current="isExactActive ? 'page' : null"
        >
          <v-icon size="15" class="plank-tab-icon">{{ tab.icon }}</v-icon>
          <span>{{ tab.label }}</span>
        </a>
      </RouterLink>
    </nav>

    <section class="island-content">
      <RouterView />
    </section>

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

const tabs = [
  { to: `/islands/${islandName}`,              icon: 'mdi-information-outline', label: 'Інфо' },
  { to: `/islands/${islandName}/buildings`,    icon: 'mdi-chess-rook',          label: 'Будівлі' },
  { to: `/islands/${islandName}/population`,   icon: 'mdi-account-group',       label: 'Населення' },
  { to: `/islands/${islandName}/treasury`,     icon: 'mdi-treasure-chest',      label: 'Скарбниця' },
  { to: `/islands/${islandName}/manufactures`, icon: 'mdi-factory',             label: 'Мануфактури' },
]

const islandStore = useIslandStore()
const buildingStore = useBuildingStore()
const donationStore = useDonationGoalStore()
const auth = useUserStore()
const { data: island } = storeToRefs(islandStore)
const isAdmin = computed(() => auth?.isAdmin ?? false)

onMounted(() => {
  islandStore.subscribe()
  buildingStore.subscribe()
  donationStore.subscribeToGoals?.()
})
onUnmounted(() => {
  islandStore.stop()
  buildingStore.stop()
  donationStore.stop?.()
})
</script>

<style scoped>
.island-container {
  padding-top: 20px;
}

/* ── Island heading ─────────────────────────────────────────── */
.island-heading {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

/* ── Plank tabs ─────────────────────────────────────────────── */
.plank-tabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  border-bottom: 2px solid var(--wi-border);
  margin-bottom: 0;
}

.plank-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  text-decoration: none;
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  background: linear-gradient(180deg, #1a1108 0%, #150e05 100%);
  border: 1px solid var(--wi-border);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  transition: color 0.2s, background 0.2s;
  cursor: pointer;
  white-space: nowrap;
}

.plank-tab:hover {
  color: var(--wi-text);
  background: linear-gradient(180deg, #2c1e0f 0%, #1f1508 100%);
}

.plank-tab--active {
  color: var(--wi-gold) !important;
  background: linear-gradient(180deg, #3d2a14 0%, #2c1e0f 100%) !important;
  border-color: var(--wi-gold) !important;
  border-bottom: 2px solid var(--wi-surface) !important;
  margin-bottom: -2px;
  z-index: 1;
}

.plank-tab-icon {
  color: inherit !important;
  opacity: 0.8;
}

.plank-tab--active .plank-tab-icon {
  opacity: 1;
}

/* ── Content ────────────────────────────────────────────────── */
.island-content {
  padding-top: 20px;
}

/* ── Mobile ─────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .plank-tab {
    padding: 8px 10px;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
  }
}
</style>
