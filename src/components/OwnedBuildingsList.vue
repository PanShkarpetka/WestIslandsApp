<template>
  <div v-if="buildings.length" class="owned-buildings-list">
    <div v-for="building in buildings" :key="building.key" class="owned-building-row">
      <div class="owned-building-icon">
        <v-icon size="19">mdi-sprout</v-icon>
      </div>
      <div class="owned-building-info">
        <div class="owned-building-name">{{ building.name }}</div>
        <div v-if="building.description" class="owned-building-description">{{ building.description }}</div>
        <div v-if="building.incomeType === 'owner-action'" class="owned-building-meta">
          <span><v-icon size="12">mdi-gold</v-icon> {{ formatAmount(building.actionCostGold) }} зм</span>
          <span><v-icon size="12">mdi-counter</v-icon> {{ building.maxUsesPerCycle }} у циклі</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="owned-buildings-empty">
    <v-icon size="15" class="mr-1">mdi-home-off-outline</v-icon>
    {{ emptyText }}
  </div>
</template>

<script setup>
import { formatAmount } from '@/utils/formatters'

defineProps({
  buildings: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'Будівель у власності немає.' },
})
</script>

<style scoped>
.owned-buildings-list { display: grid; gap: 10px; }
.owned-building-row {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(90, 62, 32, 0.55);
  border-radius: 6px;
  background: rgba(26, 18, 9, 0.45);
}
.owned-building-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wi-gold);
  border: 1px solid rgba(200, 150, 42, 0.3);
  border-radius: 6px;
  background: rgba(200, 150, 42, 0.08);
}
.owned-building-info { min-width: 0; }
.owned-building-name {
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  font-size: 0.9rem;
}
.owned-building-description,
.owned-building-meta,
.owned-buildings-empty { color: var(--wi-text-muted); font-size: 0.78rem; }
.owned-building-description { margin-top: 2px; }
.owned-building-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 5px; }
.owned-building-meta span { display: inline-flex; align-items: center; gap: 4px; }
.owned-buildings-empty { display: flex; align-items: center; padding: 8px 0; }
</style>
