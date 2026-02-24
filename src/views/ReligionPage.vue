<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Релігії острова
        </h1>
      </v-col>
    </v-row>

    <v-row class="my-4">
      <v-col cols="12">
        <v-alert
          v-if="latestCycleError"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ latestCycleError }}
        </v-alert>

        <v-skeleton-loader
          v-else-if="latestCycleLoading"
          type="heading, subtitle"
          class="pa-4"
        />

        <v-card v-else class="pa-4" variant="tonal">
          <div class="current-cycle-header">
            <v-avatar color="primary" variant="elevated">
              <v-icon>mdi-timeline-clock</v-icon>
            </v-avatar>
            <div class="current-cycle-text">
              <div class="text-overline text-medium-emphasis mb-1">Поточний цикл</div>
              <div class="text-subtitle-1 font-semibold">{{ currentCycleHeadline }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ currentCycleDetails }}</div>
            </div>
          </div>
        </v-card>
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
                <div class="distribution-actions">
                  <v-btn
                    v-if="isAdmin"
                    color="primary"
                    prepend-icon="mdi-play-circle-outline"
                    @click="openNewCycleDialog"
                  >
                    Почати новий цикл
                  </v-btn>
                  <v-btn-toggle
                    v-model="viewMode"
                    mandatory
                    density="comfortable"
                    color="primary"
                    variant="tonal"
                    class="view-toggle"
                  >
                    <v-btn
                      value="diagram"
                      prepend-icon="mdi-chart-donut"
                      aria-label="Діаграма"
                      class="view-toggle__btn"
                    >
                      <span class="toggle-label">Діаграма</span>
                    </v-btn>
                    <v-btn
                      value="table"
                      prepend-icon="mdi-table"
                      aria-label="Таблиця"
                      class="view-toggle__btn"
                    >
                      <span class="toggle-label">Таблиця</span>
                    </v-btn>
                    <v-btn
                      value="abilities"
                      prepend-icon="mdi-shield-sword"
                      aria-label="Здібності"
                      class="view-toggle__btn"
                    >
                      <span class="toggle-label">Здібності</span>
                    </v-btn>
                  </v-btn-toggle>
                </div>
                <v-chip color="primary" variant="tonal" class="chart-chip">
                  {{ distribution.length }} конфесій
                </v-chip>
              </header>

              <template v-if="viewMode === 'abilities'">
                <ReligionAbilitiesTable
                  v-if="religionAbilitiesTable.length"
                  :items="religionAbilitiesTable"
                />
                <div v-else class="text-gray-500">Немає інформації про конфесії.</div>
              </template>
              <template v-else>
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
              </template>

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

    <ReligionModals
      v-model:open="dialogOpen"
      v-model:faith-change="faithChange"
      v-model:log-message="logMessage"
      v-model:active-faith-farm-form="activeFaithFarmForm"
      v-model:clergy-defense-form="clergyDefenseForm"
      v-model:spread-religion-form="spreadReligionForm"
      v-model:downtime-available="downtimeAvailable"
      v-model:manual-shield-active="manualShieldActive"
      v-model:change-religion-mode="changeReligionMode"
      v-model:selected-religion-id="selectedReligionId"
      v-model:followers-dialog-open="followersDialogOpen"
      v-model:edited-followers="editedFollowers"
      v-model:new-cycle-dialog="newCycleDialog"
      v-model:cycle-form="cycleForm"
      :active-clergy="activeClergy"
      :action-error="actionError"
      :has-icon="hasIcon"
      :is-admin="isAdmin"
      :action-loading="actionLoading"
      :apply-faith-change="applyFaithChange"
      :active-faith-farm-error="activeFaithFarmError"
      :active-faith-farm-loading="activeFaithFarmLoading"
      :active-faith-farm-dc="activeFaithFarmDC"
      :current-faith-points="currentFaithPoints"
      :active-faith-farm-followers="activeFaithFarmFollowers"
      :apply-active-faith-farm="applyActiveFaithFarm"
      :clergy-defense-error="clergyDefenseError"
      :clergy-defense-faith-error="clergyDefenseFaithError"
      :clergy-defense-target="clergyDefenseTarget"
      :clergy-defense-target-s-v-total="clergyDefenseTargetSVTotal"
      :clergy-defense-dc="clergyDefenseDC"
      :clergy-defense-result="clergyDefenseResult"
      :clergy-defense-bonus="clergyDefenseBonus"
      :clergy-defense-loading="clergyDefenseLoading"
      :clergy-defense-disabled="clergyDefenseDisabled"
      :apply-clergy-defense="applyClergyDefense"
      :active-clergy-religion="activeClergyReligion"
      :spread-religion-error="spreadReligionError"
      :spread-religion-faith-error="spreadReligionFaithError"
      :spread-target-religion-options="spreadTargetReligionOptions"
      :spread-target-s-v-total="spreadTargetSVTotal"
      :spread-religion-dc="spreadReligionDC"
      :spread-religion-result="spreadReligionResult"
      :spread-religion-converted="spreadReligionConverted"
      :spread-religion-loading="spreadReligionLoading"
      :spread-religion-disabled="spreadReligionDisabled"
      :spread-religion-target-shield-active="spreadReligionTargetShieldActive"
      :apply-spread-religion="applySpreadReligion"
      :downtime-update-error="downtimeUpdateError"
      :downtime-update-success="downtimeUpdateSuccess"
      :downtime-update-loading="downtimeUpdateLoading"
      :save-downtime-availability="saveDowntimeAvailability"
      :reset-downtime-state="resetDowntimeState"
      :shield-update-error="shieldUpdateError"
      :shield-update-success="shieldUpdateSuccess"
      :shield-update-loading="shieldUpdateLoading"
      :save-shield-state="saveShieldState"
      :reset-shield-state="resetShieldState"
      :logs-loading="logsLoading"
      :logs-error="logsError"
      :clergy-logs="clergyLogs"
      :format-log-meta="formatLogMeta"
      :close-dialog="closeDialog"
      :change-religion-loading="changeReligionLoading"
      :change-religion-error="changeReligionError"
      :start-religion-change="startReligionChange"
      :cancel-religion-change="cancelReligionChange"
      :confirm-religion-change="confirmReligionChange"
      :religion-options="religionOptions"
      :religion-change-fine="religionChangeFine"
      :religion-change-fine-percent="religionChangeFinePercent"
      :followers-error="followersError"
      :total-population-label="totalPopulationLabel"
      :followers-remaining="followersRemaining"
      :distribution-selected="distributionSelected"
      :followers-slider-ceiling="followersSliderCeiling"
      :followers-percent-for="followersPercentFor"
      :followers-delta="followersDelta"
      :followers-saving="followersSaving"
      :followers-over-limit="followersOverLimit"
      :close-followers-dialog="closeFollowersDialog"
      :save-followers-distribution="saveFollowersDistribution"
      :cycle-error="cycleError"
      :current-faerun-year="currentFaerunYear"
      :cycle-duration-label="cycleDurationLabel"
      :cycle-saving="cycleSaving"
      :create-cycle="createCycle"
      :close-new-cycle-dialog="closeNewCycleDialog"
    />
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore'
import { BUILDING_LEVEL_BONUSES, DEFAULT_VALUES, useReligionStore } from '@/store/religionStore'
import { useUserStore } from '@/store/userStore'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { Chart as ChartJS, ArcElement, Legend, Title, Tooltip } from 'chart.js'
import ReligionDistributionDiagram from '@/components/ReligionDistributionDiagram.vue'
import ReligionDistributionTable from '@/components/ReligionDistributionTable.vue'
import ReligionAbilitiesTable from '@/components/ReligionAbilitiesTable.vue'
import ReligionTable from '@/components/ReligionTable.vue'
import ReligionModals from '@/components/ReligionModals.vue'
import { db } from '@/services/firebase'
import { DEFAULT_YEAR, diffInDays, formatFaerunDate, normalizeFaerunDate, parseFaerunDate } from 'faerun-date'
import { formatAmount } from '@/utils/formatters'

const iconCache = new Map()

const religionStore = useReligionStore()
const userStore = useUserStore()
const populationStore = usePopulationStore()
const islandStore = useIslandStore()
const hoveredReligion = ref(null)
const viewMode = ref('diagram')
const defaultCardBackground = ''
const latestCycle = ref(null)
const latestCycleLoading = ref(false)
const latestCycleError = ref('')

const abilitiesById = computed(() =>
  religionStore.abilities.reduce((acc, ability) => {
    acc[ability.id] = ability
    return acc
  }, {})
)

function resolveAbility(abilityId) {
  return (
    abilitiesById.value[abilityId] || {
      id: abilityId || 'unknown',
      name: 'Невідоме вміння',
      description: 'Оновіть довідник умінь.',
    }
  )
}

function resolveAbilitiesList(abilityIds) {
  if (!Array.isArray(abilityIds)) return []

  return abilityIds.map((abilityId) => resolveAbility(abilityId))
}

function resolveMilestoneAbilities(milestoneAbilities) {
  if (!milestoneAbilities || typeof milestoneAbilities !== 'object') return []

  return Object.entries(milestoneAbilities)
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([milestone, abilities]) => {
      if (!Array.isArray(abilities) || abilities.length === 0) return []

      return abilities.map((abilityId, index) => ({
        ability: resolveAbility(abilityId),
        milestone: Number(milestone),
        milestoneLabel: index === 0 ? `${milestone}%+` : '',
        key: `${milestone}-${abilityId || index}`,
      }))
    })
}

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

onMounted(loadLatestCycle)

const loading = computed(() => religionStore.loading)
const error = computed(() => religionStore.error)
const records = computed(() => religionStore.records)
const isAdmin = computed(() => userStore?.isAdmin ?? false)
const totalPopulation = computed(() => populationStore.totalPopulation || 0)
const followersDialogOpen = ref(false)
const distributionSelected = ref(null)
const editedFollowers = ref([])
const followersError = ref('')
const followersSaving = ref(false)
const activeFaithFarmForm = reactive({
  roll: null,
  dmMod: 0,
  notes: '',
})
const activeFaithFarmError = ref('')
const activeFaithFarmLoading = ref(false)
const spreadReligionForm = reactive({
  targetReligionId: '',
  investedOV: 50,
  roll: null,
  dmMod: 0,
  notes: '',
})
const spreadReligionError = ref('')
const spreadReligionLoading = ref(false)
const clergyDefenseForm = reactive({
  investedOV: 50,
  roll: null,
  dmMod: 0,
  notes: '',
})
const clergyDefenseError = ref('')
const clergyDefenseLoading = ref(false)
const manualShieldActive = ref(false)
const shieldUpdateLoading = ref(false)
const shieldUpdateError = ref('')
const shieldUpdateSuccess = ref(false)

function getCycleDurationDays(cycle) {
  if (!cycle) return null
  if (cycle.duration) return Number(cycle.duration)

  const start = parseFaerunDate(cycle.startedAt)
  const end = parseFaerunDate(cycle.finishedAt)
  const diff = start && end ? diffInDays(start, end) : null
  return diff > 0 ? diff : null
}

const currentCycleHeadline = computed(() => {
  if (!latestCycle.value) return 'Цикл ще не розпочато'

  const start = latestCycle.value.startedAt || '—'
  const end = latestCycle.value.finishedAt

  return end ? `${start} — ${end}` : `${start} (триває)`
})

const currentCycleDetails = computed(() => {
  if (!latestCycle.value) return 'Додайте перший цикл, щоб відстежувати дії релігії.'

  const durationDays = getCycleDurationDays(latestCycle.value)
  const durationLabel = durationDays ? `${durationDays} днів` : 'Тривалість не вказана'
  const status = latestCycle.value.finishedAt ? 'Цикл завершено' : 'Цикл триває'
  const notes = latestCycle.value.notes?.trim()

  return [durationLabel, status, notes ? `Нотатки: ${notes}` : null].filter(Boolean).join(' • ')
})
const newCycleDialog = ref(false)
const cycleSaving = ref(false)
const cycleError = ref('')
const currentFaerunYear = DEFAULT_YEAR
const cycleForm = reactive({
  startedDate: null,
  finishedDate: null,
  notes: '',
})

const cycleDurationLabel = computed(() => {
  const start = normalizeFaerunDate(cycleForm.startedDate)
  const end = normalizeFaerunDate(cycleForm.finishedDate)

  if (!start || !end) return 'Тривалість буде розрахована автоматично'

  const diff = diffInDays(start, end)
  if (diff === null) return 'Тривалість буде розрахована автоматично'
  if (diff <= 0) return 'Дата завершення має бути пізнішою за початок'

  return `${diff} днів`
})

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
      id: religion.id,
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
        id: null,
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

const distributionByName = computed(() => {
  const map = new Map()
  for (const item of distribution.value) {
    map.set(item.name, item.percent)
  }
  return map
})

const MILESTONE_FAITH_THRESHOLD = 100

const bonusesByReligion = computed(() => {
  const map = new Map()

  for (const religion of religionStore.religions) {
    const religionName = religion.name || 'Невідома релігія'
    const followersPercent = distributionByName.value.get(religionName) ?? 0

    const innateAbilities = resolveAbilitiesList(religion.abilities)
    const activeMilestoneAbilities = resolveMilestoneAbilities(religion.milestoneAbilities)
      .filter((item) => Number.isFinite(item.milestone) && item.milestone <= followersPercent)
      .map((item) => item.ability)

    map.set(religionName, { innateAbilities, activeMilestoneAbilities })
  }

  return map
})

const religionAbilitiesTable = computed(() =>
  religionStore.religions.map((religion) => {
    const resolvedAbilities = resolveAbilitiesList(religion.abilities)
    const resolvedMilestoneAbilities = resolveMilestoneAbilities(religion.milestoneAbilities)

    const religionName = religion.name || 'Невідома релігія'
    const followersPercent = distributionByName.value.get(religionName) ?? 0

    return {
      id: religion.id,
      name: religionName,
      color: getReligionColor(religion.name),
      abilities: resolvedAbilities,
      milestoneAbilities: resolvedMilestoneAbilities,
      followersPercent,
    }
  })
)

const followersSliderCeiling = computed(() => {
  const base = totalPopulation.value || 0
  const maxValue = editedFollowers.value.reduce(
    (max, item) => Math.max(max, Number(item.newFollowers) || 0),
    0,
  )

  return Math.max(base, maxValue, 100)
})

const editedFollowersTotal = computed(() =>
  editedFollowers.value.reduce((sum, item) => sum + (Number(item.newFollowers) || 0), 0),
)

const followersRemaining = computed(() => (totalPopulation.value || 0) - editedFollowersTotal.value)
const followersOverLimit = computed(() => followersRemaining.value < 0)

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

function openFollowersDialog(item) {
  if (!isAdmin.value) return

  distributionSelected.value = item || null
  editedFollowers.value = distribution.value.map((entry) => ({
    ...entry,
    newFollowers: entry.followers,
  }))
  followersError.value = ''
  followersDialogOpen.value = true
}

function closeFollowersDialog() {
  followersDialogOpen.value = false
  distributionSelected.value = null
}

function followersPercentFor(value) {
  const base = totalPopulation.value || editedFollowersTotal.value || 1
  return Math.round(((Number(value) || 0) / base) * 1000) / 10
}

function followersDelta(item) {
  const previous = Number(item.followers || 0)
  const current = Number(item.newFollowers || 0)
  const diff = current - previous
  const sign = diff > 0 ? '+' : ''

  return `${sign}${diff.toLocaleString('uk-UA')}`
}

async function saveFollowersDistribution() {
  if (!isAdmin.value) return

  followersError.value = ''

  if (followersOverLimit.value) {
    followersError.value = 'Сума послідовників перевищує населення острова.'
    return
  }

  followersSaving.value = true
  try {
    const batch = writeBatch(db)
    const changes = []

    for (const item of editedFollowers.value) {
      if (!item.id) continue

      const previous = Number(item.followers || 0)
      const updatedFollowers = Number(item.newFollowers || 0)

      if (updatedFollowers === previous) continue

      batch.update(doc(db, 'religions', item.id), { followers: updatedFollowers })
      changes.push({
        religionId: item.id,
        religionName: item.name,
        previousFollowers: previous,
        updatedFollowers,
        delta: updatedFollowers - previous,
      })
    }

    if (!changes.length) {
      followersError.value = 'Немає змін для збереження.'
      return
    }

    await batch.commit()

    await addDoc(collection(db, 'religionActions'), {
      actionType: doc(db, 'religionActionTypes', 'religionsDistributionChange'),
      changes,
      totalPopulation: totalPopulation.value,
      remaining: followersRemaining.value,
      user: userStore.nickname || 'Адміністратор',
      createdAt: serverTimestamp(),
    })

    closeFollowersDialog()
  } catch (e) {
    console.error('[religion] Failed to save distribution', e)
    followersError.value = e?.message || 'Не вдалося зберегти розподіл.'
  } finally {
    followersSaving.value = false
  }
}

function handleSliceClick(item) {
  if (!item || !isAdmin.value) return
  openFollowersDialog(item)
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

const dialogOpen = ref(false)
const selectedClergyId = ref('')
const activeClergy = computed(() => records.value.find((item) => item.id === selectedClergyId.value))
const activeClergyReligion = computed(() => {
  const religionId = activeClergy.value?.religion?.id
  if (!religionId) return null

  return religionStore.religions.find((item) => item.id === religionId) || null
})

const spreadTargetReligionOptions = computed(() =>
  religionStore.religions
    .filter((item) => item.id !== activeClergyReligion.value?.id)
    .map((item) => ({
      title: item.name,
      value: item.id,
    })),
)
const spreadTargetReligion = computed(() =>
  religionStore.religions.find((item) => item.id === spreadReligionForm.targetReligionId) || null,
)
const spreadTargetSVTotal = computed(() => {
  const svBase = Number(spreadTargetReligion.value?.svBase ?? DEFAULT_VALUES.svBase)
  const svTemp = Number(spreadTargetReligion.value?.svTemp ?? DEFAULT_VALUES.svTemp)
  const shieldBonus = Number(spreadTargetReligion.value?.shieldBonus ?? DEFAULT_VALUES.shieldBonus)

  return svBase + svTemp + shieldBonus
})
const spreadReligionDC = computed(() => spreadTargetSVTotal.value + Number(spreadReligionForm.dmMod ?? 0))
const spreadReligionResult = computed(() => {
  const rollRaw = spreadReligionForm.roll
  const investedRaw = spreadReligionForm.investedOV
  const roll = Number(rollRaw)
  const invested = Number(investedRaw)

  if (rollRaw === null || rollRaw === undefined || Number.isNaN(roll)) return null
  if (investedRaw === null || investedRaw === undefined || Number.isNaN(invested)) return null

  return roll + Math.floor(invested / 50)
})
const spreadReligionConverted = computed(() => {
  const result = spreadReligionResult.value
  if (result === null) return null

  return result >= spreadReligionDC.value ? 5 + Math.max(0, result - spreadReligionDC.value) : 0
})
const spreadReligionFaithError = computed(() => {
  const available = currentFaithPoints.value
  const invested = Number(spreadReligionForm.investedOV)

  if (available < 50) return 'Недостатньо ОВ для мінімальної інвестиції (50).'
  if (!Number.isNaN(invested) && invested > available) return 'Недостатньо ОВ для інвестиції.'

  return ''
})
const spreadReligionDisabled = computed(
  () => !spreadTargetReligion.value || !downtimeAvailable.value || Boolean(spreadReligionFaithError.value),
)

watch(
  () => islandStore.currentId,
  (id) => {
    populationStore.startListener(id)
  },
)

watch(distribution, () => {
  hoveredReligion.value = null
})

watch(
  spreadTargetReligionOptions,
  (options) => {
    if (!options.length) {
      spreadReligionForm.targetReligionId = ''
      return
    }

    const exists = options.some((option) => option.value === spreadReligionForm.targetReligionId)
    if (!exists) {
      spreadReligionForm.targetReligionId = options[0].value
    }
  },
  { immediate: true },
)

const sortBy = ref('heroName')
const sortDirection = ref('asc')

const faithChange = ref(null)
const logMessage = ref('')
const actionError = ref('')
const actionLoading = ref(false)
const changeReligionMode = ref(false)
const selectedReligionId = ref('')
const changeReligionLoading = ref(false)
const changeReligionError = ref('')
const downtimeAvailable = ref(true)
const downtimeUpdateLoading = ref(false)
const downtimeUpdateError = ref('')
const downtimeUpdateSuccess = ref(false)
const activeFaithFarmBase = computed(() => activeClergyReligion.value?.farmBase ?? DEFAULT_VALUES.farmBase)
const activeFaithFarmDCBase = computed(() => activeClergyReligion.value?.farmDCBase ?? DEFAULT_VALUES.farmDCBase)
const currentFaithPoints = computed(() => Number(activeClergy.value?.faith ?? 0))
const activeFaithFarmDC = computed(() => {
  const dmMod = Number(activeFaithFarmForm.dmMod ?? 0)
  return activeFaithFarmDCBase.value + Math.floor(currentFaithPoints.value / 100) + dmMod
})
const activeFaithFarmFollowers = computed(() => {
  const roll = Number(activeFaithFarmForm.roll)
  if (Number.isNaN(roll)) return null

  const extra = Math.max(0, roll - activeFaithFarmDC.value)
  return activeFaithFarmBase.value + extra
})

const clergyDefenseTarget = computed(() => activeClergyReligion.value?.name || '—')
const clergyDefenseTargetSVTotal = computed(() => {
  const svBase = Number(activeClergyReligion.value?.svBase ?? DEFAULT_VALUES.svBase)
  const svTemp = Number(activeClergyReligion.value?.svTemp ?? DEFAULT_VALUES.svTemp)
  return svBase + svTemp
})
const clergyDefenseDC = computed(() => {
  const dmMod = Number(clergyDefenseForm.dmMod ?? 0)
  return clergyDefenseTargetSVTotal.value + dmMod
})
const clergyDefenseResult = computed(() => {
  const rollRaw = clergyDefenseForm.roll
  const investedRaw = clergyDefenseForm.investedOV
  const roll = Number(rollRaw)
  const invested = Number(investedRaw)

  if (rollRaw === null || rollRaw === undefined || Number.isNaN(roll)) return null
  if (investedRaw === null || investedRaw === undefined || Number.isNaN(invested)) return null

  return roll + Math.floor(invested / 50)
})
const clergyDefenseBonus = computed(() => {
  const result = clergyDefenseResult.value
  const dc = clergyDefenseDC.value

  if (result === null) return 0

  if (result >= dc) {
    return 1 + Math.max(0, Math.floor((result - dc) / 5))
  }

  return 0
})
const clergyDefenseFaithError = computed(() => {
  const available = currentFaithPoints.value
  const invested = Number(clergyDefenseForm.investedOV)

  if (available < 50) return 'Недостатньо ОВ для мінімальної інвестиції (50).'
  if (!Number.isNaN(invested) && invested > available) return 'Недостатньо ОВ для інвестиції.'

  return ''
})
const clergyDefenseDisabled = computed(() =>
  Boolean(activeClergyReligion.value?.shieldActive) ||
  !downtimeAvailable.value ||
  Boolean(clergyDefenseFaithError.value),
)

const recordsWithBonuses = computed(() =>
  records.value.map((record) => ({
    ...record,
    activeBonuses: (() => {
      const religionBonuses = bonusesByReligion.value.get(record.religionName) || {
        innateAbilities: [],
        activeMilestoneAbilities: [],
      }
      const hasMilestoneFaith = Number(record.faith ?? 0) >= MILESTONE_FAITH_THRESHOLD

      const innateBonuses = religionBonuses.innateAbilities.map((ability) => ({
        ...ability,
        active: true,
      }))

      const milestoneBonuses = religionBonuses.activeMilestoneAbilities.map((ability) => ({
        ...ability,
        active: hasMilestoneFaith,
        hint: hasMilestoneFaith
          ? ''
          : `Бонус стане активним при ${MILESTONE_FAITH_THRESHOLD}+ ОВ віри.`,
      }))

      const merged = [...innateBonuses, ...milestoneBonuses]
      const unique = []
      const seen = new Set()

      for (const ability of merged) {
        const key = ability.id || ability.name
        if (!key || seen.has(key)) continue
        seen.add(key)
        unique.push(ability)
      }

      return unique
    })(),
    religionColor: getReligionColor(record.religionName),
  })),
)

const sortedRecords = computed(() => {
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return recordsWithBonuses.value.slice().sort((a, b) => {
    const field = sortBy.value
    const aVal = a[field]
    const bVal = b[field]

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dir
    }

    return String(aVal ?? '').localeCompare(String(bVal ?? ''), 'uk', { sensitivity: 'base' }) * dir
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

watch(activeClergyReligion, () => {
  manualShieldActive.value = Boolean(activeClergyReligion.value?.shieldActive)
})

watch(manualShieldActive, () => {
  shieldUpdateSuccess.value = false
  shieldUpdateError.value = ''
})

const clergyLogs = computed(() => (activeClergy.value ? religionStore.logsByClergy[activeClergy.value.id] || [] : []))
const logsLoading = computed(() => religionStore.logsLoading)
const logsError = computed(() => religionStore.logsError)
const religionOptions = computed(() => {
  const currentReligionId = activeClergy.value?.religion?.id
  return religionStore.religions
    .filter((item) => item.id !== currentReligionId)
    .map((item) => ({
      ...item,
      value: item.id,
      title: item.name,
    }))
})
const selectedReligion = computed(() => religionStore.religions.find((item) => item.id === selectedReligionId.value))

function getReligionChangeRate(faithMax) {
  if (faithMax < 200) return 0.5
  if (faithMax < 400) return 0.6
  return 0.7
}

function calculateReligionChangeFine(clergy) {
  const faith = Number(clergy?.faith ?? 0)
  const faithMax = Number(clergy?.faithMax ?? 0)
  const rate = getReligionChangeRate(faithMax)

  return { fine: Math.floor(faith * rate), rate }
}

const religionChangeFine = computed(() => calculateReligionChangeFine(activeClergy.value).fine)
const religionChangeFinePercent = computed(() => Math.round(calculateReligionChangeFine(activeClergy.value).rate * 100))

async function loadLatestCycle() {
  latestCycleLoading.value = true
  latestCycleError.value = ''

  try {
    const cyclesRef = collection(db, 'cycles')
    const latestCycleQuery = query(cyclesRef, orderBy('createdAt', 'desc'), limit(1))
    const snapshot = await getDocs(latestCycleQuery)

    if (snapshot.docs.length) {
      const docSnap = snapshot.docs[0]
      latestCycle.value = { id: docSnap.id, ...docSnap.data() }
    } else {
      latestCycle.value = null
    }
  } catch (e) {
    console.error('[religion] Failed to load latest cycle', e)
    latestCycleError.value = 'Не вдалося завантажити дані про цикл.'
  } finally {
    latestCycleLoading.value = false
  }
}

function openNewCycleDialog() {
  cycleForm.startedDate = null
  cycleForm.finishedDate = null
  cycleForm.notes = ''
  cycleError.value = ''
  newCycleDialog.value = true
}

function closeNewCycleDialog() {
  newCycleDialog.value = false
}

function openClergy(record) {
  selectedClergyId.value = record.id
  faithChange.value = null
  logMessage.value = ''
  actionError.value = ''
  activeFaithFarmForm.roll = null
  activeFaithFarmForm.dmMod = 0
  activeFaithFarmForm.notes = ''
  activeFaithFarmError.value = ''
  resetDowntimeState()
  resetClergyDefenseState()
  resetSpreadReligionState()
  cancelReligionChange()
  dialogOpen.value = true
  religionStore.listenLogs(record.id)
}

async function resetReligionsSvTemp() {
  const religionsSnapshot = await getDocs(collection(db, 'religions'))
  const batch = writeBatch(db)

  religionsSnapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, { svTemp: 0 })
  })

  await batch.commit()
}

function getBuildingFaithIncome(level) {
  return BUILDING_LEVEL_BONUSES[level]?.passiveFaith || 0
}

function formatCycleLabel(startedAt, finishedAt) {
  if (startedAt && finishedAt) return `${startedAt} — ${finishedAt}`
  if (startedAt) return `з ${startedAt}`
  return 'без дат'
}

function normalizeAmount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

async function loadManufacturesByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return []

  const chunks = []
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10))
  }

  const results = []
  for (const chunk of chunks) {
    const q = query(collection(db, 'manufactures'), where(documentId(), 'in', chunk))
    const snapshot = await getDocs(q)
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {}
      results.push({
        id: docSnap.id,
        name: (data.name || '').trim(),
        description: (data.description || '').trim(),
        income: normalizeAmount(data.income || 0),
        incomeDestination: normalizeIncomeDestination(data.incomeDestination),
      })
    })
  }

  const order = new Map(ids.map((id, index) => [id, index]))
  results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return results
}

async function distributeManufactureIncome(cycleId, startedAt, finishedAt) {
  const islandId = islandStore.currentId || 'island_rock'
  const islandSnap = await getDoc(doc(db, 'islands', islandId))
  if (!islandSnap.exists()) return

  const manufactureIds = Array.isArray(islandSnap.data()?.manufactures)
    ? islandSnap.data().manufactures
    : []

  const entries = (await loadManufacturesByIds(manufactureIds))
    .filter((item) => item.income !== 0)

  const populationEntries = (populationStore.items || [])
    .map((group) => {
      const count = Number(group.count ?? group.amount ?? 0)
      const incomePerPerson = normalizeAmount(
        group.incomePerPerson ?? group.income ?? group.incomePer ?? 0,
      )
      const incomeTotal = normalizeAmount(incomePerPerson * count)
      return {
        id: group.id,
        name: group.name || 'Невідома група',
        description: group.description || '',
        income: incomeTotal,
        incomePerPerson,
        count,
        type: 'population',
      }
    })
    .filter((item) => item.income !== 0)

  const combinedEntries = [
    ...entries.map((item) => ({ ...item, type: 'manufacture' })),
    ...populationEntries,
  ]

  if (!combinedEntries.length) return

  const metaRef = doc(db, 'treasury/meta')
  const txCol = collection(db, 'treasuryTransactions')
  const cycleLabel = formatCycleLabel(startedAt, finishedAt)

  const treasuryEntries = combinedEntries.filter((item) => (
    item.type !== 'manufacture' || !item.incomeDestination?.startsWith('guild:')
  ))

  const totalIncome = treasuryEntries.reduce((sum, item) => (
    item.income > 0 ? sum + item.income : sum
  ), 0)
  const totalOutcome = treasuryEntries.reduce((sum, item) => (
    item.income < 0 ? sum + Math.abs(item.income) : sum
  ), 0)

  await runTransaction(db, async (transaction) => {
    const metaSnap = await transaction.get(metaRef)
    const metaData = metaSnap.exists() ? metaSnap.data() : {}
    let currentBalance = metaData.balance || 0
    const guildBalances = new Map()

    for (const item of combinedEntries) {
      const isGuildDestination = item.type === 'manufacture' && item.incomeDestination?.startsWith('guild:')
      const guildId = isGuildDestination ? item.incomeDestination.slice('guild:'.length) : null

      if (isGuildDestination && guildId) {
        const guildRef = doc(db, 'guilds', guildId)
        const guildLogsRef = collection(db, 'guilds', guildId, 'logs')

        let guildCurrent = guildBalances.get(guildId)
        if (guildCurrent == null) {
          const guildSnap = await transaction.get(guildRef)
          guildCurrent = Number(guildSnap.exists() ? guildSnap.data()?.treasure || 0 : 0)
        }

        const guildNext = normalizeAmount(guildCurrent + item.income)
        guildBalances.set(guildId, guildNext)

        transaction.set(guildRef, {
          treasure: guildNext,
          updatedAt: serverTimestamp(),
        }, { merge: true })

        const guildLogRef = doc(guildLogsRef)
        transaction.set(guildLogRef, {
          amount: item.income,
          type: item.income >= 0 ? 'deposit' : 'withdraw',
          comment: `Автооперація з мануфактури "${item.name || 'Без назви'}" за цикл ${cycleLabel}.`.slice(0, 500),
          userNickname: 'Система',
          createdAt: serverTimestamp(),
          treasureAfter: guildNext,
        })
        continue
      }

      currentBalance += item.income
      const label = item.income >= 0 ? 'Дохід' : 'Витрати'
      const commentParts = []
      if (item.type === 'population') {
        commentParts.push(`${label} населення групи "${item.name}"`)
        commentParts.push(`(${item.count} осіб × ${formatAmount(item.incomePerPerson)} 🪙)`)
      } else {
        commentParts.push(`${label} мануфактури "${item.name || 'Без назви'}"`)
        if (item.description) commentParts.push(item.description)
      }
      commentParts.push(`за цикл ${cycleLabel}.`)
      const comment = commentParts.join(' ')
      const txType = item.income >= 0 ? 'deposit' : 'withdraw'

      const txRef = doc(txCol)
      transaction.set(txRef, {
        amount: item.income,
        type: txType,
        comment: comment.slice(0, 500),
        userId: 'system',
        nickname: 'Система',
        createdAt: serverTimestamp(),
        balanceAfter: currentBalance,
        cycleId,
        cycleStartedAt: startedAt,
        cycleFinishedAt: finishedAt || null,
        manufactureId: item.type === 'manufacture' ? item.id || null : null,
        manufactureName: item.type === 'manufacture' ? item.name || null : null,
        manufactureDescription: item.type === 'manufacture' ? item.description || null : null,
        manufactureIncome: item.type === 'manufacture' ? item.income : null,
        manufactureIncomeDestination: item.type === 'manufacture' ? item.incomeDestination || 'treasury' : null,
        populationGroupId: item.type === 'population' ? item.id || null : null,
        populationGroupName: item.type === 'population' ? item.name || null : null,
        populationIncomePerPerson: item.type === 'population' ? item.incomePerPerson : null,
        populationCount: item.type === 'population' ? item.count : null,
        populationIncomeTotal: item.type === 'population' ? item.income : null,
      })
    }

    transaction.set(metaRef, {
      balance: currentBalance,
      totalIncome: normalizeAmount(totalIncome),
      totalOutcome: normalizeAmount(totalOutcome),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  })
}

function normalizeIncomeDestination(value) {
  if (typeof value !== 'string') return 'treasury'
  if (value === 'treasury') return 'treasury'
  if (value.startsWith('guild:') && value.length > 'guild:'.length) return value
  return 'treasury'
}

async function distributeBuildingFaithIncome(cycleId) {
  const religionsSnapshot = await getDocs(collection(db, 'religions'))
  const religionsWithIncome = religionsSnapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() || {}
      const buildingLevel = data.buildingLevel || 'none'
      return {
        id: docSnap.id,
        name: data.name || 'Невідома релігія',
        ref: docSnap.ref,
        buildingLevel,
        passiveFaith: getBuildingFaithIncome(buildingLevel),
      }
    })
    .filter((religion) => religion.passiveFaith > 0)

  for (const religion of religionsWithIncome) {
    const clergyQuery = query(collection(db, 'clergy'), where('religion', '==', religion.ref))
    const clergySnapshot = await getDocs(clergyQuery)

    if (clergySnapshot.empty) continue

    const heroCount = clergySnapshot.size
    const baseShare = Math.floor(religion.passiveFaith / heroCount)
    const remainder = religion.passiveFaith - baseShare * heroCount
    const remainderIndex = remainder > 0 ? Math.floor(Math.random() * heroCount) : -1

    const tasks = clergySnapshot.docs.map(async (docSnap, index) => {
      const bonus = baseShare + (index === remainderIndex ? remainder : 0)
      if (!bonus) return

      const data = docSnap.data() || {}
      const currentFaith = Number(data.faith ?? 0)
      const newFaith = currentFaith + bonus
      const updates = { faith: newFaith }

      const currentFaithMax = Number(data.faithMax ?? 0)
      if (currentFaithMax < newFaith) {
        updates.faithMax = newFaith
      }

      await updateDoc(docSnap.ref, updates)
      await addDoc(collection(docSnap.ref, 'logs'), {
        delta: bonus,
        message: `Пасивний дохід від споруди (${religion.buildingLevel}) за цикл ${cycleId}.`,
        user: 'Система',
        cycleId,
        religionId: religion.id,
        religionName: religion.name,
        buildingLevel: religion.buildingLevel,
        buildingFaithIncome: religion.passiveFaith,
        remainderBonus: index === remainderIndex && remainder > 0,
        createdAt: serverTimestamp(),
      })
    })

    await Promise.all(tasks)
  }
}

async function createCycleStartAction(cycleId, notes) {
  const actionsRef = collection(db, 'religionActions')
  const actionTypeRef = doc(db, 'religionActionTypes', 'cycleStart')

  await addDoc(actionsRef, {
    actionType: actionTypeRef,
    cycleId,
    notes: notes?.trim() || '',
    createdAt: serverTimestamp(),
    convertedFollowers: 0,
    result: 0,
  })
}

async function createCycle() {
  cycleError.value = ''

  const startedDate = normalizeFaerunDate(cycleForm.startedDate)
  const finishedDate = normalizeFaerunDate(cycleForm.finishedDate)

  if (!startedDate) {
    cycleError.value = 'Вкажіть початок циклу.'
    return
  }

  if (finishedDate) {
    const diff = diffInDays(startedDate, finishedDate)
    if (!diff || diff <= 0) {
      cycleError.value = 'Дата завершення має бути пізнішою за початок.'
      return
    }
  }

  cycleSaving.value = true
  try {
    const cyclesRef = collection(db, 'cycles')
    const lastCycleSnapshot = await getDocs(query(cyclesRef, orderBy('createdAt', 'desc'), limit(1)))
    const lastCycleDoc = lastCycleSnapshot.docs[0]

    const startedAt = formatFaerunDate(startedDate)
    const finishedAt = finishedDate ? formatFaerunDate(finishedDate) : null
    const calculatedDuration = finishedDate ? diffInDays(startedDate, finishedDate) : null

    const newCycleData = {
      startedAt,
      duration: calculatedDuration,
      createdAt: serverTimestamp(),
    }

    if (finishedAt) {
      newCycleData.finishedAt = finishedAt
    }

    const cycleDoc = await addDoc(cyclesRef, newCycleData)

    if (lastCycleDoc && !lastCycleDoc.data().finishedAt) {
      const previousCycle = lastCycleDoc.data()
      const parsedPreviousStart = parseFaerunDate(previousCycle.startedAt)
      const previousDuration = parsedPreviousStart ? diffInDays(parsedPreviousStart, startedDate) : null

      const previousUpdate = { finishedAt: startedAt }
      if (previousDuration && previousDuration > 0) {
        previousUpdate.duration = previousDuration
      }

      await updateDoc(lastCycleDoc.ref, previousUpdate)
    }

    await resetReligionsSvTemp()
    await createCycleStartAction(cycleDoc.id, cycleForm.notes)
    await distributeBuildingFaithIncome(cycleDoc.id)
    await distributeManufactureIncome(cycleDoc.id, startedAt, finishedAt)
    await loadLatestCycle()
    closeNewCycleDialog()
  } catch (e) {
    console.error('[religion] Failed to create cycle', e)
    cycleError.value = 'Не вдалося створити новий цикл.'
  } finally {
    cycleSaving.value = false
  }
}

function closeDialog() {
  dialogOpen.value = false
  if (selectedClergyId.value) {
    religionStore.stopLogs(selectedClergyId.value)
  }
  cancelReligionChange()
}

function formatLogMeta(log) {
  const time = log.createdAt ? log.createdAt.toLocaleString('uk-UA') : 'Очікує на час'
  return `${log.user || 'Невідомо'} • ${time}`
}

function startReligionChange() {
  changeReligionMode.value = true
  selectedReligionId.value = ''
  changeReligionError.value = ''
}

function cancelReligionChange() {
  changeReligionMode.value = false
  selectedReligionId.value = ''
  changeReligionError.value = ''
  changeReligionLoading.value = false
}

async function confirmReligionChange() {
  if (!isAdmin.value || !activeClergy.value) return
  changeReligionError.value = ''

  if (!selectedReligionId.value) {
    changeReligionError.value = 'Оберіть конфесію для зміни.'
    return
  }

  if (selectedReligionId.value === activeClergy.value.religion?.id) {
    changeReligionError.value = 'Оберіть іншу конфесію.'
    return
  }

  const newReligion = selectedReligion.value
  if (!newReligion) {
    changeReligionError.value = 'Обрана конфесія недоступна.'
    return
  }

  const clergyRef = doc(db, 'clergy', activeClergy.value.id)
  const newReligionRef = doc(db, 'religions', selectedReligionId.value)
  const heroRef = activeClergy.value.heroRef?.path
    ? doc(db, activeClergy.value.heroRef.path)
    : activeClergy.value.heroRef

  const currentReligionRef = activeClergy.value.religion?.path
    ? doc(db, activeClergy.value.religion.path)
    : activeClergy.value.religion?.id
      ? doc(db, 'religions', activeClergy.value.religion.id)
      : null

  const fine = religionChangeFine.value
  const delta = -fine
  const updatedFaith = Math.max(0, Number(activeClergy.value.faith ?? 0) + delta)

  changeReligionLoading.value = true
  try {
    const batch = writeBatch(db)
    batch.update(clergyRef, {
      religion: newReligionRef,
      faith: updatedFaith,
    })

    if (heroRef) {
      batch.update(heroRef, { religion: newReligionRef })
    }

    await batch.commit()

    await Promise.all([
      addDoc(collection(clergyRef, 'logs'), {
        delta,
        message: `Зміна конфесії на ${newReligion.name}. Штраф ${fine} ОВ.`,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
        previousReligion: activeClergy.value.religionName,
        newReligion: newReligion.name,
      }),
      addDoc(collection(db, 'religionActions'), {
        actionType: doc(db, 'religionActionTypes', 'changeReligion'),
        hero: heroRef || null,
        clergy: clergyRef,
        fromReligion: currentReligionRef,
        toReligion: newReligionRef,
        faithPenalty: fine,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
    ])

    cancelReligionChange()
  } catch (e) {
    console.error('[religion] Failed to change religion', e)
    changeReligionError.value = e?.message || 'Не вдалося змінити конфесію.'
  } finally {
    changeReligionLoading.value = false
  }
}

async function createFaithAwardAction(delta) {
  const heroRef = activeClergy.value.heroRef?.path
    ? doc(db, activeClergy.value.heroRef.path)
    : activeClergy.value.heroRef || null

  const clergyRef = doc(db, 'clergy', activeClergy.value.id)

  const religionRef = activeClergy.value.religion?.path
    ? doc(db, activeClergy.value.religion.path)
    : activeClergy.value.religion || null

  await addDoc(collection(db, 'religionActions'), {
    actionType: doc(db, 'religionActionTypes', 'awardAdventure'),
    hero: heroRef,
    clergy: clergyRef,
    religion: religionRef,
    faithDelta: delta,
    message: logMessage.value?.trim() || '',
    user: userStore.nickname || 'Адміністратор',
    createdAt: serverTimestamp(),
  })
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
    const tasks = [religionStore.changeFaith({
      clergyId: activeClergy.value.id,
      delta,
      message: logMessage.value,
      user: userStore.nickname || 'Адміністратор',
    })]

    if (delta > 0) {
      tasks.push(createFaithAwardAction(delta))
    }

    await Promise.all(tasks)
    faithChange.value = null
    logMessage.value = ''
  } catch (e) {
    actionError.value = e?.message || 'Не вдалося оновити віру.'
  } finally {
    actionLoading.value = false
  }
}

function resetDowntimeState() {
  downtimeAvailable.value = activeClergy.value?.downtimeAvailable ?? true
  downtimeUpdateError.value = ''
  downtimeUpdateSuccess.value = false
}

function resetClergyDefenseState() {
  clergyDefenseForm.investedOV = 50
  clergyDefenseForm.roll = null
  clergyDefenseForm.dmMod = 0
  clergyDefenseForm.notes = ''
  clergyDefenseError.value = ''
  clergyDefenseLoading.value = false
  manualShieldActive.value = Boolean(activeClergyReligion.value?.shieldActive)
  shieldUpdateError.value = ''
  shieldUpdateSuccess.value = false
  shieldUpdateLoading.value = false
}

function resetSpreadReligionState() {
  spreadReligionForm.targetReligionId = ''
  spreadReligionForm.investedOV = 50
  spreadReligionForm.roll = null
  spreadReligionForm.dmMod = 0
  spreadReligionForm.notes = ''
  spreadReligionError.value = ''
  spreadReligionLoading.value = false
}

function resetShieldState() {
  manualShieldActive.value = Boolean(activeClergyReligion.value?.shieldActive)
  shieldUpdateError.value = ''
  shieldUpdateSuccess.value = false
  shieldUpdateLoading.value = false
}

watch(activeClergy, () => {
  resetDowntimeState()
  resetClergyDefenseState()
  resetSpreadReligionState()
})

async function saveDowntimeAvailability() {
  if (!isAdmin.value || !activeClergy.value) return

  const heroRefValue = activeClergy.value.heroRef?.path
    ? doc(db, activeClergy.value.heroRef.path)
    : activeClergy.value.heroRef

  if (!heroRefValue) {
    downtimeUpdateError.value = 'Не вдалося визначити героя для оновлення.'
    return
  }

  downtimeUpdateError.value = ''
  downtimeUpdateSuccess.value = false
  downtimeUpdateLoading.value = true

  try {
    await updateDoc(heroRefValue, { downtimeAvailable: downtimeAvailable.value })
    religionStore.setDowntimeAvailability(activeClergy.value.id, downtimeAvailable.value)
    downtimeUpdateSuccess.value = true
  } catch (e) {
    downtimeUpdateError.value = e?.message || 'Не вдалося оновити статус даутайму.'
  } finally {
    downtimeUpdateLoading.value = false
  }
}

async function applyClergyDefense() {
  if (!isAdmin.value || !activeClergy.value) return

  const religionRefSource = activeClergy.value.religion
  const clergyRef = doc(db, 'clergy', activeClergy.value.id)
  const heroRefSource = activeClergy.value.heroRef

  const invested = Number(clergyDefenseForm.investedOV)
  const roll = Number(clergyDefenseForm.roll)
  const dmMod = Number(clergyDefenseForm.dmMod ?? 0)
  const notes = clergyDefenseForm.notes?.trim() || ''

  if (!religionRefSource) {
    clergyDefenseError.value = 'Не вдалося визначити конфесію духовенства.'
    return
  }

  if (activeClergyReligion.value?.shieldActive) {
    clergyDefenseError.value = 'Щит цієї конфесії вже активний.'
    return
  }

  if (!downtimeAvailable.value) {
    clergyDefenseError.value = 'Дія доступна лише коли є давнтайм.'
    return
  }

  if (Number.isNaN(invested) || invested < 50) {
    clergyDefenseError.value = 'Мінімальна інвестиція — 50 ОВ.'
    return
  }

  if (invested % 50 !== 0) {
    clergyDefenseError.value = 'Інвестиція має бути кратною 50 ОВ.'
    return
  }

  const faithBlockReason = clergyDefenseFaithError.value
  if (faithBlockReason) {
    clergyDefenseError.value = faithBlockReason
    return
  }

  if (Number.isNaN(roll)) {
    clergyDefenseError.value = 'Вкажіть результат кидка.'
    return
  }

  const religionRef = religionRefSource?.path
    ? doc(db, religionRefSource.path)
    : religionRefSource?.id
      ? doc(db, 'religions', religionRefSource.id)
      : religionRefSource
  const heroRef = heroRefSource?.path ? doc(db, heroRefSource.path) : heroRefSource

  if (!religionRef) {
    clergyDefenseError.value = 'Не вдалося визначити конфесію духовенства.'
    return
  }

  if (!heroRef) {
    clergyDefenseError.value = 'Не вдалося визначити героя духовенства.'
    return
  }

  const dc = clergyDefenseDC.value
  const result = clergyDefenseResult.value
  const bonus = clergyDefenseBonus.value

  clergyDefenseError.value = ''
  clergyDefenseLoading.value = true

  try {
    await runTransaction(db, async (transaction) => {
      const clergySnapshot = await transaction.get(clergyRef)
      if (!clergySnapshot.exists()) {
        throw new Error('Духовенство не знайдено.')
      }

      const clergyData = clergySnapshot.data() || {}
      const currentFaith = Number(clergyData.faith ?? 0)
      if (currentFaith < invested) {
        throw new Error('Недостатньо ОВ для інвестиції.')
      }

      let religionSnapshot = null
      if (bonus > 0) {
        religionSnapshot = await transaction.get(religionRef)
        if (!religionSnapshot.exists()) {
          throw new Error('Конфесія не знайдена.')
        }
      }

      transaction.update(clergyRef, { faith: currentFaith - invested })

      if (bonus > 0) {
        transaction.update(religionRef, {
          shieldBonus: bonus,
          shieldActive: true,
        })
      }
    })

    await Promise.all([
      addDoc(collection(clergyRef, 'logs'), {
        delta: -invested,
        message: `Захист духовенства: інвестиція ${invested} ОВ, кидок ${roll}, DM Mod ${dmMod}, DC ${dc}. ${
          notes || 'Без нотаток'
        }`,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
      addDoc(collection(db, 'religionActions'), {
        actionType: doc(db, 'religionActionTypes', 'shield'),
        hero: heroRef,
        heroId: heroRef.id,
        clergy: clergyRef,
        religion: religionRef,
        investedFaith: invested,
        roll,
        dmMod,
        notes,
        target: religionRef,
        targetSVTotal: clergyDefenseTargetSVTotal.value,
        dc,
        result,
        bonus,
        shieldApplied: bonus > 0,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
    ])

    if (bonus > 0) {
      manualShieldActive.value = true
    }

    clergyDefenseForm.roll = null
    clergyDefenseForm.dmMod = 0
    clergyDefenseForm.notes = ''
  } catch (e) {
    console.error('[religion] Failed to apply clergy defense', e)
    clergyDefenseError.value = e?.message || 'Не вдалося застосувати захист духовенства.'
  } finally {
    clergyDefenseLoading.value = false
  }
}

async function applySpreadReligion() {
  if (!isAdmin.value || !activeClergy.value) return

  const targetReligion = spreadTargetReligion.value
  const religionRefSource = activeClergy.value.religion
  const heroRef = activeClergy.value.heroRef?.path
    ? doc(db, activeClergy.value.heroRef.path)
    : activeClergy.value.heroRef
  const religionRef = religionRefSource?.path
    ? doc(db, religionRefSource.path)
    : religionRefSource?.id
      ? doc(db, 'religions', religionRefSource.id)
      : religionRefSource || null
  const invested = Number(spreadReligionForm.investedOV)
  const roll = Number(spreadReligionForm.roll)
  const dmMod = Number(spreadReligionForm.dmMod ?? 0)
  const dc = spreadReligionDC.value
  const result = spreadReligionResult.value
  const converted = spreadReligionConverted.value
  const notes = spreadReligionForm.notes?.trim() || ''
  const cycleId = latestCycle.value?.id || null

  if (!downtimeAvailable.value) {
    spreadReligionError.value = 'Даутайм недоступний для цього героя.'
    return
  }

  if (!targetReligion) {
    spreadReligionError.value = 'Оберіть цільову конфесію.'
    return
  }

  if (targetReligion.id === activeClergyReligion.value?.id) {
    spreadReligionError.value = 'Цільова конфесія має відрізнятися від конфесії героя.'
    return
  }

  if (!religionRef) {
    spreadReligionError.value = 'Не вдалося визначити конфесію духовенства.'
    return
  }

  if (Number.isNaN(invested) || invested < 50) {
    spreadReligionError.value = 'Мінімальна інвестиція — 50 ОВ.'
    return
  }

  if (invested % 50 !== 0) {
    spreadReligionError.value = 'Інвестиція має бути кратною 50 ОВ.'
    return
  }

  const faithBlockReason = spreadReligionFaithError.value
  if (faithBlockReason) {
    spreadReligionError.value = faithBlockReason
    return
  }

  if (Number.isNaN(roll)) {
    spreadReligionError.value = 'Вкажіть результат кидка.'
    return
  }

  if (converted === null) {
    spreadReligionError.value = 'Не вдалося розрахувати результат.'
    return
  }

  const clergyRef = doc(db, 'clergy', activeClergy.value.id)
  const targetReligionRef = doc(db, 'religions', targetReligion.id)
  let shieldBroken = false

  spreadReligionError.value = ''
  spreadReligionLoading.value = true

  try {
    await runTransaction(db, async (transaction) => {
      const clergySnapshot = await transaction.get(clergyRef)
      if (!clergySnapshot.exists()) {
        throw new Error('Духовенство не знайдено.')
      }

      const clergyData = clergySnapshot.data() || {}
      const currentFaith = Number(clergyData.faith ?? 0)
      if (currentFaith < invested) {
        throw new Error('Недостатньо ОВ для інвестиції.')
      }

      const targetSnapshot = await transaction.get(targetReligionRef)
      if (!targetSnapshot.exists()) {
        throw new Error('Цільова конфесія не знайдена.')
      }

      const targetData = targetSnapshot.data() || {}
      const targetFollowers = Number(targetData.followers ?? 0)
      const targetSvTempRaw = Number(targetData.svTemp ?? DEFAULT_VALUES.svTemp)

      const religionSnapshot = await transaction.get(religionRef)
      if (!religionSnapshot.exists()) {
        throw new Error('Конфесія духовенства не знайдена.')
      }

      const religionData = religionSnapshot.data() || {}
      const sourceFollowers = Number(religionData.followers ?? 0)

      transaction.update(clergyRef, { faith: currentFaith - invested })

      transaction.update(religionRef, { followers: sourceFollowers + converted })

      const targetUpdates = {
        followers: Math.max(0, targetFollowers - converted),
        svTemp: targetSvTempRaw + 1,
      }

      if (targetData.shieldActive) {
        targetUpdates.shieldActive = false
        targetUpdates.shieldBonus = 0
        shieldBroken = true
      }

      transaction.update(targetReligionRef, targetUpdates)

      if (heroRef) {
        transaction.update(heroRef, { downtimeAvailable: false })
      }
    })

    await Promise.all([
      addDoc(collection(clergyRef, 'logs'), {
        delta: -invested,
        message: `Поширення релігії: інвестиція ${invested} ОВ, кидок ${roll}, DM Mod ${dmMod}, DC ${dc}, результат ${result}. Конвертовано ${converted}. ${
          notes || 'Без нотаток'
        }`,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
      addDoc(collection(db, 'religionActions'), {
        actionType: doc(db, 'religionActionTypes', 'influence'),
        hero: heroRef || null,
        heroId: heroRef?.id,
        clergy: clergyRef,
        religion: religionRef,
        targetReligion: targetReligionRef,
        investedFaith: invested,
        roll,
        dmMod,
        notes,
        targetSVTotal: spreadTargetSVTotal.value,
        dc,
        result,
        convertedFollowers: converted,
        shieldBroken,
        downtimeConsumed: true,
        cycleId,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
    ])

    religionStore.setDowntimeAvailability(activeClergy.value.id, false)

    spreadReligionForm.roll = null
    spreadReligionForm.dmMod = 0
    spreadReligionForm.notes = ''
  } catch (e) {
    console.error('[religion] Failed to apply spread religion', e)
    spreadReligionError.value = e?.message || 'Не вдалося застосувати поширення релігії.'
  } finally {
    spreadReligionLoading.value = false
  }
}

async function saveShieldState() {
  if (!isAdmin.value || !activeClergyReligion.value) return

  const religionRefSource = activeClergy.value?.religion
  const religionRef = religionRefSource?.path
    ? doc(db, religionRefSource.path)
    : religionRefSource?.id
      ? doc(db, 'religions', religionRefSource.id)
      : religionRefSource

  if (!religionRef) {
    shieldUpdateError.value = 'Не вдалося визначити конфесію.'
    return
  }

  shieldUpdateError.value = ''
  shieldUpdateSuccess.value = false
  shieldUpdateLoading.value = true

  const updates = { shieldActive: manualShieldActive.value }
  if (!manualShieldActive.value) {
    updates.shieldBonus = 0
  }

  try {
    await updateDoc(religionRef, updates)
    shieldUpdateSuccess.value = true
  } catch (e) {
    console.error('[religion] Failed to update shield state', e)
    shieldUpdateError.value = e?.message || 'Не вдалося оновити стан щита.'
  } finally {
    shieldUpdateLoading.value = false
  }
}

async function applyActiveFaithFarm() {
  if (!isAdmin.value || !activeClergy.value) return

  const roll = Number(activeFaithFarmForm.roll)
  const dmMod = Number(activeFaithFarmForm.dmMod ?? 0)
  const heroRefSource = activeClergy.value.heroRef
  const cycleId = latestCycle.value?.id
  const gained = activeFaithFarmFollowers.value
  const dc = activeFaithFarmDC.value

  if (!downtimeAvailable.value) {
    activeFaithFarmError.value = 'Даутайм недоступний для цього героя.'
    return
  }

  if (!cycleId) {
    activeFaithFarmError.value = 'Спочатку додайте поточний цикл.'
    return
  }

  const heroRef = heroRefSource?.path ? doc(db, heroRefSource.path) : heroRefSource

  if (!heroRef) {
    activeFaithFarmError.value = 'Не вдалося визначити героя духовенства.'
    return
  }

  if (Number.isNaN(roll)) {
    activeFaithFarmError.value = 'Вкажіть результат кидка.'
    return
  }

  if (gained === null) {
    activeFaithFarmError.value = 'Не вдалося розрахувати здобуті ОВ.'
    return
  }

  activeFaithFarmError.value = ''
  activeFaithFarmLoading.value = true

  const clergyRef = doc(db, 'clergy', activeClergy.value.id)
  const religionRef = activeClergy.value.religion?.path
    ? doc(db, activeClergy.value.religion.path)
    : activeClergy.value.religion || null

  try {
    await runTransaction(db, async (transaction) => {
      const clergySnapshot = await transaction.get(clergyRef)
      if (!clergySnapshot.exists()) {
        throw new Error('Духовенство не знайдено.')
      }

      const clergyData = clergySnapshot.data() || {}
      const currentFaith = Number(clergyData.faith ?? 0)
      const currentFaithMax = Number(clergyData.faithMax ?? 0)
      const updatedFaith = currentFaith + gained
      const updates = { faith: updatedFaith }

      if (updatedFaith > currentFaithMax) {
        updates.faithMax = updatedFaith
      }

      transaction.update(clergyRef, updates)
      transaction.update(heroRef, {
        lastDowntimeCycleId: cycleId,
        downtimeAvailable: false,
      })
    })

    await Promise.all([
      addDoc(collection(clergyRef, 'logs'), {
        delta: gained,
        message: `Активний фарм: кидок ${roll}, модифікатор ${dmMod}, DC ${dc}. ${
          activeFaithFarmForm.notes?.trim() || 'Без нотаток'
        }`,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
      addDoc(collection(db, 'religionActions'), {
        actionType: doc(db, 'religionActionTypes', 'generate'),
        hero: heroRef,
        clergy: clergyRef,
        religion: religionRef,
        heroId: heroRef.id,
        roll,
        dmMod,
        notes: activeFaithFarmForm.notes?.trim() || '',
        dc,
        faithGained: gained,
        farmBase: activeFaithFarmBase.value,
        farmDCBase: activeFaithFarmDCBase.value,
        currentFaith: currentFaithPoints.value,
        cycleId,
        user: userStore.nickname || 'Адміністратор',
        createdAt: serverTimestamp(),
      }),
    ])

    religionStore.setDowntimeAvailability(activeClergy.value.id, false)

    activeFaithFarmForm.roll = null
    activeFaithFarmForm.notes = ''
    activeFaithFarmForm.dmMod = 0
  } catch (e) {
    console.error('[religion] Failed to apply active faith farm', e)
    activeFaithFarmError.value = e?.message || 'Не вдалося застосувати ферму віри.'
  } finally {
    activeFaithFarmLoading.value = false
  }
}

</script>
<style scoped>
.error {
  color: #dc2626;
  font-size: 15px;
  margin-top: 8px;
}

.current-cycle-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-cycle-text {
  padding-left: 6px;
}

.view-toggle {
  margin-left: 0;
}

.view-toggle__btn {
  white-space: nowrap;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

.distribution-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.chart-chip {
  font-weight: 600;
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

@media (max-width: 520px) {
  .distribution-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .distribution-actions > .v-btn {
    width: 100%;
  }

  .view-toggle {
    width: 100%;
  }

  .view-toggle__btn {
    flex: 1;
    min-width: 0;
    padding-inline: 10px;
    justify-content: center;
  }

  .view-toggle__btn .v-btn__prepend {
    margin-inline-end: 0;
  }

  .toggle-label {
    display: none;
  }
}

@media (max-width: 600px) {
  .section-overlay {
    background-size: 80% !important;
  }
}
</style>
