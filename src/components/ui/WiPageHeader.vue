<template>
  <header class="wi-page-header">
    <div class="wi-page-header__main">
      <div class="wi-page-header__title-line">
        <v-icon v-if="icon" class="wi-page-header__icon" size="24">{{ icon }}</v-icon>
        <h1 class="wi-page-header__title">{{ title }}</h1>
      </div>
      <p v-if="subtitle" class="wi-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="wi-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
})
</script>

<style scoped>
.wi-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 18px 0;
  border-bottom: 1px solid var(--wi-border);
}

.wi-page-header__main {
  min-width: 0;
}

.wi-page-header__title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wi-page-header__icon {
  color: var(--wi-gold) !important;
  filter: drop-shadow(0 0 10px rgba(200, 150, 42, 0.28));
}

.wi-page-header__title {
  margin: 0;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  font-size: 2.05rem;
  line-height: 1.05;
  letter-spacing: 0.035em;
}

.wi-page-header__subtitle {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-body);
  font-size: 0.96rem;
  line-height: 1.45;
}

.wi-page-header__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 760px) {
  .wi-page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .wi-page-header__actions {
    justify-content: flex-start;
  }

  .wi-page-header__title {
    font-size: 1.5rem;
  }
}
</style>
