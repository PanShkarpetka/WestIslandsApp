<template>
  <v-container class="dashboard-page">
    <WiPageHeader
      title="Панель кампанії"
      subtitle="Поточний стан острова, підсумки минулого циклу та дії, які потребують уваги."
      icon="mdi-compass-rose"
    >
      <template #actions>
        <WiMetricCard class="cycle-summary" label="Останній цикл" :value="finishedCycleLabel" />
      </template>
    </WiPageHeader>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <WiEmptyState v-if="loading" title="Завантажуємо стан кампанії" icon="mdi-loading">
      <v-progress-circular indeterminate color="primary" />
    </WiEmptyState>

    <template v-else>
      <section class="dashboard-section">
        <WiSectionHeader title="Потребують ремонту" icon="mdi-tools" />

        <div v-if="data.damagedShips.length" class="ship-grid">
          <WiPanel v-for="ship in data.damagedShips" :key="ship.id" class="ship-card" variant="danger">
            <div class="ship-card__content">
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
            </div>
          </WiPanel>
        </div>

        <WiEmptyState
          v-else
          title="Кораблі в доброму стані"
          text="Немає кораблів, що потребують ремонту."
          icon="mdi-shield-check"
        />
      </section>

      <section class="dashboard-section">
        <WiSectionHeader title="Зміни минулого циклу" icon="mdi-calendar-star" />

        <div class="summary-grid">
          <WiMetricCard
            label="Населення"
            :tone="deltaTone(populationDelta)"
            :value="signedNumber(populationDelta)"
            :note="populationNote"
          />

          <WiMetricCard
            label="Скарбниця"
            :tone="deltaTone(data.lastCycle.treasury.net)"
            :value="signedAmount(data.lastCycle.treasury.net)"
          >
            +{{ formatAmount(data.lastCycle.treasury.income) }} дохід | -{{ formatAmount(data.lastCycle.treasury.expenses) }} витрати
          </WiMetricCard>

          <WiMetricCard
            label="Збудовано"
            :value="data.lastCycle.buildingsAdded.length"
            :note="buildingsAddedText || 'Нових будівель за цикл не записано.'"
          />
        </div>
      </section>

      <section class="dashboard-section">
        <WiSectionHeader title="Найкраще за минулий цикл" icon="mdi-trophy-award" />

        <div class="highlight-grid">
          <WiPanel>
            <div class="highlight-card">
              <div class="card-icon">
                <v-icon>mdi-fish</v-icon>
              </div>
              <div class="card-main">
                <div class="card-label">Найкращий улов</div>
                <div class="card-title">{{ data.lastCycle.bestFish?.fishName || 'Улов не записано' }}</div>
                <div class="card-note">
                  {{ data.lastCycle.bestFish ? `${data.lastCycle.bestFish.username} | ${formatGoldFromSilver(data.lastCycle.bestFish.fishValue)} золота` : 'У журналі риболовлі немає успішного улову за цей цикл.' }}
                </div>
              </div>
            </div>
          </WiPanel>

          <WiPanel>
            <div class="highlight-card">
              <div class="card-icon">
                <v-icon>mdi-anvil</v-icon>
              </div>
              <div class="card-main">
                <div class="card-label">Найкращий майстер</div>
                <div class="card-title">{{ data.lastCycle.bestCrafter?.heroName || 'Крафт не записано' }}</div>
                <div class="card-note">
                  {{ data.lastCycle.bestCrafter ? `${formatAmount(data.lastCycle.bestCrafter.totalValue)} вартість компонентів | ${data.lastCycle.bestCrafter.totalItems} предметів` : 'За цей цикл немає записів крафту.' }}
                </div>
              </div>
            </div>
          </WiPanel>

          <WiPanel>
            <div class="highlight-card">
              <div class="card-icon">
                <v-icon>mdi-magic-staff</v-icon>
              </div>
              <div class="card-main">
                <div class="card-label">Найкраща заявка магів</div>
                <div v-if="data.lastCycle.bestMageRequest?.spellName" class="card-title">{{ data.lastCycle.bestMageRequest.spellName }}</div>
                <div class="card-note">
                  {{ data.lastCycle.bestMageRequest ? `${formatAmount(data.lastCycle.bestMageRequest.compensation)} винагорода | ${data.lastCycle.bestMageRequest.fulfilledByHeroName || 'Невідомий герой'}` : 'За останній завершений цикл немає виконаних заявок.' }}
                </div>
              </div>
            </div>
          </WiPanel>

          <WiPanel>
            <div class="highlight-card">
              <div class="card-icon">
                <v-icon>mdi-candle</v-icon>
              </div>
              <div class="card-main">
                <div class="card-label">Найбільша витрата віри</div>
                <div v-if="faithSpendTitle" class="card-title">{{ faithSpendTitle }}</div>
                <div class="card-note">
                  {{ data.lastCycle.largestFaithSpend ? `${data.lastCycle.largestFaithSpend.faithSpent} очок віри витрачено` : 'За цей цикл не записано витрат віри.' }}
                </div>
              </div>
            </div>
          </WiPanel>
        </div>
      </section>
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiMetricCard from '@/components/ui/WiMetricCard.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'
import WiSectionHeader from '@/components/ui/WiSectionHeader.vue'
import { fetchDashboardData } from '@/services/dashboardService.js'
import { formatAmount } from '@/utils/formatters.js'
import { silverToGold } from '@/utils/fishingUtils.js'

const loading = ref(true)
const error = ref('')
const data = reactive({
  currentCycle: null,
  lastFinishedCycle: null,
  damagedShips: [],
  lastCycle: {
    treasury: { income: 0, expenses: 0, net: 0, count: 0 },
    population: null,
    buildingsAdded: [],
    bestFish: null,
    bestCrafter: null,
    bestMageRequest: null,
    largestFaithSpend: null,
  },
})

const populationDelta = computed(() => data.lastCycle.population?.populationDelta ?? null)
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

function deltaTone(value) {
  const n = Number(value ?? 0)
  if (n > 0) return 'success'
  if (n < 0) return 'danger'
  return 'default'
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

.cycle-summary {
  min-width: 240px;
}

.dashboard-section {
  margin-bottom: 26px;
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

.ship-card__content,
.highlight-card {
  display: flex;
  gap: 12px;
  min-width: 0;
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

.card-label {
  display: block;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.075em;
  text-transform: uppercase;
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
}
</style>
