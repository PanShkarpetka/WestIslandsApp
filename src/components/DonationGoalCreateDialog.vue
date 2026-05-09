<template>
  <v-dialog
      :model-value="modelValue"
      @update:modelValue="v => emit('update:modelValue', v)"
      max-width="500"
      :persistent="loading"
  >
    <v-card class="create-goal-dialog">
      <div class="create-goal-header">
        <v-icon class="mr-2">mdi-hand-coin</v-icon>
        Новий збір
      </div>
      <v-card-text class="create-goal-body">
        <v-text-field v-model="form.title" label="Назва" :disabled="loading" required variant="outlined" density="compact" hide-details="auto" class="mb-3" prepend-inner-icon="mdi-format-title" />
        <v-textarea v-model="form.description" label="Опис (опційно)" auto-grow :disabled="loading" variant="outlined" density="compact" hide-details="auto" rows="2" class="mb-3" prepend-inner-icon="mdi-feather" />
        <v-select v-model="form.type" :items="typeItems" label="Тип збору" :disabled="loading" variant="outlined" density="compact" hide-details="auto" class="mb-3" prepend-inner-icon="mdi-shape" />
        <v-select v-if="form.type === 'building'" v-model="form.targetBuildingKey" :items="buildingStore.buildings" item-title="name" item-value="id" label="Цільова будівля" :loading="buildingStore.loading" :disabled="loading || buildingStore.loading" variant="outlined" density="compact" hide-details="auto" class="mb-3" prepend-inner-icon="mdi-home-city">
          <template #item="{ props: p, item }">
            <v-list-item v-bind="p" :title="item.raw.name" :subtitle="(item.raw.cost || 0).toLocaleString('uk-UA') + ' зм'" />
          </template>
          <template #selection="{ item }">
            <span>{{ item.raw.name }}</span>
          </template>
        </v-select>
        <v-text-field v-model.number="form.targetAmount" type="number" min="1" label="Цільова сума (зм)" :disabled="loading || (form.type==='building' && !!form.targetBuildingKey)" :hint="targetHint" persistent-hint variant="outlined" density="compact" prepend-inner-icon="mdi-gold" />
      </v-card-text>
      <v-divider style="border-color: var(--wi-border)" />
      <v-card-actions class="create-goal-actions">
        <v-btn variant="text" class="cancel-btn" @click="close" :disabled="loading">Скасувати</v-btn>
        <v-spacer />
        <v-btn class="save-btn" @click="save" :loading="loading" :disabled="!isValid || loading" prepend-icon="mdi-feather">Зберегти</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useBuildingStore } from '@/store/buildingStore'
import { useIslandStore } from '@/store/islandStore'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  preset: { type: Object, default: () => ({ createdBy: 'Анонім' }) },
})
const emit = defineEmits(['update:modelValue', 'created'])

const goalStore = useDonationGoalStore()
const buildingStore = useBuildingStore()
const islandStore = useIslandStore()

const loading = ref(false)
const typeItems = [
  { title: 'Будівля', value: 'building' },
  { title: 'Загальний', value: 'general' },
]

function emptyForm () {
  return {
    title: '',
    description: '',
    targetAmount: 0,
    currentAmount: 0,
    type: 'building',
    targetBuildingKey: null,
    status: 'open',
    createdBy: 'Анонім',
  }
}
const form = reactive(emptyForm())

function resetForm () {
  Object.assign(form, { ...emptyForm(), ...props.preset })
}

function close () {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (open) => {
  if (open) {
    resetForm()
    buildingStore.subscribe()
    islandStore.subscribe()
  } else {
    buildingStore.stop()
    islandStore.stop()
  }
}, { immediate: false })

const selectedBuilding = computed(() =>
    buildingStore.buildings.find(b => b.id === form.targetBuildingKey) || null
)
const discount = computed(() => islandStore.buildingDiscount || 0)

watch(
    [() => form.type, () => form.targetBuildingKey, discount],
    () => {
      if (form.type === 'building' && selectedBuilding.value) {
        const base = Number(selectedBuilding.value.cost || 0)
        form.targetAmount = Math.round(base * (1 - discount.value))
        if (!form.title) form.title = `Будівництво: ${selectedBuilding.value.name}`
      }
    },
    { immediate: true }
)

const targetHint = computed(() => {
  if (form.type !== 'building' || !selectedBuilding.value) return ''
  const base = Number(selectedBuilding.value.cost || 0)
  const pct = Math.round((discount.value || 0) * 100)
  return `Базова: ${base.toLocaleString('uk-UA')} ₴ • Знижка: ${pct}% • Підсумок: ${form.targetAmount.toLocaleString('uk-UA')} ₴`
})

const isValid = computed(() =>
    form.title.trim().length > 0 && Number(form.targetAmount) > 0
)

async function save () {
  if (!isValid.value || loading.value) return
  try {
    loading.value = true
    const id = await goalStore.saveGoal({ ...form }) // без id → створення
    emit('created', id ?? null)
    close()
  } catch (e) {
    console.error('Create goal failed:', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.create-goal-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.create-goal-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.create-goal-body {
  padding: 20px !important;
}

.create-goal-actions {
  padding: 12px 20px !important;
}

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
}

.save-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}

.save-btn :deep(.v-btn__overlay) {
  opacity: 0 !important;
}
</style>
