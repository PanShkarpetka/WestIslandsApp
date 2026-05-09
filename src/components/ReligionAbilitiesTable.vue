<template>
  <div class="abilities-table-wrapper">
    <v-table density="comfortable" class="abilities-table">
      <thead>
        <tr>
          <th class="text-left">Конфесія</th>
          <th class="text-left">Майлстоун % послідовників</th>
          <th class="text-left">Вміння</th>
          <th class="text-left">Опис</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in tableRows"
          :key="row.key"
          class="abilities-row"
          :class="{ 'ability-active': row.isActive, 'religion-group-start': row.showReligionCell }"
          :style="rowStyle(row.religion)"
        >
          <td v-if="row.showReligionCell" :rowspan="row.rowspan" class="religion-name">
            <span class="color-bullet" :style="{ backgroundColor: row.religion.color }"></span>
            {{ row.religion.name }}
          </td>
          <td class="milestone" :class="{ 'text-no-abilities': row.isEmpty }">
            <template v-if="row.isEmpty"></template>
            <template v-else>
              <v-icon v-if="!row.isActive" size="11" class="milestone-lock">mdi-lock</v-icon>
              {{ row.milestoneLabel }}
            </template>
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
    const milestoneAbilities = Array.isArray(religion.milestoneAbilities)
      ? religion.milestoneAbilities
      : []

    const visibleMilestones = getVisibleMilestoneAbilities(
      milestoneAbilities,
      religion.followersPercent,
    )

    const totalRows = Math.max(abilities.length + visibleMilestones.length, 1)

    const combinedRows = [
      ...abilities.map((ability, index) => ({
        key: `${religion.id}-${ability.id || index}`,
        religion,
        ability,
        milestoneLabel: ability.milestoneLabel || 'Базові',
        showReligionCell: index === 0,
        rowspan: totalRows,
        isEmpty: false,
        isActive: ability.active !== false,
      })),
      ...visibleMilestones.map((item, index) => ({
        key: `${religion.id}-milestone-${item.key || index}`,
        religion,
        ability: item.ability,
        milestoneLabel: item.milestoneLabel ?? '',
        showReligionCell: abilities.length === 0 && index === 0,
        rowspan: totalRows,
        isEmpty: false,
        isActive: isMilestoneActive(item, religion.followersPercent),
      })),
    ]

    if (combinedRows.length === 0) {
      return [
        {
          key: `${religion.id}-empty`,
          religion,
          ability: null,
          milestoneLabel: '—',
          showReligionCell: true,
          rowspan: 1,
          isEmpty: true,
          isActive: false,
        },
      ]
    }

    return combinedRows.map((row, index) => ({
      ...row,
      showReligionCell: index === 0,
    }))
  })
)

function rowStyle(religion) {
  return {
    '--accent-color': religion.color || '#e5e7eb',
  }
}

function getVisibleMilestoneAbilities(milestoneAbilities, followersPercent = 0) {
  if (!Array.isArray(milestoneAbilities) || milestoneAbilities.length === 0) return []

  const milestones = Array.from(
    new Set(
      milestoneAbilities
        .map((item) => Number.isFinite(item.milestone) ? item.milestone : null)
        .filter((value) => value !== null),
    ),
  ).sort((a, b) => a - b)

  if (milestones.length === 0) return []

  const nextMilestone = milestones.find((milestone) => milestone > followersPercent)
  const maxVisible = nextMilestone ?? milestones[milestones.length - 1]

  return milestoneAbilities.filter((item) =>
    Number.isFinite(item.milestone) ? item.milestone <= maxVisible : false,
  )
}

function isMilestoneActive(item, followersPercent = 0) {
  return Number.isFinite(item.milestone) && item.milestone <= followersPercent
}
</script>

<style scoped>
.abilities-table-wrapper { width: 100%; overflow-x: auto; }

.abilities-table { min-width: 640px; }

.abilities-table :deep(thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  background: #1a1108 !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

.abilities-table :deep(tbody tr td) {
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  border-bottom: none !important;
  vertical-align: top;
  padding-left: 16px;
  background: transparent !important;
}

.abilities-table :deep(td.religion-name) { vertical-align: middle; }

.abilities-row {
  position: relative;
  transition: background-color 0.2s ease;
}

.abilities-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background-color: var(--accent-color, var(--wi-border));
}

.abilities-row::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 1px;
  background-color: rgba(90, 62, 32, 0.35);
  pointer-events: none;
}

.religion-group-start:not(:first-child) :deep(td) {
  border-top: 2px solid var(--wi-border) !important;
}

.abilities-row:hover :deep(td),
.abilities-row:focus-visible :deep(td) { background: rgba(200,150,42,0.07) !important; }

.ability-active { background-color: color-mix(in srgb, var(--accent-color, var(--wi-gold)) 10%, transparent); }

/* Inactive / locked milestone rows — cross-hatch overlay */
.abilities-row:not(.ability-active) {
  background-image:
    repeating-linear-gradient(
      45deg,
      rgba(90, 62, 32, 0.38) 0px,
      rgba(90, 62, 32, 0.38) 1px,
      transparent 1px,
      transparent 9px
    ),
    repeating-linear-gradient(
      -45deg,
      rgba(90, 62, 32, 0.38) 0px,
      rgba(90, 62, 32, 0.38) 1px,
      transparent 1px,
      transparent 9px
    );
}

.milestone-lock {
  opacity: 0.55;
  vertical-align: middle;
  margin-right: 3px;
}

.religion-name {
  font-family: var(--wi-font-heading);
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  width: 160px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.milestone {
  width: 120px;
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--accent-color, var(--wi-gold));
}

.ability-name { font-family: var(--wi-font-body); color: var(--wi-text); }

.ability-description {
  white-space: pre-line;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
}

.text-no-abilities { color: var(--wi-text-muted); font-style: italic; }

.color-bullet {
  width: 12px; height: 12px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
}
</style>
