<template>
  <div class="buildings-page">
    <div class="map-frame">
      <div class="island-map-wrap">
        <div class="island-map">
          <img class="map-img" :src="islandImg" alt="Острів" />

          <button
            v-for="pin in pins"
            :key="pin.id"
            class="building-pin"
            :class="{ built: isBuilt(pin.id) }"
            :style="{ top: pin.top + 'px', left: pin.left + 'px', transform: pin.flipX ? 'scaleX(-1)' : undefined }"
            @click="openBuilding(pin.id)"
          >
            <img :src="`/images/buildings/${pin.id}.png`" :alt="buildingName(pin.id)" />
            <span class="pin-glow" />
            <span v-if="hasUpcomingYields(pin.id)" class="pin-yield-badge" title="Є запланований врожай">
              <v-icon size="10">mdi-sprout</v-icon>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Yield buildings section -->
    <div class="yield-buildings-section">
      <div class="yield-buildings-header">
        <div class="yield-buildings-title">
          <v-icon size="16" class="mr-1" color="#c8962a">mdi-sprout</v-icon>
          Будівлі-постачальники
        </div>
        <v-btn
          v-if="isAdmin"
          size="small"
          variant="tonal"
          prepend-icon="mdi-plus"
          class="add-yield-btn"
          @click="showAddYieldDialog = true"
        >
          Додати
        </v-btn>
      </div>

      <div v-if="islandYieldBuildings.length" class="yield-buildings-list">
        <div
          v-for="yb in islandYieldBuildings"
          :key="yb.key"
          class="yield-building-card"
          @click="openYieldBuilding(yb.key)"
        >
          <div class="yield-building-icon">
            <v-icon size="22" color="#c8962a">mdi-sprout</v-icon>
          </div>
          <div class="yield-building-info">
            <div class="yield-building-name">{{ yb.name }}</div>
            <div v-if="yb.nextHarvest" class="yield-building-next">
              Наст. врожай: <span class="wi-gold-text">{{ yb.nextHarvest }}</span>
            </div>
            <div v-else class="yield-building-next wi-muted-text">Немає запланованих подій</div>
          </div>
          <v-icon size="16" class="yield-building-chevron">mdi-chevron-right</v-icon>
        </div>
      </div>
      <div v-else class="yield-buildings-empty">
        Будівлі-постачальники відсутні
      </div>
    </div>
  </div>

  <IslandBuildingDialog
    v-if="activeKey"
    v-model="showDialog"
    :building-key="activeKey"
    :nickname="auth.nickname"
    :is-admin="isAdmin"
    :current-cycle-id="currentCycleId"
    :current-cycle-start-date="currentCycleStartDate"
  />

  <YieldBuildingDialog
    v-if="activeYieldKey"
    v-model="showYieldDialog"
    :building-key="activeYieldKey"
    :is-admin="isAdmin"
    :current-cycle-start-date="currentCycleStartDate"
  />

  <!-- Add yield building dialog -->
  <v-dialog v-model="showAddYieldDialog" max-width="400">
    <v-card class="add-yield-card">
      <div class="add-yield-card-header">
        <span class="wi-heading">Додати будівлю-постачальника</span>
      </div>
      <v-card-text>
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
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-btn variant="text" @click="showAddYieldDialog = false">Скасувати</v-btn>
        <v-spacer />
        <v-btn color="primary" :loading="addingYield" @click="addYieldBuildingToIsland">Додати</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useIslandStore } from '@/store/islandStore'
import { useBuildingStore } from '@/store/buildingStore'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useUserStore } from '@/store/userStore.js'
import { useYieldBuildingStore } from '@/store/yieldBuildingStore'
import IslandBuildingDialog from '@/components/IslandBuildingDialog.vue'
import YieldBuildingDialog from '@/components/YieldBuildingDialog.vue'
import { storeToRefs } from 'pinia'
import { DEFAULT_ISLAND_ID } from '@/config/constants.js'
import { parseFaerunDate } from '@/utils/faerun-date.js'
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

const islandImg = `/images/island/${DEFAULT_ISLAND_ID}.jpg`
const pins = [
  { id: 'arcaneStudy',   top: 307, left:  73 },
  { id: 'armory',        top: 280, left: 480 },
  { id: 'barracks',      top: 377, left: 508 },
  { id: 'farm',          top: 412, left: 286 },
  { id: 'garden',        top: 335, left: 294 },
  { id: 'harbor',        top: 315, left: 749 },
  { id: 'houses',        top: 479, left: 503 },
  { id: 'library',       top: 350, left: 200 },
  { id: 'lighthouse',    top: 188, left: 729 },
  { id: 'mill',          top: 457, left: 319 },
  { id: 'pirs',          top: 655, left: 395 },
  { id: 'portCrane',     top: 597, left: 114, flipX: true },
  { id: 'sanctuary',     top: 321, left: 586 },
  { id: 'sawmill',       top: 217, left: 548 },
  { id: 'shipyardBig',   top: 624, left: 224, flipX: true },
  { id: 'shipyardSmall', top: 612, left: 301 },
  { id: 'stonecutter',   top: 204, left: 336 },
  { id: 'storehouse',    top: 127, left: 331 },
  { id: 'tavern',        top: 500, left: 420 },
  { id: 'townhouse',     top: 377, left: 377 },
  { id: 'workshop',      top: 153, left: 465 },
]

const islandStore = useIslandStore()
const buildingStore = useBuildingStore()
const donationStore = useDonationGoalStore()
const yieldBuildingStore = useYieldBuildingStore()
const auth = useUserStore()
const { data: island } = storeToRefs(islandStore)
const isAdmin = computed(() => auth?.isAdmin ?? false)

const currentCycleStartDate = ref(null)
const currentCycleId = ref(null)

onMounted(async () => {
  islandStore.subscribe()
  buildingStore.subscribe()
  donationStore.subscribeToGoals?.()
  yieldBuildingStore.subscribe()

  // Load current cycle start for built-at date default
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
  buildingStore.stop()
  donationStore.stop?.()
  yieldBuildingStore.stop()
})

const showDialog = ref(false)
const activeKey = ref(null)
const showYieldDialog = ref(false)
const activeYieldKey = ref(null)
const showAddYieldDialog = ref(false)
const selectedYieldBuildingId = ref(null)
const addYieldError = ref('')
const addingYield = ref(false)

const builtMap = computed(() => ({ ...(island.value?.buildings || {}) }))

function isBuilt(key) { return !!builtMap.value[key]?.built }
function buildingName(key) { return buildingStore.byId.get(key)?.name || key }
function openBuilding(key) { activeKey.value = key; showDialog.value = true }
function openYieldBuilding(key) { activeYieldKey.value = key; showYieldDialog.value = true }

function hasUpcomingYields(buildingKey) {
  const entry = builtMap.value[buildingKey]
  if (!entry?.built || !Array.isArray(entry.yields)) return false
  return entry.yields.some(y => !y.processed)
}

// Yield buildings installed on this island
const islandYieldBuildings = computed(() => {
  const buildings = island.value?.buildings || {}
  const result = []
  for (const [key, entry] of Object.entries(buildings)) {
    if (!key.startsWith('yield_') || !entry.yieldBuildingId) continue
    const ybDef = yieldBuildingStore.byId.get(entry.yieldBuildingId)
    const name = ybDef?.name || entry.name || key
    const yields = Array.isArray(entry.yields) ? entry.yields : []
    const nextPending = yields
      .filter(y => !y.processed && y.date)
      .sort((a, b) => {
        const pa = parseFaerunDate(a.date), pb = parseFaerunDate(b.date)
        if (!pa || !pb) return 0
        return (pa.year * 360 + pa.month * 30 + pa.day) - (pb.year * 360 + pb.month * 30 + pb.day)
      })[0]
    result.push({ key, name, yieldBuildingId: entry.yieldBuildingId, nextHarvest: nextPending?.date || null })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'))
})

// For the "add" dropdown — exclude already-installed ones
const availableYieldBuildingsForSelect = computed(() => {
  const installedIds = new Set(islandYieldBuildings.value.map(yb => yb.yieldBuildingId))
  return yieldBuildingStore.yieldBuildings.filter(yb => !installedIds.has(yb.id))
})

async function addYieldBuildingToIsland() {
  addYieldError.value = ''
  if (!selectedYieldBuildingId.value) { addYieldError.value = 'Оберіть будівлю.'; return }
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
</script>

<style scoped>
.buildings-page {
  padding-bottom: 16px;
}

/* ── Map frame ──────────────────────────────────────────────── */
.map-frame {
  border: 2px solid var(--wi-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 6px 32px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.3);
  background: #0a1a10;
}

.island-map-wrap {
  overflow: auto;
  display: flex;
  justify-content: center;
}

.island-map {
  position: relative;
  width: 800px;
  flex-shrink: 0;
}

.map-img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0;
  filter: sepia(15%) contrast(105%) brightness(92%);
}

/* ── Building pins ──────────────────────────────────────────── */
.building-pin {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 6px;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background: rgba(30, 20, 10, 0.55);
  border: 2px solid rgba(90, 62, 32, 0.5);
  opacity: 0.55;
  filter: grayscale(60%) brightness(0.7);
}

.building-pin img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.building-pin.built {
  opacity: 1;
  filter: none;
  background: rgba(20, 12, 4, 0.4);
  border: 2px solid rgba(200, 150, 42, 0.6);
  box-shadow: 0 0 10px rgba(200, 150, 42, 0.3), 0 0 4px rgba(200, 150, 42, 0.2);
}

.building-pin:hover {
  transform: scale(2.1);
  z-index: 10;
  border-color: var(--wi-gold) !important;
  box-shadow: 0 0 16px rgba(200, 150, 42, 0.6), 0 4px 12px rgba(0,0,0,0.6) !important;
  filter: none !important;
  opacity: 1 !important;
}

.building-pin.built .pin-glow {
  position: absolute;
  inset: -4px;
  border-radius: 8px;
  border: 1px solid rgba(200, 150, 42, 0.2);
  animation: lantern-pulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes lantern-pulse {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.8; }
}

/* Yield badge on pins */
.pin-yield-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: var(--wi-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #1a1209;
  z-index: 2;
}

/* ── Yield buildings section ────────────────────────────────── */
.yield-buildings-section {
  margin-top: 20px;
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  background: rgba(44, 30, 15, 0.4);
  overflow: hidden;
}

.yield-buildings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.4);
  background: rgba(0, 0, 0, 0.2);
}

.yield-buildings-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.add-yield-btn {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.7rem !important;
  letter-spacing: 0.05em !important;
  color: var(--wi-gold) !important;
  border-color: rgba(200, 150, 42, 0.3) !important;
}

.yield-buildings-list {
  display: flex;
  flex-direction: column;
}

.yield-building-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.25);
  cursor: pointer;
  transition: background 0.15s ease;
}

.yield-building-card:last-child { border-bottom: none; }
.yield-building-card:hover { background: rgba(200, 150, 42, 0.05); }

.yield-building-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 6px;
  background: rgba(200, 150, 42, 0.08);
  border: 1px solid rgba(200, 150, 42, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.yield-building-info { flex: 1; min-width: 0; }

.yield-building-name {
  font-family: var(--wi-font-heading);
  font-size: 0.9rem;
  color: var(--wi-text);
  letter-spacing: 0.02em;
}

.yield-building-next {
  font-size: 0.78rem;
  margin-top: 2px;
}

.yield-building-chevron { color: var(--wi-border) !important; flex-shrink: 0; }

.yield-buildings-empty {
  padding: 20px 16px;
  font-size: 0.85rem;
  color: var(--wi-text-muted);
  font-style: italic;
  text-align: center;
}

/* Add yield dialog */
.add-yield-card {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.add-yield-card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
}
</style>
