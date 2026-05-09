<template>
  <div class="chart-container">
    <Doughnut :data="chartData" :options="chartOptions" class="doughnut-chart" />
  </div>
</template>

<script setup>
import { Doughnut } from 'vue-chartjs'

defineProps({
  chartData: {
    type: Object,
    required: true,
  },
  chartOptions: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped>
.chart-container {
  min-height: 520px;
  position: relative;
  padding: 12px 8px 0;
}

:deep(.chart-tooltip) {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  background: #0f0a04;
  color: var(--wi-text);
  border: 1px solid var(--wi-border);
  padding: 6px 12px;
  border-radius: 4px;
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  opacity: 0;
  transition: opacity 0.12s ease, transform 0.12s ease;
  white-space: nowrap;
}

:deep(.chart-tooltip__content) {
  display: block;
}

.doughnut-chart {
  width: 100%;
  max-width: 640px;
  height: 320px;
  margin: 0 auto;
}

@media (max-width: 960px) {
  .chart-container {
    min-height: 380px;
    padding: 8px 0 0;
  }

  .doughnut-chart {
    max-width: 100%;
    height: 260px;
  }
}

@media (max-width: 600px) {
  .chart-container {
    min-height: 320px;
  }

  .doughnut-chart {
    height: 220px;
  }
}
</style>
