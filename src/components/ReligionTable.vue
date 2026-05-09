<template>
  <div class="table-scroll">
    <v-table density="comfortable" class="religion-table">
      <thead>
        <tr>
          <th class="text-left">
            <button type="button" class="sort-btn" @click="emit('toggle-sort', 'heroName')">
              <b>Герой</b>
              <span class="sort-indicator">
                {{ sortDirection === 'desc' ? '▲' : '▼' }}
              </span>
            </button>
          </th>
          <th class="text-left">
            <button type="button" class="sort-btn" @click="emit('toggle-sort', 'religionName')">
              <b>Конфесія</b>
              <span class="sort-indicator">
                {{ sortDirection === 'desc' ? '▲' : '▼' }}
              </span>
            </button>
          </th>
          <th class="text-left">
            <button type="button" class="sort-btn" @click="emit('toggle-sort', 'faith')">
              <b>Очки віри</b>
              <span class="sort-indicator">
                {{ sortDirection === 'desc' ? '▲' : '▼' }}
              </span>
            </button>
          </th>
          <th class="text-left">
            <button type="button" class="sort-btn" @click="emit('toggle-sort', 'faithMax')">
              <b>Макс ОВ</b>
              <span class="sort-indicator">
                {{ sortDirection === 'desc' ? '▲' : '▼' }}
              </span>
            </button>
          </th>
          <th class="text-left">
            <button type="button" class="sort-btn" @click="emit('toggle-sort', 'downtimeAvailable')">
              <b>Дія у циклі</b>
              <span class="sort-indicator">
                {{ sortDirection === 'desc' ? '▲' : '▼' }}
              </span>
            </button>
          </th>
          <th class="text-left">
            <b>Активні бонуси</b>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in records"
          :key="record.id"
          class="clickable-row"
          role="button"
          tabindex="0"
          @click="emit('select', record)"
          @keydown.enter.prevent="emit('select', record)"
        >
          <td>{{ record.heroName }}</td>
          <td>{{ record.religionName }}</td>
          <td>
            <div class="faith-cell">
              <v-icon v-if="hasIcon(record.religionName)">
                <img
                  :src="`/images/religions/${record.religionName}.png`"
                  alt="Faith Icon"
                  width="32"
                  height="32"
                />
              </v-icon>
              <v-icon v-else>
                mdi-dharmachakra
              </v-icon>
              <span>{{ record.faith }}</span>
            </div>
          </td>
          <td>{{ record.faithMax ?? '—' }}</td>
          <td>
            <div class="downtime-cell">
              <v-icon v-if="record.downtimeAvailable === false" color="success">
                mdi-check-circle
              </v-icon>
              <v-icon v-else color="warning">
                mdi-progress-clock
              </v-icon>
              <span class="downtime-label">
                {{ record.downtimeAvailable === false ? 'Дію виконано' : 'Дію не виконано' }}
              </span>
            </div>
          </td>
          <td class="bonuses-cell">
            <template v-if="record.activeBonuses?.length">
              <v-tooltip
                v-for="(bonus, index) in record.activeBonuses"
                :key="`${record.id}-${bonus.id || bonus.name || index}`"
                location="top"
                :text="bonusTooltip(bonus)"
                :disabled="!bonusTooltip(bonus)"
              >
                <template #activator="{ props: tooltipProps }">
                  <v-chip
                    v-bind="tooltipProps"
                    :color="record.religionColor || 'primary'"
                    variant="flat"
                    :class="['mr-2', 'mb-2', bonus.active === false ? 'bonus-chip--inactive' : 'bonus-chip--active']"
                    :style="bonus.active !== false ? { '--chip-glow': record.religionColor || '#c8962a' } : {}"
                    size="small"
                  >
                    {{ bonus.name }}
                  </v-chip>
                </template>
              </v-tooltip>
            </template>
            <span v-else class="text-medium-emphasis">—</span>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
defineProps({
  records: {
    type: Array,
    required: true,
  },
  sortBy: {
    type: String,
    default: '',
  },
  sortDirection: {
    type: String,
    default: 'asc',
  },
  hasIcon: {
    type: Function,
    default: () => false,
  },
})

const emit = defineEmits(['toggle-sort', 'select'])

function bonusTooltip(bonus) {
  const parts = []
  if (bonus?.description) parts.push(bonus.description)
  if (bonus?.active === false) parts.push(bonus.hint || 'Бонус неактивний')
  return parts.join(' • ')
}
</script>

<style scoped>
.table-scroll {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
}

.table-scroll :deep(.v-table__wrapper) {
  overflow: visible;
}

.religion-table { min-width: 540px; }

.religion-table :deep(thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  background: #1a1108 !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

.religion-table :deep(tbody tr td) {
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  border-bottom: 1px solid rgba(90, 62, 32, 0.3) !important;
}


.sort-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sort-btn:hover { color: var(--wi-gold); }
.sort-indicator { font-size: 10px; color: var(--wi-gold); }

.clickable-row { cursor: pointer; transition: background-color 0.18s ease; }
.clickable-row:hover :deep(td) { background: rgba(200,150,42,0.07) !important; }
.clickable-row:focus-visible { outline: 2px solid var(--wi-gold); outline-offset: -2px; }
.bonus-chip--inactive { opacity: 0.5; }

.bonus-chip--active :deep(.v-chip__content) { position: relative; }
.bonus-chip--active {
  animation: chip-glow 2.2s ease-in-out infinite;
  box-shadow: 0 0 6px 1px var(--chip-glow, #c8962a);
}

@keyframes chip-glow {
  0%, 100% { box-shadow: 0 0 4px 1px color-mix(in srgb, var(--chip-glow, #c8962a) 55%, transparent); }
  50%       { box-shadow: 0 0 12px 3px color-mix(in srgb, var(--chip-glow, #c8962a) 90%, transparent); }
}

.bonuses-cell { min-width: 200px; }

.faith-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  width: 100px;
}

.downtime-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

.downtime-label {
  white-space: nowrap;
  font-family: var(--wi-font-body);
}

@media (max-width: 600px) {
  .faith-cell { gap: 8px; width: auto; }
}
</style>
