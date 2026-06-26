<template>
  <article class="wi-metric-card" :class="toneClass">
    <div class="wi-metric-card__label">{{ label }}</div>
    <div class="wi-metric-card__value"><slot name="value">{{ value }}</slot></div>
    <div v-if="$slots.default || note" class="wi-metric-card__note">
      <slot>{{ note }}</slot>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  note: { type: String, default: '' },
  tone: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'success', 'danger', 'sea'].includes(value),
  },
})

const toneClass = computed(() => `wi-metric-card--${props.tone}`)
</script>

<style scoped>
.wi-metric-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--wi-border);
  border-radius: var(--wi-radius-sm);
  background: var(--wi-panel-bg);
  box-shadow: var(--wi-shadow-soft);
}

.wi-metric-card__label {
  color: var(--wi-text-muted);
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.wi-metric-card__value {
  margin-top: 8px;
  color: var(--wi-gold);
  font-family: var(--wi-font-number);
  font-size: 2rem;
  line-height: 1;
  overflow-wrap: anywhere;
}

.wi-metric-card--success .wi-metric-card__value { color: var(--wi-success); }
.wi-metric-card--danger .wi-metric-card__value { color: var(--wi-danger); }
.wi-metric-card--sea .wi-metric-card__value { color: var(--wi-sea-light); }

.wi-metric-card__note {
  margin-top: 8px;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-body);
  font-size: 0.82rem;
  line-height: 1.35;
}
</style>
