<template>
  <div class="population-page">

    <div v-if="store.loading" class="pop-state">
      <v-icon class="mr-2" size="16">mdi-compass</v-icon>
      Завантаження…
    </div>
    <div v-else-if="store.items.length === 0" class="pop-state">
      <v-icon class="mr-2" size="16">mdi-anchor</v-icon>
      Немає даних.
    </div>

    <div v-else class="pop-layout">

      <!-- Cards column -->
      <div class="pop-cards-wrap">
        <v-row class="pop-cards-row">
          <v-col
            v-for="g in viewRows"
            :key="g.id"
            cols="12"
            sm="6"
            xl="3"
          >
            <div
              class="pop-card"
              :class="{ 'pop-card-admin': isAdmin, 'pop-card-bureaucrat': g.isBureaucrat }"
              @click="openEditor(g)"
            >
              <!-- Background image -->
              <div class="pop-card-bg" :style="{ backgroundImage: `url(${g.imageUrl})` }" />
              <!-- Gradient overlay always -->
              <div class="pop-card-gradient" />
              <!-- Hover description overlay -->
              <div class="pop-card-hover-desc">
                <p class="pop-card-desc-text">{{ g.description || '—' }}</p>
              </div>
              <!-- Stats (visible by default, fade on hover) -->
              <div class="pop-card-stats">
                <div class="pop-stat-percent wi-number">{{ g.percentRounded }}%</div>
                <div class="pop-stat-count">{{ g.count }} осіб</div>
                <template v-if="g.isBureaucrat">
                  <div class="pop-stat-income">
                    <v-icon size="12" class="mr-1">mdi-badge-account</v-icon>
                    {{ formatAmount(g.incomePerPerson) }} <span class="wi-coin">зм</span> / особа
                  </div>
                  <div class="pop-stat-income">
                    <v-icon size="12" class="mr-1">mdi-shield-check</v-icon>
                    Нагляд: {{ g.count * 100 }} осіб
                  </div>
                </template>
                <div v-else class="pop-stat-income">
                  <v-icon size="12" class="mr-1">mdi-gold</v-icon>
                  {{ formatAmount(g.incomePerPerson) }} / особа
                </div>
              </div>
              <!-- Card name badge at bottom -->
              <div class="pop-card-name">{{ g.name }}</div>
              <!-- Admin edit hint -->
              <div v-if="isAdmin" class="pop-card-edit-hint">
                <v-icon size="12" class="mr-1">mdi-feather</v-icon>
                Редагувати
              </div>
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- Chart column -->
      <div class="pop-chart-wrap">
        <div class="pop-chart-card">
          <div class="pop-chart-header">
            <v-icon class="mr-2" size="16">mdi-account-group</v-icon>
            Групи населення
          </div>
          <div class="pop-chart-totals">
            <span class="pop-total-item">
              <v-icon size="13" class="mr-1">mdi-account-multiple</v-icon>
              Разом: <strong>{{ totalPopulation }}</strong> осіб
            </span>
            <span class="pop-total-item">
              <v-icon size="13" class="mr-1">mdi-gold</v-icon>
              Дохід: <strong>{{ formatAmount(populationIncomeTotal) }}</strong> зм
            </span>
          </div>
          <div v-if="bureaucratStats.bureaucratCount > 0" class="pop-bureaucrat-stats">
            <span class="pop-total-item">
              <v-icon size="13" class="mr-1">mdi-badge-account</v-icon>
              Бюрократи: <strong>{{ bureaucratStats.bureaucratCount }}</strong> осіб
            </span>
            <span class="pop-total-item">
              <v-icon size="13" class="mr-1">mdi-shield-check</v-icon>
              Охоплення: <strong>{{ bureaucratStats.coveragePercent }}%</strong>
              <span v-if="bureaucratStats.isFull" class="pop-bureaucrat-full wi-success-text">&nbsp;✓ повне</span>
            </span>
            <span class="pop-total-item">
              <v-icon size="13" class="mr-1">mdi-gold</v-icon>
              Утримання: <strong>{{ formatAmount(bureaucratStats.maintenanceCost) }} зм</strong>
            </span>
          </div>
          <div class="pop-chart-canvas">
            <Pie :data="chartData" :options="chartOptions" />
          </div>
        </div>
      </div>

    </div>

    <!-- Edit dialog -->
    <v-dialog v-model="showEditor" max-width="580" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="pop-dialog">
        <div class="pop-dialog-header">
          <v-icon class="mr-2">mdi-account-group</v-icon>
          Розподіл населення
        </div>
        <v-card-text class="pop-dialog-body" v-if="editedGroups.length">

          <p class="pop-dialog-note">Змініть кількість для кожної групи. Сума не має перевищувати загальне населення острова.</p>

          <div
            v-for="g in editedGroups"
            :key="g.id"
            class="pop-group-row"
          >
            <div class="pop-group-row-header">
              <span class="pop-group-name">{{ g.name }}</span>
              <span class="pop-group-was">було: {{ g.count }} осіб · {{ g.percentRounded }}%</span>
            </div>
            <div class="pop-slider-row">
              <v-slider
                v-model.number="g.newCount"
                :min="0"
                :max="sliderCeiling"
                step="1"
                color="primary"
                thumb-label="always"
                hide-details
                class="pop-slider"
              />
              <v-text-field
                v-model.number="g.newCount"
                type="number"
                label="Кількість"
                density="compact"
                hide-details
                class="pop-count-input"
                variant="outlined"
                :min="0"
              />
            </div>
            <div class="pop-group-will-be">
              Буде: <strong>{{ g.newCount || 0 }}</strong> осіб (≈ {{ percentFor(g.newCount) }}%)
            </div>
          </div>

          <div class="pop-dialog-totals">
            Загалом: <strong>{{ editedTotal }}</strong> з {{ totalPopulation }} осіб
            <span class="pop-remaining" :class="overLimit ? 'remaining-over' : ''">
              (залишок: {{ remaining }})
            </span>
          </div>
          <div v-if="overLimit" class="pop-dialog-error">
            <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>
            Сума груп перевищує населення острова. Зменште на {{ Math.abs(remaining) }}.
          </div>
          <div v-if="error" class="pop-dialog-error">
            <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>
            {{ error }}
          </div>

        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="pop-dialog-actions">
          <v-btn variant="text" class="cancel-btn" @click="closeEditor" :disabled="saving">Скасувати</v-btn>
          <v-spacer />
          <v-btn class="save-btn" :loading="saving" :disabled="saving || overLimit" prepend-icon="mdi-feather" @click="saveGroup">
            Зберегти
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { useUserStore } from '@/store/userStore'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { formatAmount } from '@/utils/formatters'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

const store = usePopulationStore()
const islandStore = useIslandStore()
const userStore = useUserStore()

onMounted(() => store.startListening(islandStore.currentId))
onBeforeUnmount(() => store.stopListening())
watch(() => islandStore.currentId, (id) => store.startListening(id))

const totalPopulation = computed(() => store.totalPopulation)
const populationIncomeTotal = computed(() => store.populationIncomeTotal || 0)
const isAdmin = computed(() => userStore?.isAdmin ?? false)

/* Pirate palette — matches the design system */
const PALETTE = ['#c8962a', '#7b4f2e', '#3a6080', '#5a8a3c', '#8b6914', '#4a7a6a', '#7a3a3a', '#5a6a3a']

const bureaucratStats = computed(() => store.bureaucratStats)

const viewRows = computed(() => {
  return store.groupsAugmented.map((g, i) => ({
    ...g,
    color: PALETTE[i % PALETTE.length],
    isBureaucrat: g.faction === 'bureaucrats',
  }))
})

const chartData = computed(() => ({
  labels: viewRows.value.map(g => g.name),
  datasets: [{
    data: viewRows.value.map(g => g.percentRounded),
    backgroundColor: viewRows.value.map(g => g.color),
    borderColor: '#1a1209',
    borderWidth: 2,
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: '#a8896a',
        font: { family: 'Cinzel, serif', size: 11 },
        padding: 12,
      },
    },
    title: { display: false },
    tooltip: {
      backgroundColor: '#0f0a04',
      titleColor: '#c8962a',
      bodyColor: '#f0ddb0',
      borderColor: '#5a3e20',
      borderWidth: 1,
      callbacks: {
        label: (ctx) => {
          const g = viewRows.value[ctx.dataIndex]
          return `${g.name}: ${g.percentRounded}% · ${g.count} осіб · ${formatAmount(g.incomePerPerson * g.count)} зм`
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

const editedTotal = computed(() => editedGroups.value.reduce((sum, g) => sum + (Number(g.newCount) || 0), 0))
const remaining = computed(() => (totalPopulation.value || 0) - editedTotal.value)
const overLimit = computed(() => remaining.value < 0)

function percentFor(value) {
  const total = totalPopulation.value || editedTotal.value || 1
  return Math.round(((Number(value) || 0) / total * 100) * 10) / 10
}

function openEditor(group) {
  if (!isAdmin.value) return
  selectedGroup.value = group
  editedGroups.value = store.groupsAugmented.map((g) => ({ ...g, newCount: g.count || 0 }))
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
    await Promise.all(editedGroups.value.map((g) => store.setGroupCount(g.id, g.newCount)))
    showEditor.value = false
  } catch (e) {
    error.value = e?.message || 'Не вдалося зберегти'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Page ───────────────────────────────────────────────────── */
.population-page {
  padding-bottom: 16px;
}

.pop-state {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  padding: 24px 0;
}

.pop-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}

.pop-cards-wrap {
  flex: 1 1 520px;
  min-width: 0;
}

.pop-cards-row {
  margin: 0 -8px;
}

/* ── Population cards ───────────────────────────────────────── */
.pop-card {
  position: relative;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--wi-border);
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.pop-card-admin {
  cursor: pointer;
}

.pop-card-admin:hover {
  border-color: rgba(200, 150, 42, 0.6);
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
}

.pop-card-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: top center;
  transition: transform 0.3s ease;
}

.pop-card-admin:hover .pop-card-bg {
  transform: scale(1.04);
}

.pop-card-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(10, 6, 2, 0.85) 0%, rgba(10, 6, 2, 0.1) 60%, transparent 100%);
  pointer-events: none;
}

/* Hover description overlay */
.pop-card-hover-desc {
  position: absolute;
  inset: 0;
  background: rgba(10, 6, 2, 0.82);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
}

.pop-card:hover .pop-card-hover-desc {
  opacity: 1;
}

.pop-card-desc-text {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.9rem;
  color: var(--wi-text);
  line-height: 1.55;
  text-align: center;
  margin: 0;
}

/* Stats at bottom-right */
.pop-card-stats {
  position: absolute;
  right: 12px;
  bottom: 36px;
  text-align: right;
  transition: opacity 0.2s;
}

.pop-card:hover .pop-card-stats {
  opacity: 0;
}

.pop-stat-percent {
  font-size: 1.8rem;
  line-height: 1;
  color: var(--wi-gold);
  text-shadow: 0 0 10px rgba(200,150,42,0.5), 0 1px 4px rgba(0,0,0,0.8);
}

.pop-stat-count {
  font-family: var(--wi-font-body);
  font-size: 0.8rem;
  color: var(--wi-text);
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  margin-top: 2px;
}

.pop-stat-income {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-family: var(--wi-font-body);
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  margin-top: 2px;
}

.pop-stat-income .v-icon {
  color: var(--wi-gold) !important;
}

/* Name badge at very bottom */
.pop-card-name {
  position: absolute;
  bottom: 10px;
  left: 12px;
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
}

/* Edit hint */
.pop-card-edit-hint {
  position: absolute;
  bottom: 10px;
  right: 12px;
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  opacity: 0;
  transition: opacity 0.2s;
}

.pop-card-admin:hover .pop-card-edit-hint {
  opacity: 1;
}

/* ── Chart card ─────────────────────────────────────────────── */
.pop-chart-wrap {
  flex: 0 1 320px;
  min-width: 260px;
}

.pop-chart-card {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
}

.pop-chart-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #1a1108;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.pop-chart-header .v-icon {
  color: var(--wi-gold) !important;
}

.pop-chart-totals {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.3);
}

.pop-total-item {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-size: 0.82rem;
  color: var(--wi-text-muted);
}

.pop-total-item strong {
  color: var(--wi-text);
  margin: 0 4px;
}

.pop-total-item .v-icon {
  color: var(--wi-gold) !important;
}

.pop-chart-canvas {
  height: 280px;
  padding: 12px;
}

/* ── Edit dialog ────────────────────────────────────────────── */
.pop-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.pop-dialog-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.pop-dialog-body {
  padding: 20px !important;
}

.pop-dialog-note {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.82rem;
  color: var(--wi-text-muted);
  margin-bottom: 16px;
}

/* Group rows */
.pop-group-row {
  padding: 12px 14px;
  border: 1px solid rgba(90, 62, 32, 0.5);
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
  margin-bottom: 10px;
}

.pop-group-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.pop-group-name {
  font-family: var(--wi-font-heading);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: var(--wi-text);
}

.pop-group-was {
  font-family: var(--wi-font-body);
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  font-style: italic;
  flex-shrink: 0;
}

.pop-slider-row {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 10px;
  align-items: center;
}

.pop-count-input :deep(input) {
  text-align: center;
  font-family: var(--wi-font-body) !important;
  color: var(--wi-text) !important;
}

.pop-slider :deep(.v-slider-thumb__label) {
  background: var(--wi-gold) !important;
  color: #1a1209 !important;
  font-family: var(--wi-font-body) !important;
  font-size: 0.75rem !important;
}

.pop-group-will-be {
  font-family: var(--wi-font-body);
  font-size: 0.78rem;
  color: var(--wi-text-muted);
  margin-top: 4px;
}

.pop-group-will-be strong {
  color: var(--wi-text);
}

.pop-dialog-totals {
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  color: var(--wi-text-muted);
  margin-top: 12px;
}

.pop-dialog-totals strong {
  color: var(--wi-text);
}

.pop-remaining { margin-left: 6px; }
.remaining-over { color: var(--wi-danger); }

.pop-dialog-error {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.85rem;
  margin-top: 8px;
}

.pop-dialog-actions {
  padding: 12px 20px !important;
}

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
}

.save-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}

.save-btn :deep(.v-btn__overlay) {
  opacity: 0 !important;
}

/* ── Bureaucrat card ────────────────────────────────────────── */
.pop-card-bureaucrat {
  border-color: var(--wi-sea) !important;
}

.pop-card-bureaucrat:hover {
  border-color: rgba(58, 96, 128, 0.8) !important;
  box-shadow: 0 6px 24px rgba(0,0,0,0.6) !important;
}

/* ── Bureaucrat stats panel ─────────────────────────────────── */
.pop-bureaucrat-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 16px;
  border-top: 1px solid rgba(90, 62, 32, 0.3);
  border-bottom: 1px solid rgba(90, 62, 32, 0.3);
}

.pop-bureaucrat-full {
  color: var(--wi-success);
  font-size: 0.78rem;
}
</style>
