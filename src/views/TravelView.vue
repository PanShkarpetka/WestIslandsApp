<template>
  <v-container class="travel-page">
    <WiPageHeader title="Калькулятори подорожей" icon="mdi-ship-wheel" />

    <v-tabs v-model="activeTab" align-tabs="start" class="travel-tabs mb-4">
      <v-tab value="ships">
        <v-icon start>mdi-sail-boat</v-icon>
        Кораблі
      </v-tab>
      <v-tab value="couriers">
        <v-icon start>mdi-bird</v-icon>
        Кур'єри
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="ships">
        <ShipCalculator />
      </v-window-item>
      <v-window-item value="couriers">
        <CourierCalculator />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import CourierCalculator from '@/components/CourierCalculator.vue';
import ShipCalculator from '@/components/ShipCalculator.vue';
import WiPageHeader from '@/components/ui/WiPageHeader.vue'

const activeTab = ref('ships');
</script>

<style scoped>
.travel-page {
  padding-top: 24px;
  padding-bottom: 40px;
}

.travel-tabs :deep(.v-tab) {
  font-family: var(--wi-font-heading);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.82rem;
}

.travel-tabs :deep(.v-tab--selected) {
  color: var(--wi-gold) !important;
}

.travel-tabs :deep(.v-tabs-slider) {
  background-color: var(--wi-gold);
}
</style>
