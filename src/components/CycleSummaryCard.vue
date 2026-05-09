<template>
  <div class="cycle-card">
    <v-icon class="cycle-card__icon" size="22">mdi-anchor</v-icon>

    <div class="cycle-card__section">
      <span class="cycle-card__label">{{ title }}</span>
      <span class="cycle-card__value">{{ currentStartDateLabel }}</span>
    </div>

    <div class="cycle-card__sep" />

    <div class="cycle-card__section">
      <span class="cycle-card__label">Тривалість попереднього циклу</span>
      <span class="cycle-card__value">{{ previousDurationLabel }}</span>
    </div>

    <div v-if="$slots.chips" class="cycle-card__chips">
      <slot name="chips" />
    </div>
  </div>
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
.cycle-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: var(--wi-surface);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
}

.cycle-card__icon {
  color: var(--wi-gold);
  flex-shrink: 0;
}

.cycle-card__sep {
  width: 1px;
  height: 28px;
  background: var(--wi-border);
  flex-shrink: 0;
}

.cycle-card__section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cycle-card__label {
  color: var(--wi-text-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  line-height: 1;
}

.cycle-card__value {
  color: var(--wi-text);
  font-size: 0.9rem;
  font-family: 'Cinzel', serif;
  line-height: 1.3;
}

.cycle-card__chips {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
</style>
