<template>
  <v-container class="pb-8">
    <div class="hero-banner my-4">
      <v-icon class="hero-watermark" size="320">mdi-ship-wheel</v-icon>
      <div class="hero-content">
        <h1 class="hero-title">Калькулятори подорожей</h1>
        <p class="hero-subtitle">Розрахуй маршрут, вартість та небезпеки морського шляху</p>
      </div>
    </div>

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

const activeTab = ref('ships');
</script>

<style scoped>
.hero-banner {
  position: relative;
  overflow: hidden;
  padding: 40px 32px 36px;
  background: linear-gradient(135deg, rgba(14, 9, 4, 0.95), rgba(26, 17, 8, 0.9));
  border: 1px solid var(--wi-border);
  border-radius: 16px;
}

.hero-watermark {
  position: absolute;
  right: -32px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.07;
  color: var(--wi-gold);
  animation: spin-slow 60s linear infinite;
  pointer-events: none;
}

@keyframes spin-slow {
  from { transform: translateY(-50%) rotate(0deg); }
  to   { transform: translateY(-50%) rotate(360deg); }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-family: var(--wi-font-heading);
  color: var(--wi-gold);
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0 0 8px;
}

.hero-subtitle {
  font-family: var(--wi-font-body);
  color: var(--wi-text-muted);
  font-style: italic;
  font-size: 0.95rem;
  margin: 0;
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
