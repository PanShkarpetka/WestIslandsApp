<template>
  <div class="abilities-table-wrapper">
    <v-table density="comfortable" class="abilities-table">
      <thead>
        <tr>
          <th class="text-left">Конфесія</th>
          <th class="text-left">Вміння</th>
          <th class="text-left">Опис</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in tableRows"
          :key="row.key"
          class="abilities-row"
          :style="rowStyle(row.religion)"
        >
          <td v-if="row.showReligionCell" :rowspan="row.rowspan" class="religion-name">
            <span class="color-bullet" :style="{ backgroundColor: row.religion.color }"></span>
            {{ row.religion.name }}
          </td>
          <td class="ability-name">
            <template v-if="row.ability">{{ row.ability.name }}</template>
          </td>
          <td class="ability-description" :class="{ 'text-no-abilities': row.isEmpty }">
            <template v-if="row.ability">{{ row.ability.description }}</template>
            <template v-else>Немає доступних умінь</template>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const tableRows = computed(() =>
  props.items.flatMap((religion) => {
    const abilities = Array.isArray(religion.abilities) ? religion.abilities : []

    if (abilities.length === 0) {
      return [
        {
          key: `${religion.id}-empty`,
          religion,
          ability: null,
          showReligionCell: true,
          rowspan: 1,
          isEmpty: true,
        },
      ]
    }

    return abilities.map((ability, index) => ({
      key: `${religion.id}-${ability.id || index}`,
      religion,
      ability,
      showReligionCell: index === 0,
      rowspan: abilities.length,
      isEmpty: false,
    }))
  })
)

function rowStyle(religion) {
  return {
    '--accent-color': religion.color || '#e5e7eb',
  }
}
</script>

<style scoped>
.abilities-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.abilities-table {
  background-color: rgba(255, 255, 255, 0.62);
  color: #0f172a;
  min-width: 640px;
}

.abilities-table th {
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.82);
}

.abilities-table td {
  background-color: transparent;
  vertical-align: top;
  padding-left: 16px;
}

.abilities-table td.religion-name {
  vertical-align: middle;
}

.abilities-row {
  position: relative;
  transition: background-color 0.2s ease;
}
:root {
  --accent-color: #e5e7eb;
}
.abilities-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: var(--accent-color, #e5e7eb);
}

.abilities-row::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background-color: #e8eaed;
  pointer-events: none;
}

.abilities-row:hover,
.abilities-row:focus-visible {
  background-color: color-mix(in srgb, rgba(0, 0, 0, 0.08) 20%, transparent);
}

.religion-name {
  font-weight: 600;
  width: 160px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ability-name {
  font-family: cursive;
}

.ability-description {
  white-space: pre-line;
}

.text-no-abilities {
  color: #6b7280;
  font-style: italic;
}

.color-bullet {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}
</style>
