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
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import TreasuryTransactions from "@/components/TreasuryTransactions.vue";
import TreasuryChestCard from "@/components/TreasuryChestCard.vue";
import { useIslandStore } from '@/store/islandStore'
import { db } from '@/services/firebase'

const islandStore = useIslandStore()
const { data: island } = storeToRefs(islandStore)

const totalIncome = ref(0)
const totalOutcome = ref(0)

async function loadManufactureTotals(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    totalIncome.value = 0
    totalOutcome.value = 0
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
      const income = Math.trunc(Number(data.income || 0))
      if (income > 0) {
        incomeSum += income
      } else if (income < 0) {
        outcomeSum += Math.abs(income)
      }
    })
  }

  totalIncome.value = incomeSum
  totalOutcome.value = outcomeSum
}

onMounted(() => {
  loadManufactureTotals(island.value?.manufactures)
})

watch(
  () => island.value?.manufactures,
  (ids) => {
    loadManufactureTotals(ids)
  },
  { deep: true },
)
</script>

<style scoped>
</style>
