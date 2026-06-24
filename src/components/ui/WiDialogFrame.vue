<template>
  <v-card class="wi-dialog-frame">
    <div class="wi-dialog-frame__header">
      <div class="wi-dialog-frame__title">
        <v-icon v-if="icon" size="20">{{ icon }}</v-icon>
        <span>{{ title }}</span>
      </div>
      <slot name="header-actions" />
    </div>
    <v-card-text class="wi-dialog-frame__body">
      <slot />
    </v-card-text>
    <v-divider />
    <v-card-actions class="wi-dialog-frame__actions">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
})
</script>

<style scoped>
.wi-dialog-frame {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.wi-dialog-frame__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
}

.wi-dialog-frame__title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  letter-spacing: 0.055em;
}

.wi-dialog-frame__body {
  padding: 20px !important;
}

.wi-dialog-frame__actions {
  padding: 12px 20px !important;
}
</style>
