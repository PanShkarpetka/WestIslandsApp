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
        <v-card class="pa-6 religion-card" elevation="4" width="100%">
          <div class="card-overlay" aria-hidden="true"></div>
          <v-card-text class="px-0 position-relative">
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
                <tr
                  v-for="record in sortedRecords"
                  :key="record.id"
                  class="clickable-row"
                  role="button"
                  tabindex="0"
                  @click="openClergy(record)"
                  @keydown.enter.prevent="openClergy(record)"
                >
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

    <v-dialog v-model="dialogOpen" max-width="840">
      <v-card v-if="activeClergy" class="clergy-dialog" rounded="xl">
        <v-card-title class="d-flex align-center gap-4">
          <div>
            <div class="text-subtitle-1 font-semibold">{{ activeClergy.heroName }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ activeClergy.religionName }}</div>
          </div>
          <v-chip color="primary" variant="elevated" class="ml-auto">
            {{ activeClergy.faith }} <v-icon class="ml-1" size="18">mdi-dharmachakra</v-icon>
          </v-chip>
        </v-card-title>

        <v-card-text class="pt-0">
          <v-alert v-if="actionError" type="error" variant="tonal" class="mb-3">
            {{ actionError }}
          </v-alert>

          <div v-if="isAdmin" class="mb-4 admin-actions">
            <v-text-field
              v-model.number="faithChange"
              type="number"
              min="1"
              label="Зміна очок віри"
              density="comfortable"
              prefix="±"
              hide-details="auto"
            />
            <v-textarea
              v-model="logMessage"
              rows="2"
              auto-grow
              label="Коментар до зміни"
              density="comfortable"
              hide-details="auto"
            />
            <div class="d-flex btns">
              <v-btn color="error" :loading="actionLoading" @click="applyFaithChange('remove')">
                Зняти ОВ
              </v-btn>
              <v-btn color="success" :loading="actionLoading" @click="applyFaithChange('add')">
                Додати ОВ
              </v-btn>
            </div>
          </div>

          <v-card class="log-card">
            <div class="d-flex align-center gap-2 mb-2">
              <v-icon size="18">mdi-history</v-icon>
              <div class="text-subtitle-2 font-medium"><b>Журнал змін</b></div>
            </div>
            <div v-if="logsLoading" class="text-gray-500">Завантаження журналу…</div>
            <div v-else-if="logsError" class="error">{{ logsError }}</div>
            <div v-else-if="clergyLogs.length === 0" class="text-gray-500">Поки що немає записів.</div>
            <v-list v-else density="comfortable">
              <v-list-item v-for="log in clergyLogs" :key="log.id">
                <v-list-item-title>
                  <span :class="{ 'text-success': log.delta > 0, 'text-error': log.delta < 0 }">
                    {{ log.delta > 0 ? '+' : '' }}{{ log.delta }}
                  </span>
                  — {{ log.message || 'Без коментаря' }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatLogMeta(log) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeDialog">Закрити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useReligionStore } from '@/store/religionStore'
import { useUserStore } from '@/store/userStore'

const religionStore = useReligionStore()
const userStore = useUserStore()

onMounted(() => religionStore.startListening())
onBeforeUnmount(() => religionStore.stopListening())

const loading = computed(() => religionStore.loading)
const error = computed(() => religionStore.error)
const records = computed(() => religionStore.records)
const isAdmin = computed(() => userStore?.isAdmin ?? false)

const sortBy = ref('heroName')
const sortDirection = ref('asc')

const dialogOpen = ref(false)
const selectedClergyId = ref('')
const faithChange = ref(null)
const logMessage = ref('')
const actionError = ref('')
const actionLoading = ref(false)

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

const activeClergy = computed(() => records.value.find((item) => item.id === selectedClergyId.value))
const clergyLogs = computed(() => (activeClergy.value ? religionStore.logsByClergy[activeClergy.value.id] || [] : []))
const logsLoading = computed(() => religionStore.logsLoading)
const logsError = computed(() => religionStore.logsError)

function openClergy(record) {
  selectedClergyId.value = record.id
  faithChange.value = null
  logMessage.value = ''
  actionError.value = ''
  dialogOpen.value = true
  religionStore.listenLogs(record.id)
}

function closeDialog() {
  dialogOpen.value = false
  if (selectedClergyId.value) {
    religionStore.stopLogs(selectedClergyId.value)
  }
}

function formatLogMeta(log) {
  const time = log.createdAt ? log.createdAt.toLocaleString('uk-UA') : 'Очікує на час'
  return `${log.user || 'Невідомо'} • ${time}`
}

async function applyFaithChange(mode) {
  if (!isAdmin.value || !activeClergy.value) return
  actionError.value = ''
  const amount = Number(faithChange.value)
  if (!amount || amount <= 0) {
    actionError.value = 'Вкажіть додатню зміну очок віри.'
    return
  }

  const delta = mode === 'remove' ? -amount : amount

  actionLoading.value = true
  try {
    await religionStore.changeFaith({
      clergyId: activeClergy.value.id,
      delta,
      message: logMessage.value,
      user: userStore.nickname || 'Адміністратор',
    })
    faithChange.value = null
    logMessage.value = ''
  } catch (e) {
    actionError.value = e?.message || 'Не вдалося оновити віру.'
  } finally {
    actionLoading.value = false
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

.religion-card {
  position: relative;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.9);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background-image: url('@/images/religions/clergyBackground.jpg');
  background-size: cover;
  background-position: center;
  opacity: 1;
  z-index: 0;
}

.religion-card .v-card-text {
  position: relative;
  z-index: 1;
  backdrop-filter: blur(1px);
  opacity: 0.7;
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

.clergy-dialog .log-card {
  background-color: rgba(63, 81, 181, 0.01);
}
.log-card div {
  margin: 5px;
}

.admin-actions .v-text-field,
.admin-actions .v-textarea {
  margin-bottom: 10px;
}
.btns {
  justify-content: space-evenly;
}
</style>
