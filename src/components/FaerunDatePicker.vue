<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    transition="scale-transition"
    max-width="360"
  >
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :model-value="displayValue"
        :placeholder="placeholder"
        :hint="hint"
        :persistent-hint="Boolean(hint)"
        readonly
        density="comfortable"
        hide-details="auto"
        class="mb-4"
        :clearable="clearable"
        @click:clear="clearSelection"
      />
    </template>

    <v-card>
      <v-card-text class="d-flex flex-column gap-4">
        <div class="d-flex gap-4">
          <v-select
            v-model="localMonth"
            :items="monthOptions"
            item-title="name"
            item-value="index"
            label="Місяць"
            density="comfortable"
            hide-details="auto"
            class="flex-1-1"
          />
          <v-text-field
            v-model.number="localDay"
            type="number"
            min="1"
            :max="daysInMonth"
            label="День"
            density="comfortable"
            hide-details="auto"
            class="day-input"
          />
          <v-text-field
            v-model.number="localYear"
            type="number"
            min="1"
            label="Рік"
            density="comfortable"
            hide-details="auto"
            class="year-input"
          />
        </div>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="menu = false">Закрити</v-btn>
        <v-btn color="primary" variant="tonal" @click="applySelection">Застосувати</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DAYS_IN_MONTH, DEFAULT_YEAR, FAERUN_MONTHS, clampDay, formatFaerunDate, normalizeFaerunDate } from 'faerun-date'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  year: {
    type: Number,
    default: DEFAULT_YEAR,
  },
  clearable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const menu = ref(false)
const localMonth = ref(props.modelValue?.month ?? 0)
const localDay = ref(props.modelValue?.day ?? 1)
const localYear = ref(props.modelValue?.year ?? props.year ?? DEFAULT_YEAR)
const daysInMonth = DAYS_IN_MONTH

const effectiveYear = computed(() => {
  const numericYear = Number(localYear.value)
  return Number.isFinite(numericYear) && numericYear > 0 ? numericYear : DEFAULT_YEAR
})

const monthOptions = computed(() =>
  FAERUN_MONTHS.map((month, index) => ({
    ...month,
    index,
  })),
)

const normalizedValue = computed(() =>
  normalizeFaerunDate({ ...props.modelValue, year: props.modelValue?.year ?? effectiveYear.value }),
)

const displayValue = computed(() =>
  normalizedValue.value
    ? formatFaerunDate({ ...normalizedValue.value, year: effectiveYear.value })
    : '',
)

watch(
  () => props.modelValue,
  (value) => {
    const normalized = normalizeFaerunDate(value)
    if (!normalized) return
    localMonth.value = normalized.month
    localDay.value = normalized.day
    localYear.value = normalized.year
  },
)

function applySelection() {
  const normalizedDay = clampDay(localDay.value)
  localDay.value = normalizedDay

  emit('update:modelValue', {
    day: normalizedDay,
    month: localMonth.value,
    year: effectiveYear.value,
  })
  menu.value = false
}

function clearSelection() {
  emit('update:modelValue', null)
}
</script>

<style scoped>
.day-input {
  max-width: 120px;
}

.flex-1-1 {
  flex: 1 1 auto;
}

.year-input {
  max-width: 140px;
}
</style>
