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

    <div v-if="season" class="cycle-card__season" :class="`cycle-card__season--${season.id}`">
      <v-icon size="18">{{ season.icon }}</v-icon>
      <span>{{ season.label }}</span>
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
  season: { type: Object, default: null },
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

.cycle-card__season {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(200, 150, 42, 0.34);
  border-radius: 999px;
  color: var(--wi-gold);
  background: rgba(200, 150, 42, 0.1);
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;
}

.cycle-card__season--winter {
  color: var(--wi-sea);
  border-color: rgba(58, 96, 128, 0.45);
  background: rgba(58, 96, 128, 0.16);
}

.cycle-card__season--spring {
  color: var(--wi-success);
  border-color: rgba(90, 138, 60, 0.42);
  background: rgba(90, 138, 60, 0.14);
}

.cycle-card__season--summer {
  color: var(--wi-gold-light);
}

.cycle-card__season--autumn {
  color: var(--wi-copper);
  border-color: rgba(123, 79, 46, 0.48);
  background: rgba(123, 79, 46, 0.16);
}

@media (max-width: 760px) {
  .cycle-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .cycle-card__season {
    margin-left: 0;
  }
}
</style>
