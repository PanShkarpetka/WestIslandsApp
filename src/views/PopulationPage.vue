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
              <v-card class="population-card">
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
  </section>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

const store = usePopulationStore()
window.store = store;
const islandStore = useIslandStore()

onMounted(() => {
  store.startListener(islandStore.currentId)
  console.log(islandStore.currentId)
});
onBeforeUnmount(() => store.stopListener())

watch(() => islandStore.currentId, (id) => {
  store.startListener(id)
})

const totalPopulation = computed(() => store.totalPopulation)

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
</style>
