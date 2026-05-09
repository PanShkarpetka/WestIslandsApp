<template>
  <v-container class="treasury-container py-6">

    <div class="treasury-header">
      <div class="treasury-header-title">
        <v-icon class="mr-2" color="primary">mdi-treasure-chest</v-icon>
        <h1 class="wi-heading">Скарбниця острова</h1>
      </div>
      <div class="treasury-totals">
        <span class="total-item income">
          <v-icon size="15">mdi-arrow-up-bold</v-icon>
          +{{ formatAmount(totalIncome) }} зм
        </span>
        <span class="total-divider">/</span>
        <span class="total-item expense">
          <v-icon size="15">mdi-arrow-down-bold</v-icon>
          −{{ formatAmount(totalOutcome) }} зм
        </span>
      </div>
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
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import TreasuryTransactions from "@/components/TreasuryTransactions.vue"
import TreasuryChestCard from "@/components/TreasuryChestCard.vue"
import { useIslandStore } from '@/store/islandStore'
import { usePopulationStore } from '@/store/populationStore'
import { db } from '@/services/firebase'
import { formatAmount } from '@/utils/formatters'

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
  const chunks = []
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))

  let incomeSum = 0, outcomeSum = 0
  for (const chunk of chunks) {
    const snap = await getDocs(query(collection(db, 'manufactures'), where(documentId(), 'in', chunk)))
    snap.docs.forEach(d => {
      const data = d.data() || {}
      if ((data.incomeDestination || 'treasury') !== 'treasury') return
      const income = roundAmount(Number(data.income || 0))
      if (income > 0) incomeSum += income
      else if (income < 0) outcomeSum += Math.abs(income)
    })
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
.treasury-container { padding-top: 24px; }

.treasury-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--wi-border);
}

.treasury-header-title {
  display: flex;
  align-items: center;
}

.treasury-totals {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--wi-font-body);
  font-size: 0.9rem;
}

.total-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.income { color: var(--wi-success); }
.expense { color: var(--wi-danger); }
.total-divider { color: var(--wi-border); }
</style>
