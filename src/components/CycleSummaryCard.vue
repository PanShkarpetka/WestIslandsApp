<template>
  <v-card class="pa-4" variant="tonal">
    <div class="cycle-summary-header">
      <v-avatar color="primary" variant="elevated">
        <v-icon>mdi-timeline-clock</v-icon>
      </v-avatar>
      <div class="cycle-summary-text">
        <div class="text-overline text-medium-emphasis mb-1">{{ title }}</div>
        <div class="text-subtitle-1 font-semibold">Старт поточного циклу: {{ currentStartDateLabel }}</div>
        <div class="text-body-2 text-medium-emphasis">Тривалість попереднього циклу: {{ previousDurationLabel }}</div>
      </div>
      <div v-if="$slots.chips" class="cycle-summary-chips">
        <slot name="chips" />
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Поточний цикл' },
  currentStartDate: { type: String, default: '' },
  previousCycleDuration: { type: String, default: '' },
})

const currentStartDateLabel = computed(() => props.currentStartDate || '—')
const previousDurationLabel = computed(() => props.previousCycleDuration || 'невідомо')
</script>

<style scoped>
.cycle-summary-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cycle-summary-text {
  padding-left: 6px;
}

.cycle-summary-chips {
  margin-left: auto;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
