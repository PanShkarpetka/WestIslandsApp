<template>
  <v-container class="py-6">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h1 class="text-h5 font-semibold">Скарбниця острова</h1>
        <div class="text-sm text-medium-emphasis">
          Дохід/Витрати: +{{ totalIncome }} 🪙 / -{{ totalOutcome }} 🪙
        </div>
      </div>
    </div>

    <!-- ВЕЛИКА СКРИНЯ -->
    <TreasuryChestCard />

    <!-- Список транзакцій нижче -->
    <div class="mt-6">
      <TreasuryTransactions />
    </div>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import TreasuryTransactions from "@/components/TreasuryTransactions.vue";
import TreasuryChestCard from "@/components/TreasuryChestCard.vue";
import { useIslandStore } from '@/store/islandStore'
import { usePopulationStore } from '@/store/populationStore'
import { db } from '@/services/firebase'

const islandStore = useIslandStore()
const populationStore = usePopulationStore()
const { data: island } = storeToRefs(islandStore)

const manufactureIncome = ref(0)
const manufactureOutcome = ref(0)
const populationIncome = computed(() => populationStore.populationIncomeTotal || 0)

const totalIncome = computed(() => {
  const popIncome = populationIncome.value
  const combined = manufactureIncome.value + (popIncome > 0 ? popIncome : 0)
  return roundAmount(combined)
})
const totalOutcome = computed(() => {
  const popIncome = populationIncome.value
  const combined = manufactureOutcome.value + (popIncome < 0 ? Math.abs(popIncome) : 0)
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
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10))
  }

  let incomeSum = 0
  let outcomeSum = 0
  for (const chunk of chunks) {
    const q = query(collection(db, 'manufactures'), where(documentId(), 'in', chunk))
    const snap = await getDocs(q)
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() || {}
      const income = roundAmount(Number(data.income || 0))
      if (income > 0) {
        incomeSum += income
      } else if (income < 0) {
        outcomeSum += Math.abs(income)
      }
    })
  }

  manufactureIncome.value = roundAmount(incomeSum)
  manufactureOutcome.value = roundAmount(outcomeSum)
}

onMounted(() => {
  loadManufactureTotals(island.value?.manufactures)
  populationStore.startListener(islandStore.currentId)
})

watch(
  () => island.value?.manufactures,
  (ids) => {
    loadManufactureTotals(ids)
  },
  { deep: true },
)

watch(
  () => islandStore.currentId,
  (id) => {
    populationStore.startListener(id)
  },
)

onBeforeUnmount(() => populationStore.stopListener())
</script>

<style scoped>
</style>
