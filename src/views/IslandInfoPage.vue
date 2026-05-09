<template>
  <div class="island-info">

    <div class="log-card">
      <div class="log-card-header">
        <v-icon class="mr-2" size="18">mdi-scroll-text</v-icon>
        Параметри острова
      </div>

      <div class="log-fields">
        <div class="log-row">
          <span class="log-label">Назва</span>
          <span v-if="!isAdmin" class="log-value">{{ form.name || '—' }}</span>
          <v-text-field v-else v-model="form.name" variant="underlined" density="compact" hide-details class="log-input" />
        </div>

        <div class="log-row">
          <span class="log-label">Населення</span>
          <span v-if="!isAdmin" class="log-value">{{ form.population }}</span>
          <v-text-field v-else v-model.number="form.population" type="number" min="0" variant="underlined" density="compact" hide-details class="log-input" />
        </div>

        <div class="log-row">
          <span class="log-label">Персонажі</span>
          <span v-if="!isAdmin" class="log-value">{{ form.characters }}</span>
          <v-text-field v-else v-model.number="form.characters" type="number" min="0" variant="underlined" density="compact" hide-details class="log-input" />
        </div>

        <div class="log-row">
          <span class="log-label">Знижка на будівництво</span>
          <span v-if="!isAdmin" class="log-value discount-badge">{{ form.buildingDiscount }}%</span>
          <v-text-field v-else v-model.number="form.buildingDiscount" type="number" min="0" max="100" variant="underlined" density="compact" hide-details class="log-input" suffix="%" />
        </div>

        <div class="log-row">
          <span class="log-label">Знижка на ремонт кораблів</span>
          <span v-if="!isAdmin" class="log-value discount-badge">{{ form.repairDiscount }}%</span>
          <v-text-field v-else v-model.number="form.repairDiscount" type="number" min="0" max="100" variant="underlined" density="compact" hide-details class="log-input" suffix="%" />
        </div>
      </div>
    </div>

    <div v-if="isAdmin" class="save-row">
      <v-btn class="save-btn" :loading="saving" @click="save">
        <v-icon start>mdi-feather</v-icon>
        Записати зміни
      </v-btn>
    </div>

  </div>
</template>

<script setup>
import { reactive, ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useIslandStore } from '@/store/islandStore.js'
import { useUserStore } from '@/store/userStore.js'

const auth = useUserStore()
const isAdmin = computed(() => auth?.isAdmin ?? false)
const islandStore = useIslandStore()
const { data: island } = storeToRefs(islandStore)

const saving = ref(false)
const form = reactive({ name: '', population: 0, sailors: 0, characters: 0, buildingDiscount: 0, repairDiscount: 0 })

onMounted(() => islandStore.subscribe())
onUnmounted(() => islandStore.stop())

watch(island, (v) => {
  if (!v) return
  form.name = v.name || ''
  form.population = Number(v.population || 0)
  form.sailors = Number(v.sailors || 0)
  form.characters = Number(v.characters || 0)
  form.buildingDiscount = v.buildingDiscount ?? 0
  form.repairDiscount = v.repairDiscount ?? 0
}, { immediate: true })

async function save() {
  if (!isAdmin.value) return
  saving.value = true
  try {
    await islandStore.updateIsland({
      name: String(form.name || ''),
      population: Number(form.population || 0),
      sailors: Number(form.sailors || 0),
      characters: Number(form.characters || 0),
      buildingDiscount: Number(form.buildingDiscount || 0),
      repairDiscount: Number(form.repairDiscount || 0),
    })
  } finally { saving.value = false }
}
</script>

<style scoped>
.island-info {
  max-width: 560px;
}

/* ── Captain's log card ─────────────────────────────────────── */
.log-card {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.log-card-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #1a1108;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 0.8rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.log-card-header .v-icon {
  color: var(--wi-gold) !important;
}

/* ── Log rows ───────────────────────────────────────────────── */
.log-fields {
  padding: 8px 0;
}

.log-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.35);
  gap: 16px;
}

.log-row:last-child {
  border-bottom: none;
}

.log-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

.log-label {
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  font-size: 0.9rem;
  flex-shrink: 0;
  min-width: 180px;
}

.log-value {
  font-family: var(--wi-font-body);
  color: var(--wi-text);
  font-size: 0.95rem;
  text-align: right;
}

.discount-badge {
  font-family: var(--wi-font-number);
  color: var(--wi-gold);
  font-size: 1rem;
  text-shadow: 0 0 6px rgba(200, 150, 42, 0.3);
}

.log-input {
  max-width: 160px;
  text-align: right;
}

.log-input :deep(.v-field__input) {
  text-align: right;
  font-family: var(--wi-font-body) !important;
  color: var(--wi-text) !important;
}

/* ── Save button ────────────────────────────────────────────── */
.save-row {
  margin-top: 16px;
}

.save-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.08em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}
</style>
