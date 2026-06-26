<template>
  <div class="wi-section-header">
    <div class="wi-section-header__main">
      <v-icon v-if="icon" size="18">{{ icon }}</v-icon>
      <h2>{{ title }}</h2>
    </div>
    <div v-if="$slots.actions" class="wi-section-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
})
</script>

<style scoped>
.wi-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.wi-section-header__main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  color: var(--wi-gold);
}

.wi-section-header h2 {
  margin: 0;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  font-size: 0.98rem;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.wi-section-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
</style>
