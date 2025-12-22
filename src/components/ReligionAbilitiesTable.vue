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
        <template v-for="religion in items" :key="religion.id">
          <tr v-if="!religion.abilities.length">
            <td class="religion-name">{{ religion.name }}</td>
            <td></td>
            <td>Немає доступних умінь</td>
          </tr>
          <tr v-else v-for="(ability, index) in religion.abilities" :key="ability.id">
            <td v-if="index === 0" :rowspan="religion.abilities.length" class="religion-name">{{ religion.name }}</td>
            <td class="ability-name">{{ ability.name }}</td>
            <td class="ability-description">{{ ability.description }}</td>
          </tr>
        </template>
      </tbody>
    </v-table>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
})
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
}

.religion-name {
  font-weight: 600;
  width: 160px;
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
</style>
