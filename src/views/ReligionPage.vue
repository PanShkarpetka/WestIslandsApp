<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Релігії острова
        </h1>
      </v-col>
    </v-row>

    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12">
        <v-card class="pa-6" elevation="4" width="100%">
          <v-card-text class="px-0">
            <div v-if="loading" class="text-gray-500">Завантаження…</div>
            <div v-else-if="error" class="error">{{ error }}</div>
            <div v-else-if="records.length === 0" class="text-gray-500">Немає даних.</div>

            <v-table v-else density="comfortable" class="religion-table">
              <thead>
                <tr>
                  <th class="text-left">
                    <button type="button" class="sort-btn" @click="toggleSort('heroName')">
                      <b>Герой</b>
                      <span class="sort-indicator">
                        {{ sortDirection === 'desc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th class="text-left">
                    <button type="button" class="sort-btn" @click="toggleSort('religionName')">
                      <b>Духовенство</b>
                      <span class="sort-indicator">
                        {{ sortDirection === 'desc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                  <th class="text-left">
                    <button type="button" class="sort-btn" @click="toggleSort('faith')">
                      <b>Очки віри</b>
                      <span class="sort-indicator">
                        {{ sortDirection === 'desc' ? '▲' : '▼' }}
                      </span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in sortedRecords" :key="record.id">
                  <td>{{ record.heroName }}</td>
                  <td>{{ record.religionName }}</td>
                  <td>{{ record.faith }} <v-icon>mdi-dharmachakra</v-icon></td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useReligionStore } from '@/store/religionStore'

const religionStore = useReligionStore()

onMounted(() => religionStore.startListening())
onBeforeUnmount(() => religionStore.stopListening())

const loading = computed(() => religionStore.loading)
const error = computed(() => religionStore.error)
const records = computed(() => religionStore.records)

const sortBy = ref('heroName')
const sortDirection = ref('asc')

const sortedRecords = computed(() => {
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return records.value.slice().sort((a, b) => {
    const field = sortBy.value
    const aVal = a[field]
    const bVal = b[field]

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir
    }

    return aVal.localeCompare(bVal, 'uk', { sensitivity: 'base' }) * dir
  })
})

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDirection.value = 'asc'
  }
}
</script>
<style scoped>
.error{ color:#dc2626; font-size: 15px; margin-top: 8px; }

.religion-table th { font-weight: 600; }
.religion-table tbody tr:nth-child(even) { background-color: rgba(0,0,0,0.02); }
.sort-btn { background: none; border: none; padding: 0; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.sort-btn:hover { text-decoration: underline; }
.sort-indicator { font-size: 12px; }
</style>
