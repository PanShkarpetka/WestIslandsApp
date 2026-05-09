<template>
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="v => $emit('update:modelValue', v)"
    max-width="560"
    :fullscreen="$vuetify.display.smAndDown"
    scrollable
  >
    <v-card v-if="meta" class="building-dialog">

      <!-- Header -->
      <div class="building-dialog-header">
        <div class="building-dialog-img-wrap">
          <img :src="imgSrc" :alt="meta.name" class="building-dialog-img" />
        </div>
        <div class="building-dialog-title-block">
          <div class="building-dialog-name">{{ meta.name }}</div>
          <span class="building-status-badge" :class="statusClass">
            <v-icon size="12" class="mr-1">{{ statusIcon }}</v-icon>
            {{ statusText }}
          </span>
        </div>
      </div>

      <v-card-text class="building-dialog-body">

        <!-- Description -->
        <p v-if="meta.description" class="building-description">{{ meta.description }}</p>

        <div class="building-stats">

          <!-- Cost row -->
          <div class="building-stat-row">
            <span class="building-stat-label">
              <v-icon size="14" class="mr-1">mdi-gold</v-icon>
              Вартість
            </span>
            <span class="building-stat-value wi-number">
              {{ finalCost.toLocaleString('uk-UA') }}
              <span class="building-stat-base" v-if="discount > 0">
                (база: {{ baseCost.toLocaleString('uk-UA') }}, -{{ Math.round(discount * 100) }}%)
              </span>
            </span>
          </div>

          <!-- Population growth -->
          <div v-if="meta.growth" class="building-stat-row">
            <span class="building-stat-label">
              <v-icon size="14" class="mr-1">mdi-account-group</v-icon>
              Приріст населення
            </span>
            <span class="building-stat-value">+{{ meta.growth }}</span>
          </div>

          <!-- Requirements -->
          <div v-if="requirements.length" class="building-stat-row building-stat-requirements">
            <span class="building-stat-label">
              <v-icon size="14" class="mr-1">mdi-lock</v-icon>
              Вимоги
            </span>
            <div class="building-reqs">
              <span
                v-for="req in requirements"
                :key="req.id"
                class="building-req-chip"
                :class="req.met ? 'req-met' : 'req-unmet'"
              >
                <v-icon size="11" class="mr-1">{{ req.met ? 'mdi-check' : 'mdi-close' }}</v-icon>
                {{ req.name }}
              </span>
            </div>
          </div>

          <!-- Population requirement -->
          <div v-if="meta.requiredPopulation" class="building-stat-row">
            <span class="building-stat-label">
              <v-icon size="14" class="mr-1">mdi-account-multiple</v-icon>
              Мін. населення
            </span>
            <span class="building-stat-value" :class="hasReqPopulation ? 'req-ok' : 'req-fail'">
              {{ meta.requiredPopulation }}
              <v-icon size="13" class="ml-1">{{ hasReqPopulation ? 'mdi-check' : 'mdi-close' }}</v-icon>
            </span>
          </div>

        </div>

        <!-- Donation progress -->
        <div v-if="progress" class="building-progress-wrap">
          <div class="building-progress-label">
            <v-icon size="13" class="mr-1">mdi-hand-coin</v-icon>
            Збір коштів
            <span class="building-progress-numbers">
              {{ progress.collected.toLocaleString('uk-UA') }} /
              {{ progress.target.toLocaleString('uk-UA') }} зм
            </span>
          </div>
          <div class="building-progress-bar-wrap">
            <div class="building-progress-bar-fill" :style="{ width: progressPct + '%' }" />
          </div>
          <div class="building-progress-pct">{{ progressPct }}%</div>
        </div>

      </v-card-text>

      <v-divider style="border-color: var(--wi-border)" />

      <v-card-actions class="building-dialog-actions">
        <v-btn variant="text" class="close-btn" @click="$emit('update:modelValue', false)">Закрити</v-btn>
        <v-spacer />
        <template v-if="isAdmin">
          <v-btn
            v-if="!built && isAvailable"
            class="build-btn"
            :loading="loading"
            prepend-icon="mdi-hammer"
            @click="build"
          >
            Збудувати
          </v-btn>
          <v-btn
            v-else-if="built"
            class="destroy-btn"
            variant="tonal"
            :loading="loading"
            prepend-icon="mdi-skull-crossbones"
            @click="destroy"
          >
            Знищити
          </v-btn>
          <v-tooltip v-else location="top">
            <template #activator="{ props }">
              <span v-bind="props">
                <v-btn class="build-btn-disabled" disabled prepend-icon="mdi-lock">Збудувати</v-btn>
              </span>
            </template>
            Не виконано вимоги
          </v-tooltip>
        </template>
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBuildingStore } from '@/store/buildingStore'
import { useIslandStore } from '@/store/islandStore'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useLogStore } from '@/store/logStore'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  buildingKey: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  nickname: { type: String, default: 'Admin' },
})
const emit = defineEmits(['update:modelValue'])

const islandStore = useIslandStore()
const buildingStore = useBuildingStore()
const donationStore = useDonationGoalStore()
const logStore = useLogStore()

const { data: island } = storeToRefs(islandStore)
const loading = ref(false)

const meta = computed(() => buildingStore.byId.get(props.buildingKey) || null)
const imgSrc = computed(() => `/images/buildings/${props.buildingKey}.png`)

const built = computed(() => !!island.value?.buildings?.[props.buildingKey]?.built)
const discount = computed(() => islandStore.buildingDiscount || 0)
const baseCost = computed(() => Number(meta.value?.cost || 0))
const finalCost = computed(() => Math.round(baseCost.value * (1 - discount.value)))

const hasReqBuildings = computed(() => {
  const req = Array.isArray(meta.value?.requirements) ? meta.value.requirements : []
  if (!req.length) return true
  return req.every(id => island.value?.buildings?.[id]?.built === true)
})
const hasReqPopulation = computed(() => {
  const need = Number(meta.value?.requiredPopulation || 0)
  return (Number(island.value?.population || 0) >= need)
})
const isAvailable = computed(() => hasReqBuildings.value && hasReqPopulation.value)

const requirements = computed(() => {
  const req = Array.isArray(meta.value?.requirements) ? meta.value.requirements : []
  return req.map(id => ({
    id,
    name: buildingStore.byId.get(id)?.name || id,
    met: !!island.value?.buildings?.[id]?.built,
  }))
})

const progress = computed(() => {
  const g = donationStore.goals.find(x => x.type === 'building' && x.targetBuildingKey === props.buildingKey)
  return g ? { collected: Number(g.currentAmount || 0), target: Number(g.targetAmount || 0) } : null
})
const progressPct = computed(() =>
  progress.value ? Math.min(100, Math.round(progress.value.collected / Math.max(progress.value.target, 1) * 100)) : 0
)

const statusText = computed(() => built.value ? 'Збудовано' : (isAvailable.value ? 'Доступно' : 'Заблоковано'))
const statusClass = computed(() => built.value ? 'status-built' : (isAvailable.value ? 'status-available' : 'status-locked'))
const statusIcon = computed(() => built.value ? 'mdi-check-decagram' : (isAvailable.value ? 'mdi-hammer' : 'mdi-lock'))

async function build() {
  if (loading.value) return
  loading.value = true
  try {
    await islandStore.setBuildingBuilt(props.buildingKey, true)
    await logStore.addLog({
      action: `Admin built ${meta.value?.name || props.buildingKey}`,
      user: props.nickname || 'system',
      timestamp: new Date()
    })
  } finally { loading.value = false; emit('update:modelValue', false) }
}
async function destroy() {
  if (loading.value) return
  loading.value = true
  try {
    await islandStore.setBuildingBuilt(props.buildingKey, false)
    await logStore.addLog({
      action: `Admin destroyed ${meta.value?.name || props.buildingKey}`,
      user: props.nickname || 'system',
      timestamp: new Date()
    })
  } finally { loading.value = false; emit('update:modelValue', false) }
}
</script>

<style scoped>
/* ── Dialog card ────────────────────────────────────────────── */
.building-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

/* ── Header ─────────────────────────────────────────────────── */
.building-dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--wi-border);
  background: linear-gradient(180deg, #1f1508, #2c1e0f);
}

.building-dialog-img-wrap {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--wi-border);
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.building-dialog-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.building-dialog-title-block {
  flex: 1;
  min-width: 0;
}

.building-dialog-name {
  font-family: var(--wi-font-heading);
  font-size: 1.25rem;
  color: var(--wi-gold);
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-shadow: 0 0 12px rgba(200,150,42,0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Status badge */
.building-status-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 6px;
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 3px;
}

.status-built {
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.15);
  border: 1px solid rgba(90, 138, 60, 0.35);
}

.status-available {
  color: var(--wi-gold);
  background: rgba(200, 150, 42, 0.1);
  border: 1px solid rgba(200, 150, 42, 0.3);
}

.status-locked {
  color: var(--wi-danger);
  background: rgba(139, 42, 42, 0.15);
  border: 1px solid rgba(139, 42, 42, 0.3);
}

/* ── Body ───────────────────────────────────────────────────── */
.building-dialog-body {
  padding: 20px !important;
}

.building-description {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.9rem;
  color: var(--wi-text-muted);
  line-height: 1.55;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.4);
}

/* Stats table */
.building-stats {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.building-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid rgba(90, 62, 32, 0.3);
  gap: 12px;
}

.building-stat-row:last-child {
  border-bottom: none;
}

.building-stat-label {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--wi-text-muted);
  flex-shrink: 0;
}

.building-stat-label .v-icon {
  color: var(--wi-gold) !important;
  opacity: 0.7;
}

.building-stat-value {
  font-family: var(--wi-font-body);
  font-size: 0.9rem;
  color: var(--wi-text);
  text-align: right;
  display: flex;
  align-items: center;
}

.building-stat-base {
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  margin-left: 6px;
  font-style: italic;
}

/* Requirements */
.building-stat-requirements {
  align-items: flex-start;
}

.building-reqs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.building-req-chip {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 3px;
}

.req-met {
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.12);
  border: 1px solid rgba(90, 138, 60, 0.3);
}

.req-unmet {
  color: var(--wi-danger);
  background: rgba(139, 42, 42, 0.12);
  border: 1px solid rgba(139, 42, 42, 0.3);
}

.req-ok { color: var(--wi-success); }
.req-fail { color: var(--wi-danger); }

/* ── Donation progress ──────────────────────────────────────── */
.building-progress-wrap {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(90, 62, 32, 0.4);
}

.building-progress-label {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  margin-bottom: 8px;
}

.building-progress-label .v-icon {
  color: var(--wi-gold) !important;
}

.building-progress-numbers {
  margin-left: auto;
  font-family: var(--wi-font-number);
  font-size: 0.78rem;
  color: var(--wi-gold);
}

.building-progress-bar-wrap {
  height: 8px;
  background: rgba(90, 62, 32, 0.4);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(90, 62, 32, 0.5);
}

.building-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #a07020, #d4a233);
  border-radius: 4px;
  transition: width 0.4s ease;
  box-shadow: 0 0 6px rgba(200,150,42,0.4);
}

.building-progress-pct {
  text-align: right;
  font-family: var(--wi-font-number);
  font-size: 0.72rem;
  color: var(--wi-text-muted);
  margin-top: 4px;
}

/* ── Actions ────────────────────────────────────────────────── */
.building-dialog-actions {
  padding: 12px 20px !important;
}

.close-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.06em !important;
}

.build-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}

.build-btn :deep(.v-btn__overlay) {
  background-color: #fff !important;
  opacity: 0 !important;
}

.destroy-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  color: var(--wi-danger) !important;
  border-color: rgba(139, 42, 42, 0.5) !important;
}

.build-btn-disabled {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  opacity: 0.4 !important;
}
</style>
