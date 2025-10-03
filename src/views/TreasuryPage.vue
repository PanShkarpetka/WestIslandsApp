<template>
  <v-container class="py-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-h5 font-semibold">Скарбниця острова</h1>
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
import TreasuryTransactions from "@/components/TreasuryTransactions.vue";
import TreasuryChestCard from "@/components/TreasuryChestCard.vue";
</script>

<style scoped>
</style>
