<template>
  <div class="craft-progress">
    <div class="d-flex justify-space-between text-caption mb-1">
      <span>{{ label }}</span>
      <span>{{ value }} / {{ max }} ({{ percentLabel }}%)</span>
    </div>
    <v-progress-linear :model-value="percent" :color="color" height="10" rounded>
      <template #default>
        <span v-if="capped" class="text-caption font-weight-bold">✓</span>
      </template>
    </v-progress-linear>
    <div v-if="capped && cappedHint" class="text-caption text-medium-emphasis mt-1">{{ cappedHint }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: 'Progress' },
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  color: { type: String, default: 'primary' },
  capped: { type: Boolean, default: false },
  cappedHint: { type: String, default: '' },
});

const percent = computed(() => {
  if (!props.max) return 0;
  return Math.max(0, Math.min(100, (props.value / props.max) * 100));
});

const percentLabel = computed(() => percent.value.toFixed(1));
</script>

<style scoped>
.craft-progress {
  min-width: 180px;
}
</style>
