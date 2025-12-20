<template>
  <div class="distribution-table-wrapper" :class="{ 'distribution-table-wrapper-hovered': hoveredReligion !== null }">
    <v-table density="comfortable" class="distribution-table">
      <thead>
        <tr>
          <th class="text-left">Конфесія</th>
          <th class="text-left">Віряни</th>
          <th class="text-left">Герої</th>
          <th class="text-left">Частка</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in distribution"
          :key="item.name"
          class="distribution-row"
          role="button"
          tabindex="0"
          :style="rowStyle(item)"
          @mouseenter="handleHover(item)"
          @mouseleave="handleLeave"
          @focus="handleHover(item)"
          @blur="handleLeave"
          @click="emit('select', item)"
          @keydown.enter.prevent="emit('select', item)"
        >
          <td class="distribution-name">
            <span
              class="color-bullet"
              :style="{ backgroundColor: item.color }"
              aria-hidden="true"
            ></span>
            {{ item.name }}
          </td>
          <td>{{ item.followers.toLocaleString('uk-UA') }}</td>
          <td>{{ item.heroes }}</td>
          <td>{{ item.percentRounded }}%</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
const props = defineProps({
  distribution: {
    type: Array,
    required: true,
  },
  hoveredReligion: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['hover', 'leave', 'select'])

function withAlpha(hex, alpha) {
  const value = hex?.startsWith('#') ? hex.slice(1) : hex
  if (!value) return hex

  const expanded = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value

  if (expanded.length !== 6) return hex

  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function rowStyle(item) {
  const isActive = props.hoveredReligion?.name === item.name

  return {
    '--row-color': item.color,
    backgroundColor: isActive ? withAlpha(item.color, 0.1) : undefined,
    cursor: 'pointer',
  }
}

function handleHover(item) {
  emit('hover', item)
}

function handleLeave() {
  emit('leave')
}
</script>

<style scoped>
.distribution-table-wrapper {
  margin-top: 12px;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.distribution-table-wrapper-hovered {
  opacity: 0.5;
}

.distribution-table th {
  background-color: #fff;
  font-weight: 700;
}

.distribution-table td {
  background-color: transparent;
}

.distribution-row {
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.distribution-row:hover,
.distribution-row:focus-visible {
  background-color: color-mix(in srgb, var(rgba(0, 0, 0, 0.08)) 20%, transparent);
}

.distribution-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.color-bullet {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}
</style>
