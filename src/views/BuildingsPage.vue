<template>
  <v-container class="buildings-page">
    <WiPageHeader
      title="Мапа острова"
      icon="mdi-map"
    >
      <template #actions>
        <WiActionButton
          :href="legendKeeperMapUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          tone="sea"
          prepend-icon="mdi-open-in-new"
        >
          Відкрити мапу
        </WiActionButton>
      </template>
    </WiPageHeader>

    <WiPanel
      class="legendkeeper-panel"
      icon="mdi-map-marker-path"
      flush
    >
      <div class="legendkeeper-frame-wrap">
        <WiEmptyState
          v-if="!mapLoaded"
          class="map-loading-state"
          title="Завантажуємо мапу"
          text="Якщо вбудована мапа не відкриється, скористайтеся кнопкою відкриття у LegendKeeper."
          icon="mdi-map-clock"
        />
        <iframe
          class="legendkeeper-frame"
          :class="{ 'legendkeeper-frame--loaded': mapLoaded }"
          :src="legendKeeperMapUrl"
          title="Мапа острова West Islands у LegendKeeper"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
          @load="mapLoaded = true"
        />
      </div>
    </WiPanel>

    <WiPanel
      class="yield-buildings-section"
      title="Будівлі-постачальники"
      icon="mdi-sprout"
    >
      <template #actions>
        <WiActionButton
          v-if="isAdmin"
          size="small"
          variant="tonal"
          tone="gold"
          prepend-icon="mdi-plus"
          :disabled="yieldBuildingStore.loading"
          @click="showAddYieldDialog = true"
        >
          Додати
        </WiActionButton>
      </template>

      <WiEmptyState
        v-if="yieldBuildingStore.loading || islandStore.loading"
        title="Завантажуємо будівлі-постачальники"
        text="Дані острова та довідник постачальників оновлюються."
        icon="mdi-loading"
      >
        <v-progress-circular indeterminate color="primary" size="24" />
      </WiEmptyState>

      <WiEmptyState
        v-else-if="yieldError"
        title="Не вдалося завантажити будівлі"
        :text="yieldError"
        icon="mdi-alert-circle"
      />

      <div v-else-if="islandYieldBuildings.length" class="yield-buildings-list">
        <button
          v-for="yb in islandYieldBuildings"
          :key="yb.key"
          type="button"
          class="yield-building-card"
          @click="openYieldBuilding(yb.key)"
        >
          <div class="yield-building-icon">
            <v-icon size="22">mdi-sprout</v-icon>
          </div>
          <div class="yield-building-info">
            <div class="yield-building-name">{{ yb.name }}</div>
            <div class="yield-building-meta">
              <span v-if="yb.nextHarvest">Наступний врожай: <b>{{ yb.nextHarvest }}</b></span>
              <span v-else>Немає запланованих подій</span>
              <span>{{ yb.pendingCount }} {{ eventWord(yb.pendingCount) }}</span>
            </div>
          </div>
          <v-icon size="18" class="yield-building-chevron">mdi-chevron-right</v-icon>
        </button>
      </div>

      <WiEmptyState
        v-else
        title="Будівлі-постачальники відсутні"
        text="Додайте постачальника, якщо для острова треба вести заплановані врожаї. Мапа та звичайні будівлі залишаються в LegendKeeper."
        icon="mdi-sprout-outline"
      />
    </WiPanel>
  </v-container>

  <YieldBuildingDialog
    v-if="activeYieldKey"
    v-model="showYieldDialog"
    :building-key="activeYieldKey"
    :is-admin="isAdmin"
    :current-cycle-start-date="currentCycleStartDate"
  />

  <v-dialog v-model="showAddYieldDialog" max-width="420">
    <WiDialogFrame title="Додати будівлю-постачальника" icon="mdi-sprout">
      <v-select
        v-model="selectedYieldBuildingId"
        :items="availableYieldBuildingsForSelect"
        item-title="name"
        item-value="id"
        label="Оберіть будівлю"
        density="comfortable"
        hide-details="auto"
        class="mb-2"
        clearable
      />
      <v-alert v-if="addYieldError" type="error" density="compact" variant="tonal" class="mt-2">{{ addYieldError }}</v-alert>

      <template #actions>
        <v-btn variant="text" @click="showAddYieldDialog = false">Скасувати</v-btn>
        <v-spacer />
        <WiActionButton :loading="addingYield" prepend-icon="mdi-plus" @click="addYieldBuildingToIsland">
          Додати
        </WiActionButton>
      </template>
    </WiDialogFrame>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiDialogFrame from '@/components/ui/WiDialogFrame.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'
import { useIslandStore } from '@/store/islandStore'
import { useUserStore } from '@/store/userStore.js'
import { useYieldBuildingStore } from '@/store/yieldBuildingStore'
import YieldBuildingDialog from '@/components/YieldBuildingDialog.vue'
import { storeToRefs } from 'pinia'
import { parseFaerunDate } from '@/utils/faerun-date.js'
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

const legendKeeperMapUrl = 'https://www.legendkeeper.com/p/cma2mu1j719h60zl9frefc3wl/o3dmcy3m'

const islandStore = useIslandStore()
const yieldBuildingStore = useYieldBuildingStore()
const auth = useUserStore()
const { data: island } = storeToRefs(islandStore)
const isAdmin = computed(() => auth?.isAdmin ?? false)

const currentCycleStartDate = ref(null)
const currentCycleId = ref(null)
const mapLoaded = ref(false)

onMounted(async () => {
  islandStore.subscribe()
  yieldBuildingStore.subscribe()

  try {
    const db = getFirestore()
    const q = query(collection(db, 'cycles'), orderBy('createdAt', 'desc'), limit(1))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const data = snap.docs[0].data()
      if (data.startedAt && !data.finishedAt) currentCycleId.value = snap.docs[0].id
      if (data.startedAt) currentCycleStartDate.value = parseFaerunDate(data.startedAt)
    }
  } catch (e) {
    console.warn('[buildings] Could not load current cycle', e)
  }
})

onUnmounted(() => {
  islandStore.stop()
  yieldBuildingStore.stop()
})

const showYieldDialog = ref(false)
const activeYieldKey = ref(null)
const showAddYieldDialog = ref(false)
const selectedYieldBuildingId = ref(null)
const addYieldError = ref('')
const addingYield = ref(false)

function openYieldBuilding(key) {
  activeYieldKey.value = key
  showYieldDialog.value = true
}

const islandYieldBuildings = computed(() => {
  const buildings = island.value?.buildings || {}
  const result = []
  for (const [key, entry] of Object.entries(buildings)) {
    if (!key.startsWith('yield_') || !entry.yieldBuildingId) continue
    const ybDef = yieldBuildingStore.byId.get(entry.yieldBuildingId)
    const name = ybDef?.name || entry.name || key
    const yields = Array.isArray(entry.yields) ? entry.yields : []
    const pendingCount = yields.filter(y => !y.processed).length
    const nextPending = yields
      .filter(y => !y.processed && y.date)
      .sort((a, b) => {
        const pa = parseFaerunDate(a.date), pb = parseFaerunDate(b.date)
        if (!pa || !pb) return 0
        return (pa.year * 360 + pa.month * 30 + pa.day) - (pb.year * 360 + pb.month * 30 + pb.day)
      })[0]
    result.push({ key, name, yieldBuildingId: entry.yieldBuildingId, nextHarvest: nextPending?.date || null, pendingCount })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'))
})

const yieldError = computed(() => islandStore.error || yieldBuildingStore.error || '')

const availableYieldBuildingsForSelect = computed(() => {
  const installedIds = new Set(islandYieldBuildings.value.map(yb => yb.yieldBuildingId))
  return yieldBuildingStore.yieldBuildings.filter(yb => !installedIds.has(yb.id))
})

async function addYieldBuildingToIsland() {
  addYieldError.value = ''
  if (!selectedYieldBuildingId.value) {
    addYieldError.value = 'Оберіть будівлю.'
    return
  }
  addingYield.value = true
  try {
    const yb = yieldBuildingStore.byId.get(selectedYieldBuildingId.value)
    await islandStore.addYieldBuilding(selectedYieldBuildingId.value, yb?.name || selectedYieldBuildingId.value, { cycleId: currentCycleId.value })
    selectedYieldBuildingId.value = null
    showAddYieldDialog.value = false
  } catch (e) {
    addYieldError.value = 'Помилка додавання.'
    console.error(e)
  } finally {
    addingYield.value = false
  }
}

function eventWord(value) {
  const n = Math.abs(Number(value) || 0)
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'подій'
  if (last === 1) return 'подія'
  if (last >= 2 && last <= 4) return 'події'
  return 'подій'
}
</script>

<style scoped>
.buildings-page {
  padding-top: 24px;
  padding-bottom: 40px;
}

.legendkeeper-panel {
  margin-bottom: 20px;
}

.legendkeeper-frame-wrap {
  position: relative;
  min-height: 620px;
  background: #0a0f0c;
}

.legendkeeper-frame {
  display: block;
  width: 100%;
  height: min(74vh, 820px);
  min-height: 620px;
  border: 0;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.legendkeeper-frame--loaded {
  opacity: 1;
}

.map-loading-state {
  position: absolute;
  inset: 16px;
  z-index: 1;
  min-height: auto;
  background: rgba(16, 21, 18, 0.92);
}

.yield-buildings-list {
  display: grid;
  gap: 10px;
}

.yield-building-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(90, 62, 32, 0.46);
  border-radius: var(--wi-radius-sm);
  background: rgba(12, 8, 4, 0.28);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.yield-building-card:hover {
  border-color: rgba(200, 150, 42, 0.52);
  background: rgba(200, 150, 42, 0.06);
}

.yield-building-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid rgba(200, 150, 42, 0.24);
  border-radius: var(--wi-radius-sm);
  background: rgba(200, 150, 42, 0.09);
  color: var(--wi-gold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.yield-building-info {
  flex: 1;
  min-width: 0;
}

.yield-building-name {
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  font-size: 0.9rem;
  letter-spacing: 0.025em;
}

.yield-building-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 3px;
  color: var(--wi-text-muted);
  font-size: 0.8rem;
}

.yield-building-meta b {
  color: var(--wi-gold-light);
  font-weight: 700;
}

.yield-building-chevron {
  color: var(--wi-border) !important;
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .legendkeeper-frame-wrap,
  .legendkeeper-frame {
    min-height: 520px;
  }

  .yield-building-card {
    align-items: flex-start;
  }
}
</style>
