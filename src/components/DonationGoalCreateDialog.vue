<template>
  <v-dialog
      :model-value="modelValue"
      @update:modelValue="v => emit('update:modelValue', v)"
      max-width="500"
      :persistent="loading"
  >
    <v-card>
      <v-card-title class="text-h6">Новий збір</v-card-title>

      <v-card-text class="flex flex-col gap-4">
        <v-text-field
            v-model="form.title"
            label="Назва"
            :disabled="loading"
            required
            prepend-icon="mdi-format-title"
        />

        <v-textarea
            v-model="form.description"
            label="Опис (опційно)"
            auto-grow
            :disabled="loading"
            prepend-icon="mdi-text"
        />

        <!-- тип збору -->
        <v-select
            v-model="form.type"
            :items="typeItems"
            label="Тип збору"
            :disabled="loading"
            prepend-icon="mdi-shape"
        />

        <!-- селект будівлі -->
        <v-select
            v-if="form.type === 'building'"
            v-model="form.targetBuildingKey"
            :items="buildingStore.buildings"
            item-title="name"
            item-value="id"
            label="Цільова будівля"
            :loading="buildingStore.loading"
            :disabled="loading || buildingStore.loading"
            prepend-icon="mdi-home-city"
        >
          <template #item="{ props, item }">
            <v-list-item
                v-bind="props"
                :title="item.raw.name"
                :subtitle="(item.raw.cost || 0).toLocaleString('uk-UA') + ' ₴'"
            />
          </template>
          <template #selection="{ item }">
            <span>{{ item.raw.name }}</span>
          </template>
        </v-select>

        <!-- цільова сума -->
        <v-text-field
            v-model.number="form.targetAmount"
            type="number"
            min="1"
            label="Цільова сума, ₴"
            :disabled="loading || (form.type==='building' && !!form.targetBuildingKey)"
            :hint="targetHint"
            persistent-hint
            prepend-icon="mdi-cash-multiple"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="loading">Скасувати</v-btn>
        <v-btn color="primary" @click="save" :loading="loading" :disabled="!isValid || loading">
          Зберегти
        </v-btn>
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
