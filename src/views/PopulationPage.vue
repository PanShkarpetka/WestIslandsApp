<template>
  <section class="space-y-6">

    <div v-if="store.loading" class="text-gray-500">Завантаження…</div>
    <div v-else-if="store.items.length === 0" class="text-gray-500">Немає даних.</div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Легенда + голоси -->
      <section class="v-container">
        <v-container>
          <v-row class="population-cards">
            <v-col v-for="g in viewRows" :key="g.id" cols="12" sm="6" md="4" lg="3">
              <v-card
                  class="population-card"
                  :class="{ 'card-clickable': isAdmin }"
                  :ripple="isAdmin"
                  @click="openEditor(g)"
              >
                <v-img
                    :src="g.imageUrl"
                    cover
                    class="group-image"
                >
                  <div class="card-content">
                    <div class="card-overlay">
                      <p class="overlay-desc">
                        {{ g.description || '—' }}
                      </p>
                    </div>
                    <div class="mt-auto text-right group-details">
                      <div class="text-xl font-bold drop-shadow-sm">{{ g.percentRounded }}%</div>
                      <div class="text-xs opacity-90 drop-shadow">{{ g.count }} осіб<!-- • {{ g.votesRounded }} голосів--></div>
                    </div>
                    <div v-if="isAdmin" class="edit-hint">Натисніть, щоб редагувати</div>
                  </div>
                </v-img>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>
      <!-- Pie -->
      <div class="lg:col-span-3 bg-white rounded-xl border p-4 chart-wrap">
        <div class="text-sm text-gray-500 pie-title">
          Разом: <b>{{ totalPopulation }}</b> осіб<!-- • Голосів загалом: <b>10</b>-->
        </div>
        <Pie :data="chartData" :options="chartOptions" />
      </div>

    </div>
    <v-dialog v-model="showEditor" max-width="640">
      <v-card>
        <v-card-title class="flex items-center justify-between">
          <span>Налаштування груп</span>
          <v-btn icon="mdi-close" variant="text" @click="closeEditor" :disabled="saving" />
        </v-card-title>
        <v-card-text v-if="editedGroups.length">
          <p class="text-sm text-gray-600 mb-4">Змініть кількість для кожної групи. Якщо сума перевищує населення острова, зменшіть інші групи.</p>

          <div
              v-for="g in editedGroups"
              :key="g.id"
              class="group-row"
              :class="{ 'group-selected': selectedGroup?.id === g.id }"
          >
            <div class="group-row-header">
              <div>
                <div class="text-base font-semibold">{{ g.name }}</div>
                <div class="text-xs text-gray-500">Було: {{ g.count }} осіб • {{ g.percentRounded }}%</div>
              </div>
<!--              <div v-if="selectedGroup?.id === g.id" class="chip">Відкрито</div>-->
            </div>

            <div class="slider-row">
              <v-slider
                  v-model.number="g.newCount"
                  :min="0"
                  :max="sliderCeiling"
                  step="1"
                  color="primary"
                  thumb-label="always"
                  hide-details
              />
              <v-text-field
                  v-model.number="g.newCount"
                  type="number"
                  label="Кількість"
                  density="comfortable"
                  hide-details
                  class="count-input"
                  variant="outlined"
                  :min="0"
              />
            </div>

            <div class="text-xs text-gray-600 mt-1">Буде: <b>{{ g.newCount || 0 }}</b> осіб (≈ {{ percentFor(g.newCount) }}%)</div>
          </div>

          <div class="mt-4 text-sm text-gray-700">
            Загалом: <b>{{ editedTotal }}</b> з {{ totalPopulation }} осіб
          </div>
          <p v-if="overLimit" class="error-text mt-2">Сума груп перевищує населення острова. Зменште інші значення на {{ Math.abs(remaining) }}.</p>
          <p v-else class="text-xs text-gray-500 mt-1">Залишок: {{ remaining }} осіб</p>
          <p v-if="error" class="error-text mt-2">{{ error }}</p>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeEditor" :disabled="saving">Скасувати</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="saving || overLimit" @click="saveGroup">Зберегти</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { useUserStore } from '@/store/userStore'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

const store = usePopulationStore()
window.store = store;
const islandStore = useIslandStore()
const userStore = useUserStore()

onMounted(() => {
  store.startListener(islandStore.currentId)
  console.log(islandStore.currentId)
});
onBeforeUnmount(() => store.stopListener())

watch(() => islandStore.currentId, (id) => {
  store.startListener(id)
})

const totalPopulation = computed(() => store.totalPopulation)
const isAdmin = computed(() => userStore?.isAdmin ?? false)

const palette = {
  'Селяни': '#22c55e',
  'Моряки': '#3b82f6',
  'Робітники': '#f59e0b',
  _fallback: ['#60a5fa','#f472b6','#34d399','#fbbf24','#a78bfa','#f87171']
}

const viewRows = computed(() => {
  let i = 0
  return store.groupsAugmented.map(g => ({
    ...g,
    color: palette[g.name] || palette._fallback[i++ % palette._fallback.length]
  }))
})

const chartData = computed(() => ({
  labels: viewRows.value.map(g => g.name),
  datasets: [{
    data: viewRows.value.map(g => g.percentRounded),
    backgroundColor: viewRows.value.map(g => g.color),
    borderColor: '#ffffff',
    borderWidth: 2,
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom' },
    title: { display: true, text: 'Групи населення' },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const g = viewRows.value[ctx.dataIndex]
          // return `${g.name}: ${g.percentRounded}% (${g.count} осіб, ${g.votesRounded} голосів)`
          return `${g.name}: ${g.percentRounded}% (${g.count} осіб`
        }
      }
    }
  }
}

const showEditor = ref(false)
const selectedGroup = ref(null)
const editedGroups = ref([])
const saving = ref(false)
const error = ref('')

const sliderCeiling = computed(() => {
  const base = totalPopulation.value || 0
  const maxValue = editedGroups.value.reduce((m, g) => Math.max(m, Number(g.newCount) || 0), 0)
  return Math.max(base, maxValue, 100)
})

const editedTotal = computed(() =>
  editedGroups.value.reduce((sum, g) => sum + (Number(g.newCount) || 0), 0)
)

const remaining = computed(() => (totalPopulation.value || 0) - editedTotal.value)
const overLimit = computed(() => remaining.value < 0)

function percentFor(value) {
  const total = totalPopulation.value || editedTotal.value || 1
  return Math.round(((Number(value) || 0) / total * 100) * 10) / 10
}

function openEditor(group) {
  if (!isAdmin.value) return
  selectedGroup.value = group
  editedGroups.value = store.groupsAugmented.map((g) => ({
    ...g,
    newCount: g.count || 0,
  }))
  error.value = ''
  showEditor.value = true
}

function closeEditor() {
  if (!saving.value) showEditor.value = false
}

async function saveGroup() {
  if (!editedGroups.value.length) { error.value = 'Немає груп для збереження.'; return }
  if (overLimit.value) { error.value = 'Сума груп перевищує населення острова.'; return }
  saving.value = true
  error.value = ''
  try {
    const updates = editedGroups.value.map((g) => store.setGroupCount(g.id, g.newCount))
    await Promise.all(updates)
    showEditor.value = false
  } catch (e) {
    error.value = e?.message || 'Не вдалося зберегти'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.chart-wrap { height: 380px; }
.pie-title {
  margin-left: 15px;
  margin-top: 15px;
  position: absolute;
}
.v-row {
  margin: 0;
}
.v-card {
  height: 420px;
  padding: 0;
}
.v-container {
  padding: 0;
}
.group-image {
  min-height: 300px;
  max-height: 500px;
}
.population-cards {
  justify-content: space-evenly;
}
.population-card {
  min-height: 300px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  background: transparent;
}
.card-clickable {
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
}
.card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0,0,0,.25);
}

.group-image {
  flex: 1;
  background-size: cover;
  background-position: center;
}
.card-content {
  padding-top: 50px;
}
.group-details {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  text-align: right;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.6);
}
.edit-hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 2;
  font-size: 12px;
  color: #e0f2fe;
  background: rgba(0,0,0,.35);
  padding: 6px 10px;
  border-radius: 9999px;
  backdrop-filter: blur(2px);
  text-shadow: 0 1px 2px rgba(0,0,0,.5);
}
.card-stats .percent { font-weight: 700; font-size: 1.25rem; line-height: 1.2; }
.card-stats .count   { font-size: .875rem; opacity: .95; }

.card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;          /* опис внизу; поставь center якщо треба по центру */
  padding: 16px;
  color: #fff;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity .2s ease;
}
.population-card:hover .card-overlay { opacity: 1; }

.overlay-desc {
  font-size: .9rem;
  line-height: 1.35;
  margin: 0;
}
.population-card:hover .group-details {
  opacity: 0;
}

.slider-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
  align-items: center;
}

.count-input :deep(input) {
  text-align: center;
}

.group-row {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.group-row + .group-row {
  margin-top: 12px;
}

.group-selected {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96,165,250,0.25);
}

.group-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #e0f2fe;
  color: #0ea5e9;
}

.error-text {
  color: #dc2626;
}
</style>
