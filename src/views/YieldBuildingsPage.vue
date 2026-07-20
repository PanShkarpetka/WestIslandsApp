<template>
  <v-container class="yield-buildings-page">
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
              <template v-if="yb.incomeType === 'owner-action'">
                <span>Дія власника: <b>{{ yb.usesRemaining }} / {{ yb.maxUsesPerCycle }}</b> у циклі</span>
                <span v-if="yb.ownerName">Власник: {{ yb.ownerName }}</span>
              </template>
              <template v-else>
                <span v-if="yb.nextHarvest">Наступний врожай: <b>{{ yb.nextHarvest }}</b></span>
                <span v-else>Немає запланованих подій</span>
                <span>{{ yb.pendingCount }} {{ eventWord(yb.pendingCount) }}</span>
                <span v-if="yb.ownerName">Власник: {{ yb.ownerName }}</span>
              </template>
            </div>
          </div>
          <v-icon size="18" class="yield-building-chevron">mdi-chevron-right</v-icon>
        </button>
      </div>

      <WiEmptyState
        v-else
        title="Будівлі-постачальники відсутні"
        text="Додайте постачальника, якщо для острова треба вести заплановані врожаї."
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
    :current-cycle-id="currentCycleId"
    :current-hero-id="auth.heroId"
    :leader-guild-ids="auth.leaderGuildAccessIds"
    :actor-name="auth.nickname"
  />

  <v-dialog v-model="showAddYieldDialog" max-width="460">
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
      <v-select
        v-if="selectedDefinition?.incomeType === 'owner-action'"
        v-model="selectedOwnerType"
        :items="ownerTypeOptions"
        label="Тип власника"
        density="comfortable"
        hide-details="auto"
        class="mt-3"
        @update:modelValue="selectedOwnerId = null"
      />
      <v-select
        v-if="selectedDefinition?.incomeType === 'owner-action'"
        v-model="selectedOwnerId"
        :items="ownerOptions"
        item-title="name"
        item-value="id"
        :label="selectedOwnerType === 'guild' ? 'Гільдія-власник' : 'Герой-власник'"
        density="comfortable"
        hide-details="auto"
        class="mt-3"
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
import { storeToRefs } from 'pinia'
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import YieldBuildingDialog from '@/components/YieldBuildingDialog.vue'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiDialogFrame from '@/components/ui/WiDialogFrame.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPanel from '@/components/ui/WiPanel.vue'
import { useIslandStore } from '@/store/islandStore'
import { useHeroesStore } from '@/store/heroesStore'
import { useGuildStore } from '@/store/guildStore'
import { useUserStore } from '@/store/userStore.js'
import { useYieldBuildingStore } from '@/store/yieldBuildingStore'
import { parseFaerunDate } from '@/utils/faerun-date.js'

const islandStore = useIslandStore()
const yieldBuildingStore = useYieldBuildingStore()
const heroesStore = useHeroesStore()
const guildStore = useGuildStore()
const auth = useUserStore()
const { data: island } = storeToRefs(islandStore)
const isAdmin = computed(() => auth?.isAdmin ?? false)

const currentCycleStartDate = ref(null)
const currentCycleId = ref(null)
const showYieldDialog = ref(false)
const activeYieldKey = ref(null)
const showAddYieldDialog = ref(false)
const selectedYieldBuildingId = ref(null)
const selectedOwnerType = ref('hero')
const selectedOwnerId = ref(null)
const addYieldError = ref('')
const addingYield = ref(false)

onMounted(async () => {
  yieldBuildingStore.subscribe()
  heroesStore.subscribeHeroes()
  guildStore.subscribeGuilds()

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
    console.warn('[yield-buildings] Could not load current cycle', e)
  }
})

onUnmounted(() => {
  yieldBuildingStore.stop()
  heroesStore.unsubscribeHeroes()
  guildStore.unsubscribeGuilds()
})

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
    const incomeType = ybDef?.incomeType || 'scheduled'
    const maxUsesPerCycle = Math.max(0, Number(ybDef?.maxUsesPerCycle || 0))
    const used = entry.actionUsage?.cycleId === currentCycleId.value ? Number(entry.actionUsage.count || 0) : 0
    const ownerType = entry.ownerType || (entry.ownerGuildId ? 'guild' : 'hero')
    const ownerId = entry.ownerId || entry.ownerGuildId || entry.ownerHeroId || ''
    const ownerName = ownerType === 'guild'
      ? guildStore.guilds.find(guild => guild.id === ownerId)?.name || ownerId
      : heroesStore.heroes.find(hero => hero.id === ownerId)?.name || ownerId
    result.push({
      key,
      name,
      yieldBuildingId: entry.yieldBuildingId,
      nextHarvest: nextPending?.date || null,
      pendingCount,
      incomeType,
      maxUsesPerCycle,
      usesRemaining: Math.max(0, maxUsesPerCycle - used),
      ownerName,
      ownerType,
    })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'))
})

const yieldError = computed(() => islandStore.error || yieldBuildingStore.error || '')

const availableYieldBuildingsForSelect = computed(() => {
  const installedIds = new Set(islandYieldBuildings.value.map(yb => yb.yieldBuildingId))
  return yieldBuildingStore.yieldBuildings.filter(yb => !installedIds.has(yb.id))
})
const selectedDefinition = computed(() => yieldBuildingStore.byId.get(selectedYieldBuildingId.value) || null)
const ownerTypeOptions = [
  { title: 'Герой', value: 'hero' },
  { title: 'Гільдія', value: 'guild' },
]
const ownerOptions = computed(() => selectedOwnerType.value === 'guild'
  ? guildStore.guilds.map(guild => ({ id: guild.id, name: guild.name || guild.id }))
  : heroesStore.heroes.filter(hero => !hero.inactive))

async function addYieldBuildingToIsland() {
  addYieldError.value = ''
  if (!selectedYieldBuildingId.value) {
    addYieldError.value = 'Оберіть будівлю.'
    return
  }
  if (selectedDefinition.value?.incomeType === 'owner-action' && !selectedOwnerId.value) {
    addYieldError.value = 'Оберіть власника будівлі.'
    return
  }
  addingYield.value = true
  try {
    const yb = yieldBuildingStore.byId.get(selectedYieldBuildingId.value)
    await islandStore.addYieldBuilding(selectedYieldBuildingId.value, yb?.name || selectedYieldBuildingId.value, {
      cycleId: currentCycleId.value,
      ownerType: yb?.incomeType === 'owner-action' ? selectedOwnerType.value : null,
      ownerId: yb?.incomeType === 'owner-action' ? selectedOwnerId.value : null,
    })
    selectedYieldBuildingId.value = null
    selectedOwnerType.value = 'hero'
    selectedOwnerId.value = null
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
.yield-buildings-page {
  padding-top: 24px;
  padding-bottom: 40px;
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
  .yield-building-card {
    align-items: flex-start;
  }
}
</style>
