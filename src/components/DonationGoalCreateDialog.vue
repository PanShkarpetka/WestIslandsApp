<template>
  <v-dialog
      :model-value="modelValue"
      @update:modelValue="v => emit('update:modelValue', v)"
      max-width="500"
      :persistent="loading"
  >
    <WiDialogFrame title="Новий збір" icon="mdi-hand-coin">
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
      <template #actions>
        <v-btn variant="text" @click="close" :disabled="loading">Скасувати</v-btn>
        <v-spacer />
        <WiActionButton @click="save" :loading="loading" :disabled="!isValid || loading" prepend-icon="mdi-content-save">Зберегти</WiActionButton>
      </template>
    </WiDialogFrame>
  </v-dialog>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useBuildingStore } from '@/store/buildingStore'
import { useIslandStore } from '@/store/islandStore'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiDialogFrame from '@/components/ui/WiDialogFrame.vue'

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
