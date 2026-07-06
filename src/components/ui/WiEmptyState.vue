<template>
  <div class="wi-empty-state">
    <v-icon v-if="icon" class="wi-empty-state__icon" size="22">{{ icon }}</v-icon>
    <div>
      <div class="wi-empty-state__title">{{ title }}</div>
      <div v-if="$slots.default || text" class="wi-empty-state__text">
        <slot>{{ text }}</slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  icon: { type: String, default: 'mdi-anchor' },
})
</script>

<style scoped>
.wi-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 96px;
  padding: 18px;
  border: 1px dashed var(--wi-border);
  border-radius: var(--wi-radius-sm);
  background: rgba(44, 30, 15, 0.32);
  color: var(--wi-text-muted);
  text-align: center;
}

.wi-empty-state__icon {
  color: var(--wi-gold) !important;
  flex: 0 0 auto;
}

.wi-empty-state__title {
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  font-size: 0.82rem;
  letter-spacing: 0.045em;
  text-transform: uppercase;
}

.wi-empty-state__text {
  margin-top: 4px;
  font-family: var(--wi-font-body);
  font-size: 0.86rem;
  line-height: 1.35;
}
</style>
