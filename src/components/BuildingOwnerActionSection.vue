<template>
  <section class="owner-action">
    <div class="owner-action-summary">
      <div>
        <span class="summary-label">Вартість</span>
        <strong>{{ formatAmount(actionCostGold) }} зм</strong>
      </div>
      <div>
        <span class="summary-label">Залишилось у циклі</span>
        <strong>{{ remainingUses }} / {{ maxUsesPerCycle }}</strong>
      </div>
    </div>

    <v-alert v-if="!currentCycleId" type="warning" density="compact" variant="tonal" class="mt-4">
      Дію можна використати лише під час активного циклу.
    </v-alert>
    <v-alert v-else-if="!ownerId" type="warning" density="compact" variant="tonal" class="mt-4">
      Для цієї будівлі ще не призначено власника. Адмін має обрати героя або гільдію.
    </v-alert>
    <v-alert v-else-if="!isOwner" type="info" density="compact" variant="tonal" class="mt-4">
      {{ accessMessage }}
    </v-alert>
    <template v-else>
      <div class="action-title">Оберіть, що зібрати</div>
      <v-radio-group v-model="selectedVariantId" hide-details class="variant-list">
        <label v-for="variant in variants" :key="variant.id" class="variant-row">
          <v-radio :value="variant.id" color="primary" />
          <span>
            <strong>{{ goodLabel(variant.goodId) }}</strong>
            <small>{{ variant.amount }} {{ goodUnit(variant.goodId) }}</small>
          </span>
        </label>
      </v-radio-group>

      <v-alert v-if="actionError" type="error" density="compact" variant="tonal" class="mt-3">{{ actionError }}</v-alert>
      <v-alert v-if="actionSuccess" type="success" density="compact" variant="tonal" class="mt-3">{{ actionSuccess }}</v-alert>
      <WiActionButton
        class="mt-4"
        prepend-icon="mdi-basket-fill"
        :loading="submitting"
        :disabled="!selectedVariantId || remainingUses < 1 || !currentCycleId"
        @click="gather"
      >
        Зібрати за {{ formatAmount(actionCostGold) }} зм
      </WiActionButton>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import { useGoodsStore } from '@/store/goodsStore.js'
import { useIslandStore } from '@/store/islandStore.js'
import { formatAmount } from '@/utils/formatters.js'
import { useYieldBuildingAction } from '@/services/yieldBuildingActionService.js'

const props = defineProps({
  buildingKey: { type: String, required: true },
  buildingEntry: { type: Object, required: true },
  definition: { type: Object, required: true },
  currentHeroId: { type: String, default: '' },
  leaderGuildIds: { type: Array, default: () => [] },
  actorName: { type: String, default: '' },
  currentCycleId: { type: String, default: '' },
})

const goodsStore = useGoodsStore()
const islandStore = useIslandStore()
const selectedVariantId = ref('')
const submitting = ref(false)
const actionError = ref('')
const actionSuccess = ref('')

onMounted(() => goodsStore.subscribeGoods())

const variants = computed(() => Array.isArray(props.definition.actionVariants) ? props.definition.actionVariants : [])
const actionCostGold = computed(() => Number(props.definition.actionCostGold || 0))
const maxUsesPerCycle = computed(() => Math.max(0, Math.trunc(Number(props.definition.maxUsesPerCycle || 0))))
const usedThisCycle = computed(() => props.buildingEntry.actionUsage?.cycleId === props.currentCycleId
  ? Math.max(0, Math.trunc(Number(props.buildingEntry.actionUsage.count || 0)))
  : 0)
const remainingUses = computed(() => Math.max(0, maxUsesPerCycle.value - usedThisCycle.value))
const ownerType = computed(() => props.buildingEntry.ownerType || (props.buildingEntry.ownerGuildId ? 'guild' : 'hero'))
const ownerId = computed(() => props.buildingEntry.ownerId || props.buildingEntry.ownerGuildId || props.buildingEntry.ownerHeroId || '')
const isOwner = computed(() => ownerType.value === 'guild'
  ? props.leaderGuildIds.includes(ownerId.value)
  : !!props.currentHeroId && ownerId.value === props.currentHeroId)
const accessMessage = computed(() => ownerType.value === 'guild'
  ? 'Ця дія доступна лише лідеру гільдії-власника.'
  : 'Ця дія доступна лише власнику будівлі.')
watch(variants, (items) => {
  if (!items.some(item => item.id === selectedVariantId.value)) selectedVariantId.value = items[0]?.id || ''
}, { immediate: true })

function good(goodId) {
  return goodsStore.goods.find(item => item.id === goodId)
}

function goodLabel(goodId) {
  return good(goodId)?.name || goodId
}

function goodUnit(goodId) {
  return good(goodId)?.unit || 'шт.'
}

async function gather() {
  if (submitting.value || !selectedVariantId.value) return
  submitting.value = true
  actionError.value = ''
  actionSuccess.value = ''
  try {
    const result = await useYieldBuildingAction({
      islandId: islandStore.data?.id,
      buildingKey: props.buildingKey,
      heroId: props.currentHeroId,
      leaderGuildIds: props.leaderGuildIds,
      actorName: props.actorName,
      cycleId: props.currentCycleId,
      variantId: selectedVariantId.value,
    })
    actionSuccess.value = `Додано ${result.amount} ${goodUnit(result.goodId)} товару «${result.goodName}». Списано ${formatAmount(result.goldSpent)} зм.`
  } catch (error) {
    actionError.value = error?.message || 'Не вдалося використати дію будівлі.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.owner-action { margin-top: 4px; }
.owner-action-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.owner-action-summary > div {
  padding: 12px;
  border: 1px solid rgba(200, 150, 42, 0.25);
  border-radius: var(--wi-radius-sm);
  background: rgba(200, 150, 42, 0.06);
}
.owner-action-summary strong { display: block; color: var(--wi-gold-light); margin-top: 2px; }
.summary-label { color: var(--wi-text-muted); font-size: 0.75rem; }
.action-title { margin-top: 18px; color: var(--wi-text); font-family: var(--wi-font-heading); }
.variant-list { margin-top: 6px; }
.variant-row {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.35);
  cursor: pointer;
}
.variant-row span { display: flex; flex-direction: column; }
.variant-row strong { color: var(--wi-text); }
.variant-row small { color: var(--wi-text-muted); }
@media (max-width: 700px) {
  .owner-action-summary { grid-template-columns: 1fr; }
}
</style>
