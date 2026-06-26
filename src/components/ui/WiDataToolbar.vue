<template>
  <div class="wi-data-toolbar">
    <div class="wi-data-toolbar__controls">
      <slot />
    </div>
    <div v-if="$slots.summary" class="wi-data-toolbar__summary">
      <slot name="summary" />
    </div>
  </div>
</template>

<style scoped>
.wi-data-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid rgba(90, 62, 32, 0.72);
  border-radius: var(--wi-radius-sm);
  background: rgba(18, 11, 5, 0.72);
}

.wi-data-toolbar__controls,
.wi-data-toolbar__summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.wi-data-toolbar__controls {
  flex: 1 1 auto;
  min-width: 0;
}

.wi-data-toolbar__summary {
  flex: 0 0 auto;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .wi-data-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .wi-data-toolbar__summary {
    justify-content: flex-start;
  }
}
</style>
