<template>
  <v-container class="dashboard-page">
    <section class="campaign-header">
      <div class="campaign-title-block">
        <div class="campaign-mark">
          <v-icon size="42">mdi-compass-rose</v-icon>
        </div>
        <div>
          <h1 class="campaign-title">Панель кампанії</h1>
          <p class="campaign-subtitle">
            Стан острова, кораблів та підсумки останнього завершеного циклу.
          </p>
        </div>
      </div>

      <div class="cycle-strip" aria-label="Підсумок циклів">
        <div class="cycle-cell">
          <span>Поточний цикл</span>
          <strong>{{ currentCycleLabel }}</strong>
        </div>
        <div class="cycle-cell">
          <span>Останній завершений цикл</span>
          <strong>{{ finishedCycleLabel }}</strong>
        </div>
        <div class="cycle-cell">
          <span>Тривалість циклу</span>
          <strong>{{ finishedCycleDurationLabel }}</strong>
        </div>
      </div>
    </section>

    <WiPanel v-if="error" class="dashboard-state" variant="danger">
      <WiEmptyState
        title="Не вдалося завантажити дані"
        :text="error"
        icon="mdi-alert-octagon"
      />
    </WiPanel>

    <WiPanel v-else-if="loading" class="dashboard-state" variant="sea">
      <WiEmptyState title="Завантажуємо стан кампанії" text="Дані дашборду завантажуються..." icon="mdi-loading">
        <v-progress-circular indeterminate color="primary" />
      </WiEmptyState>
    </WiPanel>

    <template v-else>
      <WiPanel class="expedition-panel" title="Остання експедиція" icon="mdi-map-marker-path">
        <template #actions>
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-format-list-bulleted"
            :disabled="!data.expeditions.length"
            @click="expeditionsDialog = true"
          >
            Усі експедиції
          </v-btn>
        </template>

        <div v-if="data.lastCycle.expedition" class="expedition-summary">
          <div class="expedition-summary__icon"><v-icon size="30">mdi-sail-boat</v-icon></div>
          <div>
            <span class="card-label">Назва пригоди</span>
            <h2>{{ data.lastCycle.expedition.adventureTitle }}</h2>
            <p>Учасники: {{ expeditionParticipantNames }}</p>
            <p>Тривалість: {{ data.lastCycle.expedition.durationDays ?? 'невідомо' }} днів · Моряків: {{ data.lastCycle.expedition.totalCrewCount ?? 'невідомо' }}</p>
          </div>
        </div>
        <WiEmptyState v-else title="Дані про останню експедицію відсутні" icon="mdi-map-marker-off" />
      </WiPanel>

      <div class="dashboard-primary-grid">
        <WiPanel class="repair-panel" title="Пошкоджені кораблі, що потребують ремонту" icon="mdi-tools">
          <div v-if="data.damagedShips.length" class="ship-table">
            <div class="ship-table__head" aria-hidden="true">
              <span>Назва корабля</span>
              <span>Тип</span>
              <span>HP</span>
              <span>HP макс.</span>
              <span>Втрата HP</span>
              <span>HP %</span>
            </div>

            <article v-for="ship in data.damagedShips" :key="ship.id" class="ship-row">
              <div class="ship-row__name">
                <div class="ship-icon">
                  <v-icon size="26">mdi-sail-boat</v-icon>
                </div>
                <div>
                  <div class="ship-name">{{ ship.name || ship.id }}</div>
                  <div class="ship-mobile-type">{{ ship.type || 'Корабель' }}</div>
                </div>
              </div>
              <div class="ship-type">{{ ship.type || 'Корабель' }}</div>
              <div class="ship-number">{{ ship.hp }}</div>
              <div class="ship-number">{{ ship.hpMax }}</div>
              <div class="ship-number">{{ ship.missingHp }}</div>
              <div class="ship-health">
                <strong>{{ ship.hpPercent }}%</strong>
                <div class="hp-track" :aria-label="`Міцність ${ship.hpPercent}%`">
                  <div class="hp-fill" :style="{ width: `${ship.hpPercent}%` }" />
                </div>
              </div>
            </article>
          </div>

          <WiEmptyState
            v-else
            title="Кораблі в доброму стані"
            text="Немає кораблів, що потребують ремонту."
            icon="mdi-shield-check"
          />
        </WiPanel>

        <WiPanel class="cycle-panel" title="Зміни за останній завершений цикл" icon="mdi-calendar-star">
          <div class="cycle-summary-list">
            <section class="cycle-summary-row">
              <div class="summary-icon">
                <v-icon size="28">mdi-account-group</v-icon>
              </div>
              <div class="summary-content">
                <h2>Населення</h2>
                <div class="summary-values summary-values--three">
                  <div>
                    <span>До циклу</span>
                    <strong>{{ populationBefore }}</strong>
                  </div>
                  <div>
                    <span>Після циклу</span>
                    <strong>{{ populationAfter }}</strong>
                  </div>
                  <div>
                    <span>Дельта</span>
                    <strong :class="deltaClass(populationDelta)">{{ signedNumber(populationDelta) }}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section class="cycle-summary-row">
              <div class="summary-icon">
                <v-icon size="28">mdi-treasure-chest</v-icon>
              </div>
              <div class="summary-content">
                <h2>Скарбниця</h2>
                <div class="summary-values summary-values--three">
                  <div>
                    <span>Дохід</span>
                    <strong>{{ formatAmount(data.lastCycle.treasury.income) }}</strong>
                  </div>
                  <div>
                    <span>Витрати</span>
                    <strong>{{ formatAmount(data.lastCycle.treasury.expenses) }}</strong>
                  </div>
                  <div>
                    <span>Чистий підсумок</span>
                    <strong :class="deltaClass(data.lastCycle.treasury.net)">
                      {{ signedAmount(data.lastCycle.treasury.net) }}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section class="cycle-summary-row">
              <div class="summary-icon">
                <v-icon size="28">mdi-home-city</v-icon>
              </div>
              <div class="summary-content">
                <h2>Додано будівель</h2>
                <div class="building-summary">
                  <div>
                    <span>Кількість</span>
                    <strong>{{ data.lastCycle.buildingsAdded.length }}</strong>
                  </div>
                  <p>{{ buildingsAddedText || 'Нових будівель за цикл не записано.' }}</p>
                </div>
              </div>
            </section>
          </div>
        </WiPanel>
      </div>

      <section class="dashboard-section">
        <WiSectionHeader title="Головні досягнення останнього циклу" icon="mdi-trophy-award" />

        <div class="highlight-grid">
          <WiPanel class="highlight-panel" variant="parchment">
            <article class="highlight-card">
              <div class="highlight-icon">
                <v-icon size="42">mdi-fish</v-icon>
              </div>
              <div>
                <div class="card-label">Найкращий улов риби</div>
                <h3>{{ data.lastCycle.bestFish?.fishName || 'Улов не записано' }}</h3>
                <dl>
                  <div>
                    <dt>Рибалка</dt>
                    <dd>{{ data.lastCycle.bestFish?.username || 'Немає даних' }}</dd>
                  </div>
                  <div>
                    <dt>Значення</dt>
                    <dd>{{ data.lastCycle.bestFish ? `${formatGoldFromSilver(data.lastCycle.bestFish.fishValue)} золота` : 'Немає даних' }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </WiPanel>

          <WiPanel class="highlight-panel" variant="parchment">
            <article class="highlight-card">
              <div class="highlight-icon">
                <v-icon size="42">mdi-anvil</v-icon>
              </div>
              <div>
                <div class="card-label">Найкращий герой-ремісник</div>
                <h3>{{ data.lastCycle.bestCrafter?.heroName || 'Крафт не записано' }}</h3>
                <dl>
                  <div>
                    <dt>Вартість</dt>
                    <dd>{{ data.lastCycle.bestCrafter ? formatAmount(data.lastCycle.bestCrafter.totalValue) : 'Немає даних' }}</dd>
                  </div>
                  <div>
                    <dt>Предмети</dt>
                    <dd>{{ data.lastCycle.bestCrafter?.totalItems ?? 'Немає даних' }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </WiPanel>

          <WiPanel class="highlight-panel" variant="parchment">
            <article class="highlight-card">
              <div class="highlight-icon">
                <v-icon size="42">mdi-magic-staff</v-icon>
              </div>
              <div>
                <div class="card-label">Найкраще магічне прохання</div>
                <h3>{{ data.lastCycle.bestMageRequest?.spellName || 'Заявок не записано' }}</h3>
                <dl>
                  <div>
                    <dt>Компенсація</dt>
                    <dd>{{ data.lastCycle.bestMageRequest ? formatAmount(data.lastCycle.bestMageRequest.compensation) : 'Немає даних' }}</dd>
                  </div>
                  <div>
                    <dt>Виконав герой</dt>
                    <dd>{{ data.lastCycle.bestMageRequest?.fulfilledByHeroName || 'Немає даних' }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </WiPanel>

          <WiPanel class="highlight-panel" variant="parchment">
            <article class="highlight-card">
              <div class="highlight-icon">
                <v-icon size="42">mdi-candle</v-icon>
              </div>
              <div>
                <div class="card-label">Найбільше витрачено віри</div>
                <h3>{{ faithSpendHero || 'Витрат не записано' }}</h3>
                <dl>
                  <div>
                    <dt>Дія</dt>
                    <dd>{{ faithSpendAction || 'Немає даних' }}</dd>
                  </div>
                  <div>
                    <dt>Витрачено віри</dt>
                    <dd>{{ data.lastCycle.largestFaithSpend ? data.lastCycle.largestFaithSpend.faithSpent : 'Немає даних' }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </WiPanel>
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
          <template #item.dates="{ item }">{{ item.startedAt }} - {{ item.finishedAt }}</template>
          <template #item.participants="{ item }">{{ expeditionParticipants(item) }}</template>
          <template #item.totalCrewCount="{ item }">{{ item.totalCrewCount ?? 'Невідомо' }}</template>
          <template #item.durationDays="{ item }">{{ item.durationDays ?? 'Невідомо' }}</template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPanel from '@/components/ui/WiPanel.vue'
import WiSectionHeader from '@/components/ui/WiSectionHeader.vue'
import { fetchDashboardData } from '@/services/dashboardService.js'
import { formatAmount } from '@/utils/formatters.js'
import { silverToGold } from '@/utils/fishingUtils.js'
import { diffInDays, parseFaerunDate } from '@/utils/faerun-date.js'

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

const populationDelta = computed(() => data.lastCycle.population?.populationDelta ?? null)
const expeditionParticipantNames = computed(() => {
  const participants = data.lastCycle.expedition?.participants || []
  return participants.length ? participants.map((participant) => participant.heroName).join(', ') : 'невідомо'
})
const currentCycleLabel = computed(() => cycleLabel(data.currentCycle, 'Немає активного циклу'))
const finishedCycleLabel = computed(() => cycleLabel(data.lastFinishedCycle, 'Немає завершеного циклу'))
const finishedCycleDurationLabel = computed(() => formatCycleDuration(data.lastFinishedCycle))
const populationBefore = computed(() => formatPopulationValue(data.lastCycle.population?.populationBefore))
const populationAfter = computed(() => formatPopulationValue(data.lastCycle.population?.populationAfter))

function expeditionParticipants(expedition) {
  const participants = expedition?.participants || []
  return participants.length ? participants.map((participant) => participant.heroName).join(', ') : 'Невідомо'
}
const buildingsAddedText = computed(() => {
  if (!data.lastCycle.buildingsAdded.length) return ''
  return data.lastCycle.buildingsAdded.map((building) => building.name).join(', ')
})
const faithSpendHero = computed(() => {
  const action = data.lastCycle.largestFaithSpend
  if (!action) return ''
  return action.heroName || action.user || action.heroId || ''
})
const faithSpendAction = computed(() => {
  const action = data.lastCycle.largestFaithSpend
  if (!action) return ''
  const actionType = action.actionType?.id || action.actionTypeId || action.type || 'Дія віри'
  return action.label || faithActionLabel(actionType)
})

function cycleLabel(cycle, fallback) {
  if (!cycle) return fallback
  if (cycle.startedAt && cycle.finishedAt) return `${cycle.startedAt} - ${cycle.finishedAt}`
  return cycle.startedAt || cycle.id || fallback
}

function formatCycleDuration(cycle) {
  const storedDuration = Number(cycle?.duration)
  if (Number.isFinite(storedDuration) && storedDuration > 0) return `${storedDuration} ${dayWord(storedDuration)}`

  const start = parseFaerunDate(cycle?.startedAt)
  const finish = parseFaerunDate(cycle?.finishedAt)
  if (!start || !finish) return 'Немає даних'

  const duration = diffInDays(start, finish)
  return Number.isFinite(duration) && duration > 0 ? `${duration} ${dayWord(duration)}` : 'Немає даних'
}

function dayWord(value) {
  const n = Math.abs(Number(value))
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'днів'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дні'
  return 'днів'
}

function formatPopulationValue(value) {
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : 'невідомо'
}

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
  if (n > 0) return 'is-positive'
  if (n < 0) return 'is-negative'
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
  padding-top: 22px;
  padding-bottom: 40px;
}

.campaign-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid rgba(200, 150, 42, 0.46);
  border-radius: var(--wi-radius-md);
  background:
    linear-gradient(90deg, rgba(12, 8, 4, 0.92), rgba(17, 22, 22, 0.9)),
    var(--wi-panel-bg);
  box-shadow: var(--wi-shadow-panel);
}

.campaign-title-block,
.cycle-strip {
  display: flex;
  align-items: center;
  min-width: 0;
}

.campaign-title-block {
  gap: 16px;
}

.campaign-title-block > div:last-child {
  min-width: 0;
}

.campaign-mark {
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(200, 150, 42, 0.48);
  border-radius: 50%;
  color: var(--wi-gold);
  background: radial-gradient(circle, rgba(200, 150, 42, 0.18), rgba(12, 8, 4, 0.1));
}

.campaign-title {
  margin: 0;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  font-size: 2.35rem;
  line-height: 1;
  letter-spacing: 0.035em;
  overflow-wrap: anywhere;
  text-transform: uppercase;
}

.campaign-subtitle {
  max-width: 600px;
  margin: 8px 0 0;
  color: var(--wi-text-muted);
  font-size: 0.95rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.cycle-strip {
  flex: 0 1 760px;
  justify-content: flex-end;
  border-left: 1px solid rgba(200, 150, 42, 0.34);
}

.cycle-cell {
  min-width: 0;
  flex: 1 1 0;
  padding: 8px 18px;
  border-right: 1px solid rgba(90, 62, 32, 0.65);
}

.cycle-cell:last-child {
  border-right: 0;
}

.cycle-cell span,
.card-label,
.ship-table__head span,
.summary-content h2,
.summary-values span,
.building-summary span,
.highlight-card dt {
  color: var(--wi-text-muted);
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.cycle-cell strong {
  display: block;
  margin-top: 6px;
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  font-size: 1.05rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.dashboard-state {
  margin-top: 18px;
}

.expedition-panel {
  margin-bottom: 14px;
}

.expedition-summary {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.expedition-summary__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--wi-gold);
}

.expedition-summary h2 {
  margin: 5px 0 8px;
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
}

.expedition-summary p {
  margin: 2px 0;
  color: var(--wi-text-muted);
  line-height: 1.35;
}

.dashboard-state :deep(.wi-empty-state) {
  border: 0;
  background: transparent;
}

.dashboard-primary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 14px;
  margin-bottom: 18px;
}

.repair-panel,
.cycle-panel {
  min-width: 0;
}

.ship-table {
  display: grid;
  gap: 8px;
}

.ship-table__head,
.ship-row {
  display: grid;
  grid-template-columns: minmax(170px, 1.7fr) minmax(90px, 0.75fr) minmax(52px, 0.45fr) minmax(72px, 0.55fr) minmax(88px, 0.65fr) minmax(105px, 0.8fr);
  align-items: center;
}

.ship-table__head {
  padding: 0 12px 6px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.62);
}

.ship-row {
  min-height: 76px;
  padding: 10px 12px;
  border: 1px solid rgba(90, 62, 32, 0.42);
  border-radius: var(--wi-radius-sm);
  background: linear-gradient(90deg, rgba(61, 42, 20, 0.78), rgba(31, 22, 12, 0.72));
}

.ship-row__name {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.ship-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(200, 150, 42, 0.32);
  border-radius: var(--wi-radius-sm);
  color: var(--wi-gold);
  background: rgba(200, 150, 42, 0.08);
}

.ship-name,
.highlight-card h3 {
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  line-height: 1.25;
}

.ship-name {
  font-size: 1.02rem;
  overflow-wrap: anywhere;
}

.ship-mobile-type {
  display: none;
  margin-top: 3px;
  color: var(--wi-text-muted);
  font-size: 0.78rem;
}

.ship-type,
.ship-number,
.ship-health strong {
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  font-size: 0.96rem;
}

.ship-health {
  display: grid;
  gap: 5px;
}

.hp-track {
  height: 8px;
  border: 1px solid rgba(90, 62, 32, 0.68);
  border-radius: 999px;
  overflow: hidden;
  background: rgba(7, 5, 3, 0.65);
}

.hp-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--wi-danger), var(--wi-gold));
}

.cycle-summary-list {
  display: grid;
  gap: 12px;
}

.cycle-summary-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.48);
}

.cycle-summary-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.summary-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wi-gold);
}

.summary-content h2 {
  margin: 0 0 10px;
  color: var(--wi-gold);
  font-size: 0.78rem;
}

.summary-values {
  display: grid;
  gap: 10px;
}

.summary-values--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-values strong,
.building-summary strong {
  display: block;
  margin-top: 4px;
  color: var(--wi-text);
  font-family: var(--wi-font-number);
  font-size: 1.35rem;
  line-height: 1.1;
}

.is-positive {
  color: var(--wi-success-light) !important;
}

.is-negative {
  color: var(--wi-danger-light) !important;
}

.building-summary {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.building-summary p {
  margin: 0;
  color: var(--wi-text);
  font-size: 0.92rem;
  line-height: 1.35;
}

.dashboard-section {
  margin-bottom: 26px;
}

.highlight-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.highlight-panel {
  position: relative;
  border-color: rgba(66, 39, 13, 0.92);
  background-image:
    linear-gradient(90deg, rgba(245, 209, 129, 0.24), rgba(126, 75, 26, 0.1)),
    url('/images/ui/parchment-card.webp') !important;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  box-shadow:
    inset 0 0 0 1px rgba(255, 236, 178, 0.18),
    inset 0 0 28px rgba(34, 17, 5, 0.24),
    0 10px 22px rgba(0, 0, 0, 0.34);
}

.highlight-panel::before,
.highlight-panel::after {
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

.highlight-panel::before {
  inset: 8px;
  border: 1px solid rgba(71, 42, 15, 0.28);
  border-radius: calc(var(--wi-radius-md) - 2px);
}

.highlight-panel::after {
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 243, 191, 0.1), transparent 46%),
    radial-gradient(circle at 92% 88%, rgba(43, 22, 7, 0.18), transparent 42%);
}

.highlight-panel :deep(.wi-panel__body) {
  position: relative;
  z-index: 1;
  padding: 28px 30px;
}

.highlight-card {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 18px;
  min-height: 218px;
}

.highlight-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: rgba(61, 31, 9, 0.95);
  filter: drop-shadow(0 1px 0 rgba(255, 236, 178, 0.32));
}

.highlight-card h3 {
  margin: 10px 0 14px;
  color: #241000 !important;
  font-size: 1.22rem;
  line-height: 1.18;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 0 rgba(255, 230, 168, 0.28);
}

.highlight-card dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.highlight-card dd {
  margin: 5px 0 0;
  color: #160b02;
  font-family: var(--wi-font-body);
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 0 rgba(255, 230, 168, 0.22);
}

.highlight-card :deep(.v-icon),
.highlight-icon :deep(.v-icon) {
  color: currentColor !important;
}

.highlight-card .card-label,
.highlight-card dt {
  color: rgba(44, 22, 5, 0.86);
  font-weight: 700;
}

.highlight-card .card-label {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(55, 28, 8, 0.34);
  color: rgba(36, 17, 4, 0.88);
  font-size: 0.72rem;
}

@media (max-width: 1180px) {
  .campaign-header,
  .dashboard-primary-grid {
    grid-template-columns: 1fr;
  }

  .campaign-header {
    flex-direction: column;
  }

  .cycle-strip {
    flex-basis: auto;
    width: 100%;
    justify-content: stretch;
    border-left: 0;
    border-top: 1px solid rgba(200, 150, 42, 0.28);
    padding-top: 10px;
  }

  .dashboard-primary-grid {
    display: grid;
  }

  .highlight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .campaign-title-block {
    align-items: flex-start;
    flex-direction: column;
  }

  .campaign-mark {
    width: 52px;
    height: 52px;
    flex-basis: 52px;
  }

  .campaign-title {
    font-size: 1.34rem;
    line-height: 1.08;
  }

  .cycle-strip {
    flex-direction: column;
  }

  .cycle-cell {
    padding: 10px 0;
    border-right: 0;
    border-bottom: 1px solid rgba(90, 62, 32, 0.54);
  }

  .cycle-cell:last-child {
    border-bottom: 0;
  }

  .dashboard-primary-grid,
  .highlight-grid {
    grid-template-columns: 1fr;
  }

  .ship-table__head {
    display: none;
  }

  .ship-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .ship-mobile-type {
    display: block;
  }

  .ship-type {
    display: none;
  }

  .ship-number {
    display: none;
  }

  .summary-values--three,
  .building-summary {
    grid-template-columns: 1fr;
  }
}
</style>
