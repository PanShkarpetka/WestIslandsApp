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
          <td class="faith-cell">
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
          </td>
          <td>{{ record.faithMax ?? '—' }}</td>
          <td class="downtime-cell">
            <v-icon v-if="record.downtimeAvailable === false" color="success">
              mdi-check-circle
            </v-icon>
            <v-icon v-else color="warning">
              mdi-progress-clock
            </v-icon>
            <span class="downtime-label">
              {{ record.downtimeAvailable === false ? 'Дію виконано' : 'Дію не виконано' }}
            </span>
          </td>
          <td class="bonuses-cell">
            <template v-if="record.activeBonuses?.length">
              <v-chip
                v-for="(bonus, index) in record.activeBonuses"
                :key="`${record.id}-${bonus.id || bonus.name || index}`"
                :color="record.religionColor || 'primary'"
                variant="flat"
                class="mr-2 mb-2"
                size="small"
              >
                {{ bonus.name }}
              </v-chip>
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
</script>

<style scoped>
.table-scroll {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
}

.religion-table {
  background-color: rgba(255, 255, 255, 0.62);
  color: #0f172a;
  min-width: 540px;
}

.religion-table td {
  background-color: transparent;
}

.religion-table th {
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.82);
}

.bonuses-cell {
  min-width: 200px;
}

.religion-table tbody tr:nth-child(even) {
  background-color: rgba(255, 255, 255, 0.6);
}

.sort-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sort-btn:hover {
  text-decoration: underline;
}

.sort-indicator {
  font-size: 12px;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.clickable-row:hover {
  background-color: rgba(255, 255, 255, 0.32);
  transform: translateY(-1px);
}

.clickable-row:focus-visible {
  outline: 2px solid #3f51b5;
  outline-offset: -2px;
}

.faith-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-content: center;
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
}

@media (max-width: 600px) {
  .religion-table {
    font-size: 14px;
    min-width: 100%;
  }

  .faith-cell {
    gap: 8px;
    width: auto;
  }
}
</style>
