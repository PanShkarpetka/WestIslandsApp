<template>
  <v-dialog :model-value="modelValue" @update:modelValue="v => $emit('update:modelValue', v)" max-width="620">
    <v-card v-if="meta">
      <v-card-title class="flex items-center gap-3">
        <img :src="imgSrc" alt="" class="w-12 h-12 rounded-md object-contain" />
        <div class="flex-1">
          <div class="text-h6">{{ meta.name }}</div>
          <v-chip :color="statusColor" size="small" class="mt-1">{{ statusText }}</v-chip>
        </div>
      </v-card-title>

      <v-card-text class="space-y-3">
        <div class="text-body-2">{{ meta.description }}</div>

        <div class="text-body-2">
          <strong>Ціна з урахуванням знижки:</strong>
          {{ finalCost.toLocaleString('uk-UA') }} золота
          <span class="text-disabled"> (база: {{ baseCost.toLocaleString('uk-UA') }}, -{{ Math.round(discount*100) }}%)</span>
        </div>

        <div v-if="meta.growth" class="text-body-2">
          <strong>Приріст населення:</strong> +{{ meta.growth }}
        </div>

        <div v-if="progress" class="mt-2">
          <div class="text-body-2 mb-1">
            <strong>Збір:</strong> {{ progress.collected.toLocaleString('uk-UA') }} /
            {{ progress.target.toLocaleString('uk-UA') }} золота
          </div>
          <v-progress-linear :model-value="progressPct" height="10" rounded />
        </div>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Закрити</v-btn>
        <template v-if="isAdmin">
          <v-btn v-if="!built && isAvailable" color="green" @click="build" :loading="loading">Збудувати</v-btn>
          <v-btn v-else-if="built" color="red" variant="tonal" @click="destroy" :loading="loading">Знищити</v-btn>
          <v-tooltip v-else>
            <template #activator="{ props }">
              <div v-bind="props"><v-btn disabled>Збудувати</v-btn></div>
            </template>
            <span>Не виконано вимоги</span>
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

const progress = computed(() => {
  const g = donationStore.goals.find(x => x.type === 'building' && x.targetBuildingKey === props.buildingKey)
  return g ? { collected: Number(g.currentAmount||0), target: Number(g.targetAmount||0) } : null
})
const progressPct = computed(() =>
    progress.value ? Math.min(100, Math.round(progress.value.collected / Math.max(progress.value.target, 1) * 100)) : 0
)

const statusText = computed(() => built.value ? 'Збудовано' : (isAvailable.value ? 'Доступно' : 'Заблоковано'))
const statusColor = computed(() => built.value ? 'green' : (isAvailable.value ? 'grey' : 'red'))

async function build () {
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
async function destroy () {
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
.w-12{width:48px}.h-12{height:48px}
</style>
