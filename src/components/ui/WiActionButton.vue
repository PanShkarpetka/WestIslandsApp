<template>
  <v-btn
    class="wi-action-button"
    :class="`wi-action-button--${tone}`"
    :variant="variant"
    v-bind="$attrs"
  >
    <slot />
  </v-btn>
</template>

<script setup>
defineOptions({ inheritAttrs: false })

defineProps({
  tone: {
    type: String,
    default: 'gold',
    validator: (value) => ['gold', 'sea', 'success', 'danger', 'muted'].includes(value),
  },
  variant: { type: String, default: 'elevated' },
})
</script>

<style scoped>
.wi-action-button {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.78rem !important;
  letter-spacing: 0.055em !important;
}

.wi-action-button--gold.v-btn--variant-elevated {
  background: linear-gradient(180deg, #d6a43a 0%, #9b6b22 100%) !important;
  border: 1px solid var(--wi-gold-light) !important;
  color: var(--wi-bg) !important;
}

.wi-action-button--sea {
  color: var(--wi-sea-light) !important;
}

.wi-action-button--success {
  color: var(--wi-success-light) !important;
}

.wi-action-button--danger {
  color: var(--wi-danger-light) !important;
}

.wi-action-button--muted {
  color: var(--wi-text-muted) !important;
}
</style>
