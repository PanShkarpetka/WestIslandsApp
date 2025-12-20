<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Релігії острова (В розробці)
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
                    <v-btn value="diagram" prepend-icon="mdi-chart-donut">Діаграма</v-btn>
                    <v-btn value="table" prepend-icon="mdi-table">Таблиця</v-btn>
                  </v-btn-toggle>
                </div>
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
        <v-card-text class="pt-0 hero-clergy-modal">
          <v-alert v-if="actionError" type="error" variant="tonal" class="mb-3">
            {{ actionError }}
          </v-alert>

          <v-sheet class="clergy-overview" color="primary" variant="tonal" rounded="lg">
            <div class="clergy-overview__top">
              <div>
                <div class="text-caption text-medium-emphasis">Герой</div>
                <div class="text-h6 font-semibold">{{ activeClergy.heroName }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ activeClergy.religionName }}</div>
              </div>
              <div class="meta-pills">
                <div class="meta-pill">
                  <v-icon size="18" color="primary" v-if="hasIcon(activeClergy.religionName)">
                    <img
                        :src="`/images/religions/${activeClergy.religionName}.png`"
                        alt="Faith Icon"
                        width="18"
                        height="18"
                    />
                  </v-icon>
                  <v-icon v-else class="ml-1" color="primary" size="18">
                    mdi-dharmachakra
                  </v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">Очки віри</div>
                    <div class="text-subtitle-1 font-semibold text-black">
                      {{ activeClergy.faith }}<span v-if="activeClergy.faithMax"> / {{ activeClergy.faithMax }}</span>
                    </div>
                  </div>
                </div>
                <div class="meta-pill">
                  <v-icon size="18" :color="downtimeAvailable ? 'warning' : 'success'">mdi-progress-clock</v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">Даутайм</div>
                    <div class="text-subtitle-2 text-black">{{ downtimeAvailable ? 'Дію не виконано' : 'Дію виконано' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </v-sheet>

          <div v-if="isAdmin" class="clergy-grid">
            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Керування очками віри</div>
                  <div class="text-body-2 text-medium-emphasis">Оновіть ОВ та залиште пояснення для журналу.</div>
                </div>
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="faithChange"
                  type="number"
                  min="1"
                  label="Зміна ОВ"
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
              </div>

              <div class="d-flex gap-2 justify-space-between">
                <v-btn color="error" variant="tonal" :loading="actionLoading" @click="applyFaithChange('remove')">
                  <v-icon start>mdi-minus-circle</v-icon>
                  Зняти ОВ
                </v-btn>
                <v-btn color="success" :loading="actionLoading" @click="applyFaithChange('add')">
                  <v-icon start>mdi-plus-circle</v-icon>
                  Додати ОВ
                </v-btn>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Активний фарм віри</div>
                  <div class="text-body-2 text-medium-emphasis">Дія потребує доступного давнтайму та витрачає його</div>
                </div>
              </div>

              <v-alert v-if="activeFaithFarmError" type="error" variant="tonal" class="mb-3">
                {{ activeFaithFarmError }}
              </v-alert>

              <div class="field-row">
                <v-text-field
                  :model-value="activeClergy?.heroRef?.id || ''"
                  label="ID героя"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                  hint="Герой вибраного духовенства"
                />
                <v-text-field
                  v-model.number="activeFaithFarmForm.roll"
                  type="number"
                  label="Кидок"
                  density="comfortable"
                  hide-details="auto"
                  hint="Результат d20 скіл чека"
                />
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="activeFaithFarmForm.dmMod"
                  type="number"
                  label="DM Mod"
                  density="comfortable"
                  hide-details="auto"
                  prefix="±"
                />
                <v-text-field
                  :model-value="activeFaithFarmDC"
                  label="Базове DC"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  :model-value="currentFaithPoints"
                  label="Поточні ОВ"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
                <v-text-field
                  :model-value="activeFaithFarmFollowers ?? '—'"
                  label="Отриманті в результаті ОВ"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <v-text-field
                v-model="activeFaithFarmForm.notes"
                label="Нотатки / посилання"
                density="comfortable"
                hide-details="auto"
                hint="Наприклад, посилання на пост у Telegram"
              />

              <div class="d-flex gap-2 mt-3 justify-space-between">
                <v-btn
                  color="primary"
                  :loading="activeFaithFarmLoading"
                  :disabled="!downtimeAvailable"
                  @click="applyActiveFaithFarm"
                >
                  <v-icon start>mdi-shield-sun</v-icon>
                  Застосувати
                </v-btn>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Зміна конфесії</div>
                  <div class="text-body-2 text-medium-emphasis">Можна змінити конфесію героя з автоматичним штрафом віри.</div>
                </div>
                <v-btn
                  v-if="!changeReligionMode"
                  color="primary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-auto-fix"
                  @click="startReligionChange"
                >
                  Змінити конфесію
                </v-btn>
              </div>

              <div v-if="changeReligionMode" class="stacked-card">
                <v-alert v-if="changeReligionError" type="error" variant="tonal" class="mb-3">{{ changeReligionError }}</v-alert>

                <v-select
                  v-model="selectedReligionId"
                  :items="religionOptions"
                  item-title="title"
                  item-value="value"
                  label="Нова конфесія"
                  density="comfortable"
                  hide-details="auto"
                />

                <v-alert type="warning" variant="tonal" class="mt-3">
                  Буде знято {{ religionChangeFine }} ОВ ({{ religionChangeFinePercent }}%) з духовенства за зміну конфесії.
                </v-alert>

                <div class="d-flex gap-2 mt-3 justify-space-between">
                  <v-btn color="primary" :loading="changeReligionLoading" @click="confirmReligionChange">
                    <v-icon start>mdi-check</v-icon>
                    Підтвердити
                  </v-btn>
                  <v-btn variant="text" @click="cancelReligionChange">Скасувати</v-btn>
                </div>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Доступність даутайму</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Вкажіть чи доступний давнтайм в даному циклі.
                  </div>
                </div>
                <v-switch
                  v-model="downtimeAvailable"
                  inset
                  color="primary"
                  hide-details="auto"
                />
              </div>

              <v-alert
                v-if="downtimeUpdateError"
                type="error"
                variant="tonal"
                class="mt-3"
              >
                {{ downtimeUpdateError }}
              </v-alert>
              <v-alert
                v-else-if="downtimeUpdateSuccess"
                type="success"
                variant="tonal"
                class="mt-3"
              >
                Статус давнтайму оновлено.
              </v-alert>

              <div class="d-flex gap-2 mt-3 justify-space-between">
                <v-btn color="primary" :loading="downtimeUpdateLoading" @click="saveDowntimeAvailability">
                  <v-icon start>mdi-content-save</v-icon>
                  Зберегти
                </v-btn>
                <v-btn variant="text" @click="resetDowntimeState">Скинути</v-btn>
              </div>
            </v-sheet>
          </div>

          <v-sheet class="action-card log-card" rounded="lg" elevation="0">
            <div class="d-flex align-center gap-2 mb-3">
              <v-avatar color="primary" size="28" variant="tonal">
                <v-icon size="18">mdi-history</v-icon>
              </v-avatar>
              <div style="margin-left: 5px">
                <div class="text-subtitle-2 font-semibold">Журнал змін</div>
              </div>
            </div>
            <div v-if="logsLoading" class="text-gray-500">Завантаження журналу…</div>
            <div v-else-if="logsError" class="error">{{ logsError }}</div>
            <div v-else-if="clergyLogs.length === 0" class="text-gray-500">Поки що немає записів.</div>
            <v-list v-else density="comfortable">
              <v-list-item v-for="log in clergyLogs" :key="log.id" class="log-entry">
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
          </v-sheet>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeDialog">Закрити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="followersDialogOpen" max-width="720">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <div class="text-subtitle-1 font-semibold">Розподіл послідовників</div>
            <div class="text-body-2 text-medium-emphasis">Оберіть кількість послідовників для кожної конфесії.</div>
          </div>
          <v-chip v-if="distributionSelected" color="primary" variant="tonal">
            {{ distributionSelected.name }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <v-alert
            v-if="followersError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ followersError }}
          </v-alert>

          <p class="text-body-2 text-medium-emphasis mb-4">
            Загалом населення: {{ totalPopulationLabel }}. Розподіліть послідовників між конфесіями. Залишок: {{ followersRemaining }}.
          </p>

          <div
            v-for="item in editedFollowers"
            :key="item.name"
            class="followers-row"
            :class="{ 'followers-row--selected': item.name === distributionSelected?.name }"
          >
            <div class="followers-row__header">
              <div class="d-flex align-center gap-2">
                <span class="color-bullet" :style="{ backgroundColor: item.color }"></span>
                <div>
                  <div class="text-subtitle-2 font-semibold">{{ item.name }}</div>
                  <div class="text-caption text-medium-emphasis">Було: {{ item.followers.toLocaleString('uk-UA') }} вірян</div>
                </div>
              </div>
              <div class="text-caption text-medium-emphasis">≈ {{ followersPercentFor(item.newFollowers) }}%</div>
            </div>

            <div class="followers-row__controls">
              <v-slider
                v-model.number="item.newFollowers"
                :min="0"
                :max="followersSliderCeiling"
                step="1"
                color="primary"
                thumb-label="always"
                hide-details
              />
              <v-text-field
                v-model.number="item.newFollowers"
                type="number"
                label="Послідовники"
                density="comfortable"
                hide-details
                class="count-input"
                variant="outlined"
                :min="0"
              />
            </div>

            <div class="text-caption text-medium-emphasis">
              Буде: <b>{{ Number(item.newFollowers || 0).toLocaleString('uk-UA') }}</b> вірян (Δ {{ followersDelta(item) }})
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeFollowersDialog" :disabled="followersSaving">Скасувати</v-btn>
          <v-btn color="primary" :loading="followersSaving" :disabled="followersOverLimit" @click="saveFollowersDistribution">
            Зберегти розподіл
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="newCycleDialog" max-width="640">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-3">mdi-playlist-plus</v-icon>
          <span class="text-h6">Почати новий цикл</span>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="cycleError" type="error" variant="tonal" class="mb-4">
            {{ cycleError }}
          </v-alert>
          <v-form ref="newCycleForm">
            <FaerunDatePicker
              v-model="cycleForm.startedDate"
              label="Початок"
              placeholder="Оберіть дату початку"
              :year="currentFaerunYear"
            />
            <FaerunDatePicker
              v-model="cycleForm.finishedDate"
              label="Завершення (необов'язково)"
              placeholder="Оберіть дату завершення"
              :year="currentFaerunYear"
              clearable
              hint="Залиште поле порожнім, якщо цикл ще триває"
            />
            <v-text-field
              :model-value="cycleDurationLabel"
              label="Тривалість"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
              readonly
            />
            <v-textarea
              v-model="cycleForm.notes"
              label="Нотатки до дії"
              auto-grow
              rows="2"
              density="comfortable"
              hide-details="auto"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeNewCycleDialog">Скасувати</v-btn>
          <v-btn color="primary" :loading="cycleSaving" @click="createCycle">
            Створити цикл
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { addDoc, collection, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch, runTransaction } from 'firebase/firestore'
import { BUILDING_LEVEL_BONUSES, DEFAULT_VALUES, useReligionStore } from '@/store/religionStore'
import { useUserStore } from '@/store/userStore'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { Chart as ChartJS, ArcElement, Legend, Title, Tooltip } from 'chart.js'
import ReligionDistributionDiagram from '@/components/ReligionDistributionDiagram.vue'
import ReligionDistributionTable from '@/components/ReligionDistributionTable.vue'
import ReligionTable from '@/components/ReligionTable.vue'
import FaerunDatePicker from '@/components/FaerunDatePicker.vue'
import { db } from '@/services/firebase'
import { DEFAULT_YEAR, diffInDays, formatFaerunDate, normalizeFaerunDate, parseFaerunDate } from 'faerun-date'

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
const newCycleForm = ref(null)
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
const changeReligionMode = ref(false)
const selectedReligionId = ref('')
const changeReligionLoading = ref(false)
const changeReligionError = ref('')
const downtimeAvailable = ref(true)
const downtimeUpdateLoading = ref(false)
const downtimeUpdateError = ref('')
const downtimeUpdateSuccess = ref(false)
const activeClergyReligion = computed(() => {
  const religionId = activeClergy.value?.religion?.id
  if (!religionId) return null

  return religionStore.religions.find((item) => item.id === religionId) || null
})
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

const sortedRecords = computed(() => {
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return records.value.slice().sort((a, b) => {
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

const activeClergy = computed(() => records.value.find((item) => item.id === selectedClergyId.value))
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

watch(activeClergy, resetDowntimeState)

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
        message: `Активна ферма: кидок ${roll}, модифікатор ${dmMod}, DC ${dc}. ${
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

.clergy-overview {
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(63, 81, 181, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.clergy-overview__top {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.meta-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-pill {
  display: flex;
  gap: 10px;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.clergy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.action-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(245, 247, 255, 0.8));
  border: 1px solid rgba(63, 81, 181, 0.08);
  padding: 14px;
}

.action-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.field-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.stacked-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(63, 81, 181, 0.08);
}

.log-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 246, 255, 0.9));
}

.log-entry + .log-entry {
  border-top: 1px dashed rgba(0, 0, 0, 0.05);
}
.hero-clergy-modal {
  margin-top: 10px;
}

.color-bullet {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.followers-row {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background-color: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.followers-row--selected {
  border-color: #3f51b5;
  box-shadow: 0 4px 18px rgba(63, 81, 181, 0.15);
}

.followers-row__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.followers-row__controls {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 12px;
  align-items: center;
  margin-bottom: 6px;
}

@media (max-width: 960px) {
  .distribution-section {
    padding: 12px 12px 0;
  }

  .distribution-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .section-overlay {
    background-size: 65% !important;
  }
}

@media (max-width: 600px) {
  .followers-row__controls {
    grid-template-columns: 1fr;
  }

  .section-overlay {
    background-size: 80% !important;
  }
}
</style>
