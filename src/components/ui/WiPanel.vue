<template>
  <section class="wi-panel" :class="[`wi-panel--${variant}`, { 'wi-panel--flush': flush }]">
    <header v-if="$slots.title || title || icon || $slots.actions" class="wi-panel__header">
      <div class="wi-panel__title-wrap">
        <v-icon v-if="icon" class="wi-panel__icon" size="18">{{ icon }}</v-icon>
        <div>
          <h2 v-if="title" class="wi-panel__title">{{ title }}</h2>
          <p v-if="subtitle" class="wi-panel__subtitle">{{ subtitle }}</p>
          <slot name="title" />
        </div>
      </div>
      <div v-if="$slots.actions" class="wi-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="wi-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'parchment', 'sea', 'danger'].includes(value),
  },
  flush: { type: Boolean, default: false },
})
</script>

<style scoped>
.wi-panel {
  border: 1px solid var(--wi-border);
  border-radius: var(--wi-radius-md);
  background: var(--wi-panel-bg);
  box-shadow: var(--wi-shadow-panel);
  overflow: hidden;
}

.wi-panel--parchment {
  background: var(--wi-parchment-bg);
}

.wi-panel--sea {
  border-color: rgba(58, 96, 128, 0.62);
  background: linear-gradient(145deg, rgba(32, 45, 48, 0.88), rgba(20, 24, 22, 0.9));
}

.wi-panel--danger {
  border-color: rgba(139, 42, 42, 0.58);
}

.wi-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.52);
  background: var(--wi-panel-header-bg);
}

.wi-panel__title-wrap {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.wi-panel__icon {
  color: var(--wi-gold) !important;
  flex: 0 0 auto;
}

.wi-panel__title {
  margin: 0;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  font-size: 0.9rem;
  letter-spacing: 0.055em;
  line-height: 1.2;
  text-transform: uppercase;
}

.wi-panel__subtitle {
  margin: 3px 0 0;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-body);
  font-size: 0.82rem;
  line-height: 1.3;
}

.wi-panel__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.wi-panel__body {
  padding: 16px;
}

.wi-panel--flush .wi-panel__body {
  padding: 0;
}

@media (max-width: 640px) {
  .wi-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .wi-panel__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
