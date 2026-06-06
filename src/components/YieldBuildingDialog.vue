<template>
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="v => $emit('update:modelValue', v)"
    max-width="560"
    :fullscreen="$vuetify.display.smAndDown"
    scrollable
  >
    <v-card v-if="buildingEntry" class="yield-dialog">

      <!-- Header -->
      <div class="yield-dialog-header">
        <div class="yield-dialog-icon">
          <v-icon size="36" color="#c8962a">mdi-sprout</v-icon>
        </div>
        <div class="yield-dialog-title-block">
          <div class="yield-dialog-name">{{ yieldBuilding?.name || buildingEntry.name || buildingKey }}</div>
          <div v-if="yieldBuilding?.description" class="yield-dialog-desc">{{ yieldBuilding.description }}</div>
          <span class="yield-status-badge">
            <v-icon size="12" class="mr-1">mdi-check-decagram</v-icon>
            Активна будівля
          </span>
        </div>
      </div>

      <v-card-text class="yield-dialog-body">

        <!-- Upcoming harvest info -->
        <div v-if="nextHarvest" class="next-harvest-row">
          <v-icon size="14" class="mr-1" color="#c8962a">mdi-calendar-clock</v-icon>
          <span class="next-harvest-label">Наступний врожай:</span>
          <span class="next-harvest-date">{{ nextHarvest.date }}</span>
          <span class="next-harvest-goods">— {{ nextHarvestGoodsLabel }}</span>
        </div>
        <div v-else class="no-harvest-note">
          Немає запланованих подій.
        </div>

        <BuildingHarvestSection
          :building-key="buildingKey"
          :is-admin="isAdmin"
          :current-cycle-start-date="currentCycleStartDate"
        />

      </v-card-text>

      <v-divider style="border-color: var(--wi-border)" />

      <v-card-actions class="yield-dialog-actions">
        <v-btn variant="text" class="close-btn" @click="$emit('update:modelValue', false)">Закрити</v-btn>
        <v-spacer />
        <v-btn
          v-if="isAdmin"
          class="destroy-btn"
          variant="tonal"
          :loading="removing"
          prepend-icon="mdi-trash-can-outline"
          @click="removeFromIsland"
        >
          Прибрати з острова
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useIslandStore } from '@/store/islandStore'
import { useYieldBuildingStore } from '@/store/yieldBuildingStore'
import { useGoodsStore } from '@/store/goodsStore'
import { parseFaerunDate } from '@/utils/faerun-date.js'
import BuildingHarvestSection from '@/components/BuildingHarvestSection.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  buildingKey: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  currentCycleStartDate: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const islandStore = useIslandStore()
const yieldBuildingStore = useYieldBuildingStore()
const goodsStore = useGoodsStore()

const { data: island } = storeToRefs(islandStore)
const removing = ref(false)

const buildingEntry = computed(() => island.value?.buildings?.[props.buildingKey] || null)
const yieldBuilding = computed(() => {
  const id = buildingEntry.value?.yieldBuildingId
  return id ? yieldBuildingStore.byId.get(id) : null
})

const pendingYields = computed(() => {
  const yields = buildingEntry.value?.yields || []
  return yields
    .filter(y => !y.processed && y.date)
    .sort((a, b) => {
      const pa = parseFaerunDate(a.date), pb = parseFaerunDate(b.date)
      if (!pa || !pb) return 0
      return (pa.year * 360 + pa.month * 30 + pa.day) - (pb.year * 360 + pb.month * 30 + pb.day)
    })
})

const nextHarvest = computed(() => pendingYields.value[0] || null)
const nextHarvestGoodsLabel = computed(() => {
  const goods = nextHarvest.value?.goods || {}
  return Object.entries(goods)
    .map(([gId, amt]) => `${goodsStore.goods.find(g => g.id === gId)?.name || gId}: ${amt}`)
    .join(', ')
})

async function removeFromIsland() {
  if (removing.value) return
  removing.value = true
  try {
    const yieldBuildingId = buildingEntry.value?.yieldBuildingId
    if (yieldBuildingId) await islandStore.removeYieldBuilding(yieldBuildingId)
    emit('update:modelValue', false)
  } finally {
    removing.value = false
  }
}
</script>

<style scoped>
.yield-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.yield-dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--wi-border);
  background: linear-gradient(180deg, #1f1508, #2c1e0f);
}

.yield-dialog-icon {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(200, 150, 42, 0.1);
  border: 1px solid rgba(200, 150, 42, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.yield-dialog-title-block { flex: 1; min-width: 0; }

.yield-dialog-name {
  font-family: var(--wi-font-heading);
  font-size: 1.15rem;
  color: var(--wi-gold);
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.yield-dialog-desc {
  font-size: 0.82rem;
  color: var(--wi-text-muted);
  font-style: italic;
  margin-top: 2px;
  margin-bottom: 4px;
}

.yield-status-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 3px;
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.15);
  border: 1px solid rgba(90, 138, 60, 0.35);
  margin-top: 4px;
}

.yield-dialog-body { padding: 20px !important; }

.next-harvest-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--wi-text);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.next-harvest-label { color: var(--wi-text-muted); font-style: italic; }
.next-harvest-date { font-family: var(--wi-font-heading); color: var(--wi-gold); }
.next-harvest-goods { color: var(--wi-text); }

.no-harvest-note {
  font-size: 0.82rem;
  color: var(--wi-text-muted);
  font-style: italic;
  margin-bottom: 4px;
}

.yield-dialog-actions { padding: 12px 20px !important; }

.close-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.06em !important;
}

.destroy-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  color: var(--wi-danger) !important;
  border-color: rgba(139, 42, 42, 0.5) !important;
}
</style>
