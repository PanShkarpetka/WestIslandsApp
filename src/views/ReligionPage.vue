<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Релігії острова (В розробці)
        </h1>
      </v-col>
    </v-row>

    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12">
        <v-card class="pa-6 religion-card" elevation="4" width="100%">
          <div
            class="card-overlay"
            aria-hidden="true"
          ></div>
          <v-card-text class="px-0 position-relative">
            <div v-if="loading" class="text-gray-500">Завантаження…</div>
            <div v-else-if="error" class="error">{{ error }}</div>
            <div v-else-if="records.length === 0" class="text-gray-500">Немає даних.</div>

            <section v-else class="distribution-section section-overlay" :style="sectionBackgroundStyle">
              <header class="distribution-header">
                <div>
                  <p class="text-sm text-medium-emphasis mb-1">Розподіл населення</p>
                  <p class="text-h6 font-semibold">{{ totalFollowersLabel }}</p>
                  <p class="text-caption text-medium-emphasis">Населення острова: {{ totalPopulationLabel }}</p>
                </div>
                <v-btn-toggle
                  v-model="viewMode"
                  mandatory
                  density="comfortable"
                  color="primary"
                  variant="tonal"
                  class="view-toggle"
                >
                  <v-btn value="diagram" prepend-icon="mdi-chart-donut">Діаграма</v-btn>
                  <v-btn value="table" prepend-icon="mdi-table">Таблиця</v-btn>
                </v-btn-toggle>
                <v-chip color="primary" variant="tonal" class="chart-chip">
                  {{ distribution.length }} конфесій
                </v-chip>
              </header>

              <template v-if="distribution.length">
                <ReligionDistributionDiagram
                  v-if="viewMode === 'diagram'"
                  :chart-data="chartData"
                  :chart-options="chartOptions"
                />
                <ReligionDistributionTable
                  v-else
                  :distribution="distribution"
                  :hovered-religion="hoveredReligion"
                  @hover="hoveredReligion = $event"
                  @leave="hoveredReligion = null"
                  @select="handleSliceClick"
                />
              </template>
              <div v-else class="text-gray-500">Немає інформації про конфесії.</div>

              <v-divider class="my-6" />
            </section>

            <ReligionTable
              v-if="records.length"
              :records="sortedRecords"
              :sort-by="sortBy"
              :sort-direction="sortDirection"
              :has-icon="hasIcon"
              @toggle-sort="toggleSort"
              @select="openClergy"
            />
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
            {{ activeClergy.faith }}
            <v-icon v-if="hasIcon(activeClergy.religionName)">
              <img
                  :src="`/images/religions/${activeClergy.religionName}.png`"
                  alt="Faith Icon"
                  width="16"
                  height="16"
              />
            </v-icon>
            <v-icon v-else class="ml-1" size="18">
              mdi-dharmachakra
            </v-icon>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useReligionStore } from '@/store/religionStore'
import { useUserStore } from '@/store/userStore'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { Chart as ChartJS, ArcElement, Legend, Title, Tooltip } from 'chart.js'
import ReligionDistributionDiagram from '@/components/ReligionDistributionDiagram.vue'
import ReligionDistributionTable from '@/components/ReligionDistributionTable.vue'
import ReligionTable from '@/components/ReligionTable.vue'

const iconCache = new Map()

const religionStore = useReligionStore()
const userStore = useUserStore()
const populationStore = usePopulationStore()
const islandStore = useIslandStore()
const hoveredReligion = ref(null)
const viewMode = ref('diagram')
const defaultCardBackground = ''

function hasIcon(name) {
  switch (name) {
    case 'Амберлі':
    case 'Блібдулпулп':
    case 'Панцуріель':
    case 'Істишія':
    case 'Девіл':
    case 'Ашкарот':
    case 'Трійка':
    case 'Четвірка':
      return true
    default:
      return false
  }
}

function getIconImage(name) {
  if (!iconCache.has(name)) {
    const img = new Image()
    img.src = `/images/religions/${name}.png`
    iconCache.set(name, img)
  }
  return iconCache.get(name)
}

const religionImages = {
  Панцуріель: 'Panzuriel',
  Амберлі: 'Umberlee',
  Ашкарот: 'Ashkarot',
  Девіл: 'Devil',
  'Не визначено': 'Unknown',
  Відсутність: 'Godless',
  Трійка: 'trio',
  Четвірка: 'quadro',
  Блібдулпулп: 'Blibdoolpoolp',
  Істишія: 'Istishia'
}

function getCenterImage(name) {
  return name ? religionImages[name] : 'Unknown';
}

const religionIconPlugin = {
  id: 'religionIcons',
  afterDatasetDraw(chart, args, pluginOptions) {
    if (args.index !== 0) return

    const items = pluginOptions?.distribution || []
    const minPercent = pluginOptions?.minPercent ?? 6
    const baseSize = pluginOptions?.baseSize ?? 20
    const sizeScale = pluginOptions?.sizeScale ?? 1.2
    const radialPosition = pluginOptions?.radialPosition ?? 0.62
    const elements = chart.getDatasetMeta(args.index).data

    const ctx = chart.ctx

    elements.forEach((element, index) => {
      const item = items[index]
      if (!item || item.percentRounded < minPercent) return

      const icon = getIconImage(item.name)
      if (!icon) return
      if (!icon.complete) {
        icon.onload = () => chart.draw()
        return
      }

      const angle = (element.startAngle + element.endAngle) / 2
      const radius = element.innerRadius + (element.outerRadius - element.innerRadius) * radialPosition
      const size = Math.min(
        element.outerRadius - element.innerRadius,
        baseSize + item.percent * sizeScale,
      )

      const x = element.x + Math.cos(angle) * radius
      const y = element.y + Math.sin(angle) * radius

      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, size / 2 + 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.fill()
      ctx.drawImage(icon, x - size / 2, y - size / 2, size, size)
      ctx.restore()
    })
  },
}

ChartJS.register(ArcElement, Tooltip, Legend, Title, religionIconPlugin)

onMounted(() => religionStore.startListening())
onBeforeUnmount(() => religionStore.stopListening())

onMounted(() => {
  populationStore.startListener(islandStore.currentId)
})

onBeforeUnmount(() => populationStore.stopListener())

const loading = computed(() => religionStore.loading)
const error = computed(() => religionStore.error)
const records = computed(() => religionStore.records)
const isAdmin = computed(() => userStore?.isAdmin ?? false)
const totalPopulation = computed(() => populationStore.totalPopulation || 0)

const heroCountsByReligion = computed(() => {
  const result = new Map()

  for (const record of records.value) {
    const religionName = record.religionName || 'Невідома релігія'
    const current = result.get(religionName) || { heroes: 0 }
    current.heroes += 1
    result.set(religionName, current)
  }

  return result
})

const followersByReligion = computed(() => {
  const result = new Map()

  for (const religion of religionStore.religions) {
    const name = religion.name || 'Невідома релігія'
    result.set(name, {
      name,
      followers: Number(religion.followers ?? 0),
      heroes: heroCountsByReligion.value.get(name)?.heroes || 0,
      buildingLevel: religion.buildingLevel || '—',
      buildingFaithIncome: religion.buildingFaithIncome,
      farmBase: Number(religion.farmBase),
      farmDCBase: Number(religion.farmDCBase),
      shieldActive: Boolean(religion.shieldActive),
      shieldBonus: Number(religion.shieldBonus),
      svTemp: Number(religion.svTemp),
      svBase: Number(religion.svBase),
      minSpreadFollowersResult: Number(religion.minSpreadFollowersResult),
    })
  }

  for (const [name, stats] of heroCountsByReligion.value.entries()) {
    if (!result.has(name)) {
      result.set(name, {
        name,
        followers: 0,
        heroes: stats.heroes,
        buildingLevel: '—',
        farmName: '—',
        farmDCBase: 0,
        farmDCBonus: 0,
        shieldActive: false,
        shieldBonus: 0,
        svTemp: 0,
      })
    }
  }

  return Array.from(result.values())
})

const distribution = computed(() => {
  const totalFollowers = followersByReligion.value.reduce((sum, item) => sum + item.followers, 0)
  const populationBase = totalPopulation.value || totalFollowers || 1

  return followersByReligion.value
    .map((item) => {
      const percent = (item.followers / populationBase) * 100
      return {
        ...item,
        percent,
        percentRounded: Math.round(percent * 10) / 10,
        color: getReligionColor(item.name),
      }
    })
    .sort((a, b) => b.followers - a.followers)
})

const totalFollowersLabel = computed(() => {
  const total = followersByReligion.value.reduce((sum, item) => sum + item.followers, 0)
  return total.toLocaleString('uk-UA') + ' вірян'
})

const totalPopulationLabel = computed(() => (totalPopulation.value || 0).toLocaleString('uk-UA'))
const religionColors = {
  Панцуріель: '#000000',
  Амберлі: '#1e3a8a',
  Девіл: '#8b0000',
  'Не визначено': '#7e8694',
  Атеїзм: '#fafcfc',
  Трійка: '#6a80d9',
  Четвірка: '#090070',
  Блібдулпулп: '#e8a77b',
  Істишія: '#45d1ca'
}

const fallbackPalette = ['#c7d2fe', '#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#f87171', '#a78bfa']
const colorCache = new Map()

function getReligionColor(name) {
  if (religionColors[name]) return religionColors[name]

  if (!colorCache.has(name)) {
    const index = colorCache.size % fallbackPalette.length
    colorCache.set(name, fallbackPalette[index])
  }

  return colorCache.get(name)
}

const chartData = computed(() => ({
  labels: distribution.value.map((item) => item.name),
  datasets: [
    {
      data: distribution.value.map((item) => item.followers || 0),
      backgroundColor: distribution.value.map((item) => item.color),
      borderColor: '#ffffff',
      borderWidth: 1,
      hoverOffset: 8,
    },
  ],
}))

function getTooltipLabel(item) {
  if (!item) return ''
  return `${item.name}: ${item.percentRounded}% • ${item.followers} вірян • ${item.heroes} героїв`
}

function getOrCreateTooltip(chart) {
  const parent = chart.canvas.parentNode
  if (!parent) return null

  let tooltipEl = parent.querySelector('.chart-tooltip')

  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'chart-tooltip'
    tooltipEl.innerHTML = '<div class="chart-tooltip__content"></div>'
    parent.appendChild(tooltipEl)
  }

  return tooltipEl
}

const externalTooltipHandler = (context) => {
  const { chart, tooltip } = context
  const tooltipEl = getOrCreateTooltip(chart)
  if (!tooltipEl) return

  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0'
    return
  }

  const tooltipContent = tooltipEl.querySelector('.chart-tooltip__content')
  const item = distribution.value[tooltip.dataPoints?.[0]?.dataIndex]

  if (tooltipContent) {
    tooltipContent.textContent = getTooltipLabel(item)
  }

  const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas

  tooltipEl.style.opacity = '1'
  tooltipEl.style.left = `${positionX + tooltip.caretX}px`
  tooltipEl.style.top = `${positionY + tooltip.caretY}px`
  tooltipEl.style.transform = 'translate(-50%, -100%) translateY(-8px)'
}

function handleSliceClick(item) {
  if (!item) return
  console.info('[religion] slice clicked:', item.name)
}

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: true, text: 'Конфесії' },
    tooltip: {
      enabled: false,
      external: externalTooltipHandler,
    },
    religionIcons: {
      distribution: distribution.value,
      minPercent: 6,
    },
  },
  onHover: (_evt, elements, chart) => {
    hoveredReligion.value = elements.length ? distribution.value[elements[0].index] : null;
    const canvas = chart?.canvas;
    if (!canvas) return;

    canvas.style.opacity = elements.length ? '0.5' : '1';
  },
  onClick: (_evt, elements) => {
    if (!elements.length) return
    const index = elements[0].index
    handleSliceClick(distribution.value[index])
  },
}))

const sectionBackgroundStyle = computed(() => {
  const name = hoveredReligion.value?.name
  const imageUrl = name
    ? `/images/religions/${getCenterImage(name)}.png`
    : defaultCardBackground

  return {
    backgroundImage: `url('${imageUrl}')`,
  }
})

watch(
  () => islandStore.currentId,
  (id) => {
    populationStore.startListener(id)
  },
)

watch(distribution, () => {
  hoveredReligion.value = null
})

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
.error {
  color: #dc2626;
  font-size: 15px;
  margin-top: 8px;
}

.view-toggle {
  margin-left: auto;
}

.religion-card {
  position: relative;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.9);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background-image: url('@/images/religions/clergyBackground.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 1;
  z-index: 0;
}

.section-overlay {
  inset: 0;
  z-index: 0;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 55% !important;
}

.religion-card .v-card-text {
  position: relative;
  z-index: 1;
}

.distribution-section {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 16px 16px 0;
}

.distribution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.chart-chip {
  font-weight: 600;
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

@media (max-width: 960px) {
  .distribution-section {
    padding: 12px 12px 0;
  }

  .distribution-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-overlay {
    background-size: 65% !important;
  }
}

@media (max-width: 600px) {
  .section-overlay {
    background-size: 80% !important;
  }
}
</style>
