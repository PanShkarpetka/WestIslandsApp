<template>
  <div v-if="isAdmin" class="harvest-section">
    <div class="harvest-section-title">
      <v-icon size="15" class="mr-1" color="#c8962a">mdi-sprout</v-icon>
      Врожай
    </div>

    <!-- Built date -->
    <div class="harvest-field-row">
      <FaerunDatePicker
        v-model="localBuiltAt"
        label="Дата будівництва"
        placeholder="Оберіть дату"
        clearable
        @update:modelValue="saveBuiltAt"
      />
    </div>

    <!-- Error from manual fulfillment (shown outside collapsed panels) -->
    <v-alert v-if="fulfillError" type="error" density="compact" variant="tonal" class="mb-2" closable @click:close="fulfillError = ''">
      {{ fulfillError }}
    </v-alert>

    <!-- Yield events list -->
    <div v-if="sortedYields.length" class="yield-events-list">
      <div
        v-for="event in sortedYields"
        :key="event.id"
        class="yield-event-row"
        :class="{ 'yield-processed': event.processed }"
      >
        <div class="yield-event-info">
          <span class="yield-event-date">{{ event.date }}</span>
          <span class="yield-event-recipient">→ {{ recipientLabel(event.destination) }}</span>
          <span class="yield-event-goods">{{ goodsLabel(event) }}</span>
        </div>
        <div class="yield-event-status">
          <template v-if="event.processed">
            <v-chip size="x-small" :color="event.manuallyFulfilled ? 'warning' : 'success'" variant="tonal">
              <v-icon start size="11">{{ event.manuallyFulfilled ? 'mdi-hand-okay' : 'mdi-check' }}</v-icon>
              {{ event.manuallyFulfilled ? 'Вручну' : 'Авто' }}{{ event.processedAmounts && !event.manuallyFulfilled ? ': ' + processedAmountsLabel(event.processedAmounts) : '' }}
            </v-chip>
          </template>
          <template v-else>
            <v-btn
              size="x-small"
              variant="text"
              :icon="fulfillManuallyLoading === event.id ? 'mdi-loading' : 'mdi-hand-okay'"
              :loading="fulfillManuallyLoading === event.id"
              color="warning"
              title="Виконати вручну"
              @click="fulfillManually(event.id)"
            />
            <v-btn
              size="x-small"
              variant="text"
              icon="mdi-delete"
              color="error"
              @click="removeEvent(event.id)"
            />
          </template>
        </div>
      </div>
    </div>
    <div v-else class="yield-empty">Подій немає</div>

    <!-- Add event form -->
    <v-expansion-panels v-model="addPanel" class="mt-3" variant="accordion">
      <v-expansion-panel value="add">
        <v-expansion-panel-title class="harvest-expand-title">
          <v-icon size="14" class="mr-1">mdi-plus</v-icon>
          Додати подію врожаю
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="add-event-form">
            <FaerunDatePicker
              v-model="newEvent.date"
              label="Дата врожаю"
              placeholder="Оберіть дату"
            />

            <!-- Recipient type -->
            <v-btn-toggle v-model="newEvent.destinationType" mandatory density="compact" class="mb-3 dest-toggle">
              <v-btn value="hero" size="small">Герой</v-btn>
              <v-btn value="guild" size="small">Гільдія</v-btn>
            </v-btn-toggle>

            <v-select
              v-if="newEvent.destinationType === 'hero'"
              v-model="newEvent.heroId"
              :items="heroOptions"
              item-title="name"
              item-value="id"
              label="Герой"
              density="comfortable"
              hide-details="auto"
              class="mb-3"
              clearable
            />
            <v-select
              v-else
              v-model="newEvent.guildId"
              :items="guildOptions"
              item-title="name"
              item-value="id"
              label="Гільдія"
              density="comfortable"
              hide-details="auto"
              class="mb-3"
              clearable
            />

            <!-- Goods rows -->
            <div v-for="(row, idx) in newEvent.goodsRows" :key="idx" class="good-row">
              <v-select
                v-model="row.goodId"
                :items="goodsOptions"
                item-title="label"
                item-value="id"
                label="Товар"
                density="comfortable"
                hide-details="auto"
                class="flex-grow-1"
              />
              <v-text-field
                v-model="row.amount"
                label="Кількість (або кубики)"
                placeholder="20d10 або 15"
                density="comfortable"
                hide-details="auto"
                class="amount-field"
              />
              <v-btn icon size="small" variant="text" color="error" @click="removeGoodRow(idx)">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
            <v-btn size="small" variant="text" prepend-icon="mdi-plus" class="mb-3" @click="addGoodRow">
              Додати товар
            </v-btn>

            <v-alert v-if="addEventError" type="error" density="compact" variant="tonal" class="mb-2">{{ addEventError }}</v-alert>
            <v-btn color="primary" size="small" :loading="saving" @click="addEvent">Додати подію</v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <!-- Recurring schedule generator -->
      <v-expansion-panel value="recurring">
        <v-expansion-panel-title class="harvest-expand-title">
          <v-icon size="14" class="mr-1">mdi-calendar-sync</v-icon>
          Генерувати розклад
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="recurring-form">
            <FaerunDatePicker
              v-model="recurring.startDate"
              label="Перша дата врожаю"
              placeholder="Оберіть дату"
            />
            <v-text-field
              v-model.number="recurring.intervalDays"
              type="number"
              min="1"
              label="Інтервал (днів)"
              density="comfortable"
              hide-details="auto"
              class="mb-3"
            />

            <!-- Recipient type -->
            <v-btn-toggle v-model="recurring.destinationType" mandatory density="compact" class="mb-3 dest-toggle">
              <v-btn value="hero" size="small">Герой</v-btn>
              <v-btn value="guild" size="small">Гільдія</v-btn>
            </v-btn-toggle>

            <v-select
              v-if="recurring.destinationType === 'hero'"
              v-model="recurring.heroId"
              :items="heroOptions"
              item-title="name"
              item-value="id"
              label="Герой"
              density="comfortable"
              hide-details="auto"
              class="mb-3"
              clearable
            />
            <v-select
              v-else
              v-model="recurring.guildId"
              :items="guildOptions"
              item-title="name"
              item-value="id"
              label="Гільдія"
              density="comfortable"
              hide-details="auto"
              class="mb-3"
              clearable
            />

            <!-- Goods rows for recurring -->
            <div v-for="(row, idx) in recurring.goodsRows" :key="idx" class="good-row">
              <v-select
                v-model="row.goodId"
                :items="goodsOptions"
                item-title="label"
                item-value="id"
                label="Товар"
                density="comfortable"
                hide-details="auto"
                class="flex-grow-1"
              />
              <v-text-field
                v-model="row.amount"
                label="Кількість (або кубики)"
                placeholder="20d10 або 15"
                density="comfortable"
                hide-details="auto"
                class="amount-field"
              />
              <v-btn icon size="small" variant="text" color="error" @click="removeRecurringGoodRow(idx)">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
            <v-btn size="small" variant="text" prepend-icon="mdi-plus" class="mb-3" @click="addRecurringGoodRow">
              Додати товар
            </v-btn>

            <div class="d-flex align-center gap-3 mb-3">
              <v-text-field
                v-model.number="recurring.count"
                type="number"
                min="1"
                label="Кількість повторень"
                density="comfortable"
                hide-details="auto"
                :disabled="recurring.unlimited"
                class="flex-grow-1"
              />
              <v-checkbox
                v-model="recurring.unlimited"
                label="Необмежено (10 років)"
                hide-details
                density="compact"
              />
            </div>

            <!-- Preview -->
            <div v-if="recurringPreviewDates.length" class="recurring-preview">
              <div class="recurring-preview-label">Попередній перегляд ({{ recurringPreviewDates.length }} подій):</div>
              <div class="recurring-preview-dates">
                <span v-for="(d, i) in recurringPreviewDates.slice(0, 8)" :key="i" class="preview-date-chip">{{ d }}</span>
                <span v-if="recurringPreviewDates.length > 8" class="preview-more">+{{ recurringPreviewDates.length - 8 }} ще</span>
              </div>
            </div>

            <v-alert v-if="recurringError" type="error" density="compact" variant="tonal" class="mb-2">{{ recurringError }}</v-alert>
            <v-btn color="primary" size="small" :loading="savingRecurring" :disabled="!recurringPreviewDates.length" @click="generateRecurring">
              Згенерувати {{ recurringPreviewDates.length || '' }} подій
            </v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useIslandStore } from '@/store/islandStore'
import { useHeroesStore } from '@/store/heroesStore'
import { useGoodsStore } from '@/store/goodsStore'
import { useGuildStore } from '@/store/guildStore'
import FaerunDatePicker from '@/components/FaerunDatePicker.vue'
import { formatFaerunDate, parseFaerunDate, normalizeFaerunDate } from '@/utils/faerun-date.js'
import { fulfillYieldEventManually } from '@/services/cycleService.js'

const props = defineProps({
  buildingKey: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  currentCycleStartDate: { type: Object, default: null },
})

const islandStore = useIslandStore()
const heroesStore = useHeroesStore()
const goodsStore = useGoodsStore()
const guildStore = useGuildStore()

const { data: island } = storeToRefs(islandStore)
const saving = ref(false)
const savingRecurring = ref(false)
const addPanel = ref(null)
const addEventError = ref('')
const recurringError = ref('')

onMounted(() => {
  heroesStore.subscribeHeroes()
  goodsStore.subscribeGoods()
  guildStore.subscribeGuilds?.()
})

const buildingEntry = computed(() => island.value?.buildings?.[props.buildingKey] || {})
const currentYields = computed(() => Array.isArray(buildingEntry.value.yields) ? buildingEntry.value.yields : [])
const sortedYields = computed(() => [...currentYields.value].sort((a, b) => {
  const pa = parseFaerunDate(a.date), pb = parseFaerunDate(b.date)
  if (!pa || !pb) return 0
  const oa = pa.year * 360 + pa.month * 30 + pa.day
  const ob = pb.year * 360 + pb.month * 30 + pb.day
  return oa - ob
}))

// Built-at date
const localBuiltAt = ref(null)
watch(() => buildingEntry.value.builtAt, (v) => {
  localBuiltAt.value = v ? parseFaerunDate(v) : null
}, { immediate: true })

// Default built-at to current cycle start when opened
watch(() => props.currentCycleStartDate, (v) => {
  if (v && !localBuiltAt.value) {
    localBuiltAt.value = v
  }
}, { immediate: true })

async function saveBuiltAt(date) {
  const formatted = date ? formatFaerunDate(normalizeFaerunDate(date)) : null
  await islandStore.updateBuildingYields(props.buildingKey, { builtAt: formatted, yields: currentYields.value })
}

// Hero / guild options
const heroOptions = computed(() => heroesStore.heroes.filter(h => !h.inactive).map(h => ({ id: h.id, name: h.name })))
const guildOptions = computed(() => (guildStore.guilds || []).map(g => ({ id: g.id, name: g.name })))
const goodsOptions = computed(() => goodsStore.goods.map(g => ({ id: g.id, label: g.name + (g.unit ? ` (${g.unit})` : '') })))

function recipientLabel(destination) {
  if (!destination) return '—'
  if (destination.startsWith('hero:')) {
    const id = destination.slice(5)
    return heroesStore.heroes.find(h => h.id === id)?.name || id
  }
  if (destination.startsWith('guild:')) {
    const id = destination.slice(6)
    return (guildStore.guilds || []).find(g => g.id === id)?.name || id
  }
  return destination
}

function goodsLabel(event) {
  const goods = event.goods || {}
  if (event.processed && event.processedAmounts) {
    return Object.entries(event.processedAmounts)
      .map(([gId, amt]) => `${goodsStore.goods.find(g => g.id === gId)?.name || gId}: ${amt}`)
      .join(', ')
  }
  return Object.entries(goods)
    .map(([gId, amt]) => `${goodsStore.goods.find(g => g.id === gId)?.name || gId}: ${amt}`)
    .join(', ')
}

function processedAmountsLabel(amounts) {
  return Object.entries(amounts || {})
    .map(([gId, amt]) => `${goodsStore.goods.find(g => g.id === gId)?.name || gId}: ${amt}`)
    .join(', ')
}

// ── Add event ────────────────────────────────────────────────
const newEvent = reactive({
  date: null,
  destinationType: 'hero',
  heroId: '',
  guildId: '',
  goodsRows: [{ goodId: '', amount: '' }],
})

function addGoodRow() { newEvent.goodsRows.push({ goodId: '', amount: '' }) }
function removeGoodRow(idx) { newEvent.goodsRows.splice(idx, 1) }

function buildDestination(form) {
  if (form.destinationType === 'hero') return form.heroId ? `hero:${form.heroId}` : ''
  return form.guildId ? `guild:${form.guildId}` : ''
}

function buildGoods(rows) {
  const goods = {}
  for (const row of rows) {
    if (!row.goodId || !row.amount) continue
    const numericAmt = /^\d+d\d+$/i.test(String(row.amount).trim()) ? String(row.amount).trim() : Number(row.amount)
    goods[row.goodId] = numericAmt
  }
  return goods
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

async function addEvent() {
  addEventError.value = ''
  const destination = buildDestination(newEvent)
  if (!destination) { addEventError.value = 'Оберіть отримувача.'; return }
  if (!newEvent.date) { addEventError.value = 'Оберіть дату врожаю.'; return }
  const goods = buildGoods(newEvent.goodsRows)
  if (!Object.keys(goods).length) { addEventError.value = 'Додайте хоча б один товар.'; return }

  const event = {
    id: generateId(),
    destination,
    date: formatFaerunDate(normalizeFaerunDate(newEvent.date)),
    goods,
    processed: false,
  }

  saving.value = true
  try {
    const updatedYields = [...currentYields.value, event]
    await islandStore.updateBuildingYields(props.buildingKey, { yields: updatedYields })
    newEvent.date = null
    newEvent.heroId = ''
    newEvent.guildId = ''
    newEvent.goodsRows = [{ goodId: '', amount: '' }]
    addPanel.value = null
  } catch (e) {
    addEventError.value = 'Помилка збереження.'
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function removeEvent(eventId) {
  const updatedYields = currentYields.value.filter(y => y.id !== eventId)
  await islandStore.updateBuildingYields(props.buildingKey, { yields: updatedYields })
}

const fulfillManuallyLoading = ref(null) // holds the eventId being processed
const fulfillError = ref('')

async function fulfillManually(eventId) {
  if (fulfillManuallyLoading.value) return
  fulfillManuallyLoading.value = eventId
  fulfillError.value = ''
  try {
    const islandId = islandStore.data?.id
    if (!islandId) throw new Error('Island not loaded.')
    await fulfillYieldEventManually(islandId, props.buildingKey, eventId)
    // islandStore is reactive via onSnapshot — no manual update needed
  } catch (e) {
    console.error('[harvest] Manual fulfill failed', e)
    fulfillError.value = e?.message || 'Помилка виконання події врожаю.'
  } finally {
    fulfillManuallyLoading.value = null
  }
}

// ── Recurring schedule ───────────────────────────────────────
const recurring = reactive({
  startDate: null,
  intervalDays: 180,
  destinationType: 'hero',
  heroId: '',
  guildId: '',
  goodsRows: [{ goodId: '', amount: '' }],
  count: 4,
  unlimited: false,
})

function addRecurringGoodRow() { recurring.goodsRows.push({ goodId: '', amount: '' }) }
function removeRecurringGoodRow(idx) { recurring.goodsRows.splice(idx, 1) }

const recurringPreviewDates = computed(() => {
  const start = normalizeFaerunDate(recurring.startDate)
  if (!start) return []
  const interval = Number(recurring.intervalDays)
  if (!interval || interval < 1) return []

  const maxCount = recurring.unlimited ? Math.ceil(3600 / interval) : Number(recurring.count)
  if (!maxCount || maxCount < 1) return []

  const dates = []
  let ordinal = start.year * 360 + start.month * 30 + (start.day - 1)
  for (let i = 0; i < maxCount; i++) {
    const day = (ordinal % 30) + 1
    const month = Math.floor(ordinal / 30) % 12
    const year = Math.floor(ordinal / 360)
    dates.push(formatFaerunDate({ day, month, year }))
    ordinal += interval
  }
  return dates
})

async function generateRecurring() {
  recurringError.value = ''
  const destination = buildDestination(recurring)
  if (!destination) { recurringError.value = 'Оберіть отримувача.'; return }
  if (!recurringPreviewDates.value.length) { recurringError.value = 'Задайте дату та інтервал.'; return }
  const goods = buildGoods(recurring.goodsRows)
  if (!Object.keys(goods).length) { recurringError.value = 'Додайте хоча б один товар.'; return }

  const newEvents = recurringPreviewDates.value.map(date => ({
    id: generateId(),
    destination,
    date,
    goods,
    processed: false,
  }))

  savingRecurring.value = true
  try {
    const updatedYields = [...currentYields.value, ...newEvents]
    await islandStore.updateBuildingYields(props.buildingKey, { yields: updatedYields })
    addPanel.value = null
  } catch (e) {
    recurringError.value = 'Помилка збереження.'
    console.error(e)
  } finally {
    savingRecurring.value = false
  }
}
</script>

<style scoped>
.harvest-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(90, 62, 32, 0.4);
}

.harvest-section-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  margin-bottom: 10px;
}

.harvest-field-row {
  margin-bottom: 4px;
}

/* Events list */
.yield-events-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.yield-event-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(90, 62, 32, 0.3);
  gap: 8px;
}

.yield-processed {
  opacity: 0.55;
}

.yield-event-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 0.8rem;
  min-width: 0;
}

.yield-event-date {
  font-family: var(--wi-font-heading);
  color: var(--wi-gold);
  font-size: 0.78rem;
  white-space: nowrap;
}

.yield-event-recipient {
  color: var(--wi-text-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.yield-event-goods {
  color: var(--wi-text);
  font-size: 0.78rem;
}

.yield-event-status {
  flex-shrink: 0;
}

.yield-empty {
  font-size: 0.8rem;
  color: var(--wi-text-muted);
  font-style: italic;
  margin-bottom: 8px;
}

/* Expansion panels */
.harvest-expand-title {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.06em !important;
  color: var(--wi-gold) !important;
  min-height: 36px !important;
  padding: 0 12px !important;
}

/* Add event form */
.add-event-form,
.recurring-form {
  padding-top: 8px;
}

.dest-toggle {
  width: 100%;
}

.dest-toggle :deep(.v-btn) {
  flex: 1;
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.05em !important;
}

.good-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.amount-field {
  max-width: 130px;
  flex-shrink: 0;
}

/* Recurring preview */
.recurring-preview {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(90, 62, 32, 0.3);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 12px;
}

.recurring-preview-label {
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--wi-text-muted);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.recurring-preview-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.preview-date-chip {
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  color: var(--wi-gold);
  background: rgba(200, 150, 42, 0.1);
  border: 1px solid rgba(200, 150, 42, 0.25);
  border-radius: 3px;
  padding: 1px 6px;
}

.preview-more {
  font-size: 0.72rem;
  color: var(--wi-text-muted);
  font-style: italic;
  align-self: center;
}
</style>
