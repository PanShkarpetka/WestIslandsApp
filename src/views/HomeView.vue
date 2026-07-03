<template>
  <v-container class="dashboard-page">
    <section class="dashboard-header">
      <div>
        <div class="dashboard-kicker">
          <v-icon size="16">mdi-compass-rose</v-icon>
          Панель кампанії
        </div>
      </div>

      <div class="cycle-strip">
        <div class="cycle-pill">
          <span>Останній цикл</span>
          <strong>{{ finishedCycleLabel }}</strong>
        </div>
      </div>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="loading" class="dashboard-loading">
      <v-progress-circular indeterminate color="primary" />
      <span>Завантажуємо стан кампанії...</span>
    </div>

    <template v-else>
      <section class="dashboard-section">
        <div class="section-heading">
          <v-icon size="18">mdi-map-marker-path</v-icon>
          <h2>Остання експедиція</h2>
          <v-spacer />
          <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-format-list-bulleted" :disabled="!data.expeditions.length" @click="expeditionsDialog = true">
            Усі експедиції
          </v-btn>
        </div>
        <article v-if="data.lastCycle.expedition" class="dashboard-card expedition-card">
          <div class="card-icon"><v-icon>mdi-sail-boat</v-icon></div>
          <div class="card-main">
            <div class="card-label">Назва пригоди</div>
            <div class="card-title">{{ data.lastCycle.expedition.adventureTitle }}</div>
            <div class="card-note">
              Учасники: {{ expeditionParticipantNames }}<br>
              Тривалість: {{ data.lastCycle.expedition.durationDays ?? 'невідомо' }} днів · Моряків: {{ data.lastCycle.expedition.totalCrewCount ?? 'невідомо' }}
            </div>
          </div>
        </article>
        <div v-else class="empty-panel">Дані про останню експедицію відсутні.</div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <v-icon size="18">mdi-tools</v-icon>
          <h2>Потребують ремонту</h2>
        </div>

        <div v-if="data.damagedShips.length" class="ship-grid">
          <article v-for="ship in data.damagedShips" :key="ship.id" class="dashboard-card ship-card">
            <div class="card-icon danger">
              <v-icon>mdi-sail-boat-sink</v-icon>
            </div>
            <div class="card-main">
              <div class="card-label">{{ ship.type || 'Корабель' }}</div>
              <div class="card-title">{{ ship.name || ship.id }}</div>
              <div class="hp-track">
                <div class="hp-fill" :style="{ width: `${ship.hpPercent}%` }" />
              </div>
              <div class="card-note">
                {{ ship.hp }} / {{ ship.hpMax }} міцності | треба відновити {{ ship.missingHp }}
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-panel">
          <v-icon size="20">mdi-shield-check</v-icon>
          Немає кораблів, що потребують ремонту.
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <v-icon size="18">mdi-calendar-star</v-icon>
          <h2>Зміни минулого циклу</h2>
        </div>

        <div class="summary-grid">
          <article class="dashboard-card metric-card">
            <div class="card-label">Населення</div>
            <div class="metric-value" :class="deltaClass(populationDelta)">
              {{ signedNumber(populationDelta) }}
            </div>
            <div class="card-note">
              {{ populationNote }}
            </div>
          </article>

          <article class="dashboard-card metric-card">
            <div class="card-label">Скарбниця</div>
            <div class="metric-value" :class="deltaClass(data.lastCycle.treasury.net)">
              {{ signedAmount(data.lastCycle.treasury.net) }}
            </div>
            <div class="card-note">
              +{{ formatAmount(data.lastCycle.treasury.income) }} дохід | -{{ formatAmount(data.lastCycle.treasury.expenses) }} витрати
            </div>
          </article>

          <article class="dashboard-card metric-card">
            <div class="card-label">Збудовано</div>
            <div class="metric-value">{{ data.lastCycle.buildingsAdded.length }}</div>
            <div class="card-note">
              {{ buildingsAddedText }}
            </div>
          </article>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <v-icon size="18">mdi-trophy-award</v-icon>
          <h2>Найкраще за минулий цикл</h2>
        </div>

        <div class="highlight-grid">
          <HighlightCard
            icon="mdi-fish"
            label="Найкращий улов"
            :title="data.lastCycle.bestFish?.fishName || 'Улов не записано'"
            :note="data.lastCycle.bestFish ? `${data.lastCycle.bestFish.username} | ${formatGoldFromSilver(data.lastCycle.bestFish.fishValue)} золота` : 'У журналі риболовлі немає успішного улову за цей цикл.'"
          />

          <HighlightCard
            icon="mdi-anvil"
            label="Найкращий майстер"
            :title="data.lastCycle.bestCrafter?.heroName || 'Крафт не записано'"
            :note="data.lastCycle.bestCrafter ? `${formatAmount(data.lastCycle.bestCrafter.totalValue)} вартість компонентів | ${data.lastCycle.bestCrafter.totalItems} предметів` : 'За цей цикл немає записів крафту.'"
          />

          <HighlightCard
            icon="mdi-magic-staff"
            label="Найкраща заявка магів"
            :title="data.lastCycle.bestMageRequest?.spellName || ''"
            :note="data.lastCycle.bestMageRequest ? `${formatAmount(data.lastCycle.bestMageRequest.compensation)} винагорода | ${data.lastCycle.bestMageRequest.fulfilledByHeroName || 'Невідомий герой'}` : 'За останній завершений цикл немає виконаних заявок.'"
          />

          <HighlightCard
            icon="mdi-candle"
            label="Найбільша витрата віри"
            :title="faithSpendTitle"
            :note="data.lastCycle.largestFaithSpend ? `${data.lastCycle.largestFaithSpend.faithSpent} очок віри витрачено` : 'За цей цикл не записано витрат віри.'"
          />
        </div>
      </section>
    </template>
  </v-container>

  <v-dialog v-model="expeditionsDialog" max-width="1100">
    <v-card>
      <div class="pa-4 d-flex align-center" style="border-bottom: 1px solid var(--wi-border)">
        <span class="wi-heading text-h6">Усі експедиції</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" aria-label="Закрити" @click="expeditionsDialog = false" />
      </div>
      <v-card-text class="pt-4">
        <v-data-table :headers="expeditionHeaders" :items="data.expeditions" :items-per-page="10" density="compact">
          <template #item.dates="{ item }">{{ item.startedAt }} — {{ item.finishedAt }}</template>
          <template #item.participants="{ item }">{{ expeditionParticipants(item) }}</template>
          <template #item.totalCrewCount="{ item }">{{ item.totalCrewCount ?? 'Невідомо' }}</template>
          <template #item.durationDays="{ item }">{{ item.durationDays ?? 'Невідомо' }}</template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { fetchDashboardData } from '@/services/dashboardService.js'
import { formatAmount } from '@/utils/formatters.js'
import { silverToGold } from '@/utils/fishingUtils.js'

const loading = ref(true)
const error = ref('')
const expeditionsDialog = ref(false)
const data = reactive({
  currentCycle: null,
  lastFinishedCycle: null,
  damagedShips: [],
  expeditions: [],
  lastCycle: {
    treasury: { income: 0, expenses: 0, net: 0, count: 0 },
    population: null,
    buildingsAdded: [],
    bestFish: null,
    bestCrafter: null,
    bestMageRequest: null,
    largestFaithSpend: null,
    expedition: null,
  },
})

const expeditionHeaders = [
  { title: 'Назва пригоди', key: 'adventureTitle' },
  { title: 'Дати', key: 'dates' },
  { title: 'Учасники', key: 'participants' },
  { title: 'Моряків', key: 'totalCrewCount' },
  { title: 'Днів', key: 'durationDays' },
]

const HighlightCard = defineComponent({
  props: {
    icon: { type: String, required: true },
    label: { type: String, required: true },
    title: { type: String, default: '' },
    note: { type: String, required: true },
  },
  setup(props) {
    return () => h('article', { class: 'dashboard-card highlight-card' }, [
      h('div', { class: 'card-icon' }, [h('i', { class: `mdi ${props.icon}` })]),
      h('div', { class: 'card-main' }, [
        h('div', { class: 'card-label' }, props.label),
        props.title ? h('div', { class: 'card-title' }, props.title) : null,
        h('div', { class: 'card-note' }, props.note),
      ]),
    ])
  },
})

const populationDelta = computed(() => data.lastCycle.population?.populationDelta ?? null)
const expeditionParticipantNames = computed(() => {
  const participants = data.lastCycle.expedition?.participants || []
  return participants.length ? participants.map((participant) => participant.heroName).join(', ') : 'невідомо'
})

function expeditionParticipants(expedition) {
  const participants = expedition?.participants || []
  return participants.length ? participants.map((participant) => participant.heroName).join(', ') : 'Невідомо'
}
const finishedCycleLabel = computed(() => {
  if (!data.lastFinishedCycle) return 'Немає завершеного циклу'
  if (data.lastFinishedCycle.startedAt && data.lastFinishedCycle.finishedAt) {
    return `${data.lastFinishedCycle.startedAt} - ${data.lastFinishedCycle.finishedAt}`
  }
  return data.lastFinishedCycle.startedAt || data.lastFinishedCycle.id
})
const populationNote = computed(() => {
  const summary = data.lastCycle.population
  if (!summary || summary.populationDelta === null) return 'Для цього циклу ще немає зрізу населення.'
  return `${summary.populationBefore ?? 'невідомо'} -> ${summary.populationAfter ?? 'невідомо'} жителів`
})
const buildingsAddedText = computed(() => {
  if (!data.lastCycle.buildingsAdded.length) return ''
  return data.lastCycle.buildingsAdded.map((building) => building.name).join(', ')
})
const faithSpendTitle = computed(() => {
  const action = data.lastCycle.largestFaithSpend
  if (!action) return ''
  const actionType = action.actionType?.id || action.actionTypeId || action.type || 'Дія віри'
  return action.notes || action.label || faithActionLabel(actionType)
})

function signedNumber(value) {
  if (value === null || value === undefined) return '-'
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n > 0 ? `+${n}` : String(n)
}

function signedAmount(value) {
  const n = Number(value || 0)
  return `${n >= 0 ? '+' : '-'}${formatAmount(Math.abs(n))} золота`
}

function formatGoldFromSilver(value) {
  return formatAmount(silverToGold(value))
}

function faithActionLabel(actionType) {
  const key = String(actionType || '')
  const labels = {
    shield: 'Захисний щит',
    influence: 'Поширення віри',
    changeReligion: 'Зміна релігії',
    awardAdventure: 'Нагорода за пригоду',
    generate: 'Генерація віри',
  }
  return labels[key] || key || 'Дія віри'
}

function deltaClass(value) {
  const n = Number(value ?? 0)
  if (n > 0) return 'positive'
  if (n < 0) return 'negative'
  return ''
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchDashboardData()
    Object.assign(data, result)
  } catch (err) {
    console.error('[dashboard] Failed to load', err)
    error.value = 'Не вдалося завантажити дашборд кампанії.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard-page {
  padding-top: 24px;
  padding-bottom: 40px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-end;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--wi-border);
  margin-bottom: 22px;
}

.dashboard-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--wi-font-heading);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.dashboard-title {
  margin: 6px 0 0;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1;
}

.cycle-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.cycle-pill {
  min-width: 190px;
  padding: 10px 12px;
  border: 1px solid var(--wi-border);
  border-radius: 6px;
  background: rgba(44, 30, 15, 0.58);
}

.cycle-pill span,
.card-label {
  display: block;
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.cycle-pill strong {
  display: block;
  margin-top: 3px;
  color: var(--wi-gold);
  font-family: var(--wi-font-body);
  font-size: 0.9rem;
}

.dashboard-loading,
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 100px;
  border: 1px dashed var(--wi-border);
  border-radius: 8px;
  color: var(--wi-text-muted);
  background: rgba(44, 30, 15, 0.28);
}

.dashboard-section {
  margin-bottom: 26px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--wi-gold);
}

.section-heading h2 {
  margin: 0;
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ship-grid,
.summary-grid,
.highlight-grid {
  display: grid;
  gap: 12px;
}

.ship-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.highlight-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dashboard-card {
  display: flex;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(44, 30, 15, 0.92), rgba(26, 18, 9, 0.9));
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.25);
}

.metric-card {
  display: block;
}

.card-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--wi-gold);
  background: rgba(200, 150, 42, 0.1);
  border: 1px solid rgba(200, 150, 42, 0.22);
}

.card-icon.danger {
  color: var(--wi-danger);
  background: rgba(139, 42, 42, 0.12);
  border-color: rgba(139, 42, 42, 0.35);
}

.card-main {
  min-width: 0;
  flex: 1;
}

.card-title {
  margin-top: 4px;
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  font-size: 1.08rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.card-note {
  margin-top: 7px;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  line-height: 1.35;
}

.metric-value {
  margin-top: 8px;
  color: var(--wi-gold);
  font-family: var(--wi-font-number);
  font-size: 2.35rem;
  line-height: 1;
}

.metric-value.positive {
  color: var(--wi-success);
}

.metric-value.negative {
  color: var(--wi-danger);
}

.hp-track {
  height: 8px;
  margin-top: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(90, 62, 32, 0.5);
  border: 1px solid rgba(90, 62, 32, 0.65);
}

.hp-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--wi-danger), var(--wi-gold));
}

@media (max-width: 960px) {
  .dashboard-header {
    align-items: stretch;
    flex-direction: column;
  }

  .cycle-strip {
    justify-content: flex-start;
  }

  .summary-grid,
  .highlight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .summary-grid,
  .highlight-grid {
    grid-template-columns: 1fr;
  }

  .cycle-pill {
    min-width: 100%;
  }
}
</style>
