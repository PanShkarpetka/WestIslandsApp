<template>
  <v-container class="treasury-container">
    <WiPageHeader title="Скарбниця острова" icon="mdi-treasure-chest" />

    <div class="treasury-metrics">
      <WiMetricCard label="Дохід за цикл" :value="`${formatAmount(totalIncome)} зм`" tone="success" />
      <WiMetricCard label="Витрати за цикл" :value="`${formatAmount(totalOutcome)} зм`" tone="danger" />
      <WiMetricCard label="Чистий підсумок" :value="netTotalLabel" :tone="netTotal >= 0 ? 'success' : 'danger'" />
    </div>

    <TreasuryChestCard />

    <div class="mt-6">
      <TreasuryTransactions />
    </div>

  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import TreasuryTransactions from "@/components/TreasuryTransactions.vue"
import TreasuryChestCard from "@/components/TreasuryChestCard.vue"
import { useIslandStore } from '@/store/islandStore'
import { usePopulationStore } from '@/store/populationStore'
import { loadManufacturesByIds } from '@/services/cycleService.js'
import { formatAmount } from '@/utils/formatters'
import WiMetricCard from '@/components/ui/WiMetricCard.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'

const islandStore = useIslandStore()
const populationStore = usePopulationStore()
const { data: island } = storeToRefs(islandStore)

const manufactureIncome = ref(0)
const manufactureOutcome = ref(0)
const populationIncome = computed(() => populationStore.populationIncomeTotal || 0)

const totalIncome = computed(() => {
  const combined = manufactureIncome.value + (populationIncome.value > 0 ? populationIncome.value : 0)
  return roundAmount(combined)
})
const totalOutcome = computed(() => {
  const combined = manufactureOutcome.value + (populationIncome.value < 0 ? Math.abs(populationIncome.value) : 0)
  return roundAmount(combined)
})
const netTotal = computed(() => roundAmount(totalIncome.value - totalOutcome.value))
const netTotalLabel = computed(() => `${netTotal.value >= 0 ? '+' : '−'}${formatAmount(Math.abs(netTotal.value))} зм`)

function roundAmount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

async function loadManufactureTotals(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    manufactureIncome.value = 0
    manufactureOutcome.value = 0
    return
  }
  let incomeSum = 0
  let outcomeSum = 0
  const payouts = await loadManufacturesByIds(ids)
  for (const payout of payouts) {
    if (payout.mechanic === 'coinPig' || payout.incomeDestination !== 'treasury') continue
    const income = roundAmount(Number(payout.income || 0))
    if (income > 0) incomeSum += income
    else if (income < 0) outcomeSum += Math.abs(income)
  }
  manufactureIncome.value = roundAmount(incomeSum)
  manufactureOutcome.value = roundAmount(outcomeSum)
}

onMounted(() => {
  loadManufactureTotals(island.value?.manufactures)
  populationStore.startListening(islandStore.currentId)
})
watch(() => island.value?.manufactures, ids => loadManufactureTotals(ids), { deep: true })
watch(() => islandStore.currentId, id => populationStore.startListening(id))
onBeforeUnmount(() => populationStore.stopListening())
</script>

<style scoped>
.treasury-container {
  padding-top: 24px;
  padding-bottom: 40px;
}

.treasury-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 760px) {
  .treasury-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
