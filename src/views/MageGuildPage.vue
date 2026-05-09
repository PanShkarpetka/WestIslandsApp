<template>
  <v-container class="mage-page">

    <!-- Header -->
    <div class="mage-header">
      <div class="mage-title">
        <v-icon class="mr-2" size="20">mdi-auto-fix</v-icon>
        Запити на магічні послуги
      </div>
      <div class="mage-cycle-chips">
        <span class="mage-chip chip-open">
          <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
          Відкрито: {{ store.openCount }}
        </span>
        <span class="mage-chip chip-done">
          <v-icon size="12" class="mr-1">mdi-check-decagram</v-icon>
          Виконано: {{ store.fulfilledCount }}
        </span>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="store.error" class="mage-alert mage-alert-error">
      <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>{{ store.error }}
    </div>
    <div v-if="store.heroesError && isAdmin" class="mage-alert mage-alert-warn">
      <v-icon size="14" class="mr-1">mdi-alert</v-icon>{{ store.heroesError }}
    </div>
    <div v-if="store.actionError" class="mage-alert mage-alert-error">
      <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>{{ store.actionError }}
    </div>

    <!-- Loading -->
    <v-skeleton-loader v-if="store.loading || store.syncLoading" type="article, article, article" />

    <template v-else>
      <div v-if="!activeRequestDocument" class="mage-empty">
        <v-icon class="mr-2" size="16">mdi-compass</v-icon>
        Для поточного циклу ще немає заявок.
      </div>
      <div v-else-if="!activeRequestDocument.requests?.length" class="mage-empty">
        <v-icon class="mr-2" size="16">mdi-compass</v-icon>
        Для цього циклу валідних заявок не згенеровано.
      </div>

      <v-row v-else>
        <v-col
          v-for="request in activeRequestDocument.requests"
          :key="request.localId || request.id"
          cols="12"
          md="6"
          xl="4"
        >
          <div
            class="spell-card"
            :class="{ 'spell-card-fulfilled': request.fulfilled }"
            :style="{ '--spell-color': getSpellColor(request.spellLevel) }"
          >
            <!-- Level badge -->
            <div class="spell-level-badge" :style="{ background: getSpellColor(request.spellLevel) }">
              <v-icon size="14">{{ getSpellTierIcon(request.spellTier) }}</v-icon>
              <span>{{ request.spellLevel }}</span>
            </div>

            <!-- Header -->
            <div class="spell-card-header">
              <div class="spell-name">{{ request.spellName }}</div>
              <span class="spell-status-badge" :class="request.fulfilled ? 'status-done' : 'status-open'">
                {{ request.fulfilled ? 'Виконано' : 'Очікує' }}
              </span>
            </div>

            <!-- Stats -->
            <div class="spell-stats">
              <div class="spell-stat">
                <v-icon size="16" class="mr-1">mdi-timer-sand</v-icon>
                <span class="spell-stat-label">Даунтайм</span>
                <span class="spell-stat-value">{{ request.downtimeDays }} дн.</span>
              </div>
              <div class="spell-stat">
                <v-icon size="16" class="mr-1">mdi-gold</v-icon>
                <span class="spell-stat-label">Винагорода</span>
                <span class="spell-stat-value wi-number">{{ formatCompensation(request.compensation) }} зм</span>
              </div>
              <div v-if="request.fulfilledByHeroName" class="spell-stat">
                <v-icon size="16" class="mr-1">mdi-account-star</v-icon>
                <span class="spell-stat-label">Герой</span>
                <span class="spell-stat-value">{{ request.fulfilledByHeroName }}</span>
              </div>
              <div v-if="request.telegramPostUrl" class="spell-stat">
                <v-icon size="16" class="mr-1">mdi-message-text</v-icon>
                <span class="spell-stat-label">Telegram</span>
                <a :href="request.telegramPostUrl" target="_blank" rel="noopener" class="spell-link">посилання</a>
              </div>
            </div>

            <!-- Admin fulfill -->
            <div v-if="isAdmin && !request.fulfilled" class="spell-card-actions">
              <v-select
                v-model="fulfillmentForms[getDocumentRequestKey(activeRequestDocument.id, request)].heroId"
                :items="heroOptions"
                label="Герой, що виконав"
                variant="outlined"
                density="compact"
                hide-details
                class="spell-hero-select"
              />
              <v-btn
                class="spell-fulfill-btn"
                size="small"
                :loading="isSubmitting(activeRequestDocument.id, request)"
                prepend-icon="mdi-check"
                @click="openFulfillmentDialog(request, activeRequestDocument.id)"
              >
                Виконано
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- History (admin only) -->
      <div v-if="isAdmin && historyDocuments.length" class="mage-history">
        <div class="mage-history-title">
          <v-icon class="mr-2" size="16">mdi-scroll-text</v-icon>
          Попередні цикли
        </div>
        <v-expansion-panels variant="accordion" class="mage-panels">
          <v-expansion-panel
            v-for="doc in historyDocuments"
            :key="doc.id"
            class="mage-panel"
          >
            <v-expansion-panel-title class="mage-panel-title">
              {{ historyTitle(doc) }}
            </v-expansion-panel-title>
            <v-expansion-panel-text class="pa-0">
              <v-table class="mage-history-table" density="comfortable">
                <thead>
                  <tr>
                    <th>Закляття</th>
                    <th>Рівень</th>
                    <th>Тір</th>
                    <th>Даунтайм</th>
                    <th>Винагорода</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="request in doc.requests" :key="request.localId || request.id">
                    <td>{{ request.spellName }}</td>
                    <td>{{ request.spellLevel }}</td>
                    <td>{{ request.spellTier }}</td>
                    <td>{{ request.downtimeDays }}</td>
                    <td class="wi-number" style="color: var(--wi-gold)">{{ formatCompensation(request.compensation) }}</td>
                    <td>
                      <span class="spell-status-badge" :class="request.fulfilled ? 'status-done' : 'status-open'" style="font-size: 0.65rem">
                        {{ request.fulfilled ? `Виконано (${request.fulfilledByHeroName || '—'})` : 'Не виконано' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </template>

    <!-- Fulfillment dialog -->
    <v-dialog v-model="fulfillmentDialog" max-width="480" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="mage-dialog">
        <div class="mage-dialog-header">
          <v-icon class="mr-2">mdi-auto-fix</v-icon>
          Виконання заявки
        </div>
        <v-card-text class="mage-dialog-body">
          <div v-if="selectedRequest" class="mage-dialog-spell-info">
            <div class="mage-dialog-spell-name">{{ selectedRequest.spellName }}</div>
            <div class="mage-dialog-spell-meta">
              Рівень {{ selectedRequest.spellLevel }} · Тір {{ selectedRequest.spellTier }} · {{ selectedRequest.downtimeDays }} дн.
            </div>
          </div>
          <v-select v-model="dialogForm.heroId" :items="heroOptions" label="Герой" variant="outlined" density="compact" hide-details="auto" class="mb-3" />
          <v-text-field v-model="dialogForm.telegramPostUrl" label="Посилання на Telegram пост" variant="outlined" density="compact" hide-details="auto" placeholder="https://t.me/..." prepend-inner-icon="mdi-message-text" />
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="mage-dialog-actions">
          <v-btn variant="text" class="cancel-btn" @click="closeFulfillmentDialog">Скасувати</v-btn>
          <v-spacer />
          <v-btn class="save-btn" :loading="store.actionLoading" prepend-icon="mdi-check" @click="confirmFulfillment">Зберегти</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useMageGuildStore } from '@/store/mageGuildStore'
import { useUserStore } from '@/store/userStore'
import { usePopulationStore } from '@/store/populationStore'
import { useIslandStore } from '@/store/islandStore'
import { formatAmount } from '@/utils/formatters'
import { normalizeSpellLevel, normalizeSpellTier } from '@/utils/mageGuildRequests'

const SPELL_LEVEL_COLORS = {
  0: '#607d8b', 1: '#5a8a3c', 2: '#3a6080', 3: '#6a3a8a',
  4: '#4a5a9a', 5: '#3a7a6a', 6: '#c8962a', 7: '#a05030',
  8: '#8b2a2a', 9: '#5a3020',
}

const SPELL_TIER_ICONS = {
  A: 'mdi-alpha-a-circle', B: 'mdi-alpha-b-circle', C: 'mdi-alpha-c-circle',
  D: 'mdi-alpha-d-circle', E: 'mdi-alpha-e-circle', F: 'mdi-alpha-f-circle',
}

const store = useMageGuildStore()
const userStore = useUserStore()
const populationStore = usePopulationStore()
const islandStore = useIslandStore()

const isAdmin = computed(() => userStore.isAdmin)
const activeRequestDocument = computed(() => store.latestRequestDocument)
const historyDocuments = computed(() => store.productionDocuments.slice(1))
const heroOptions = computed(() => store.heroes.map((hero) => ({ title: hero.name, value: hero.id })))
const fulfillmentForms = reactive({})
const submittingKey = ref('')
const fulfillmentDialog = ref(false)
const selectedRequest = ref(null)
const selectedRequestDocumentId = ref('')
const dialogForm = reactive({ heroId: '', telegramPostUrl: '' })

function getRequestKey(request) { return request?.localId || request?.id || 'request' }
function getDocumentRequestKey(documentId, request) { return `${documentId}:${getRequestKey(request)}` }

function ensureRequestForms(requests, documentId) {
  for (const request of requests || []) {
    const key = getDocumentRequestKey(documentId, request)
    if (!fulfillmentForms[key]) fulfillmentForms[key] = { heroId: '', telegramPostUrl: '' }
  }
}

function formatCompensation(value) { return formatAmount(value, 0) }

function getSpellColor(spellLevel) {
  const level = normalizeSpellLevel(spellLevel)
  return SPELL_LEVEL_COLORS[level] || '#5a3e20'
}

function getSpellTierIcon(spellTier) {
  const tier = normalizeSpellTier(spellTier)
  return SPELL_TIER_ICONS[tier] || 'mdi-star-four-points-outline'
}

function historyTitle(doc) {
  const total = Array.isArray(doc.requests) ? doc.requests.length : 0
  const fulfilled = Array.isArray(doc.requests) ? doc.requests.filter((r) => r.fulfilled).length : 0
  return `${doc.cycleLabel || doc.cycleId || doc.id} · ${fulfilled}/${total} виконано`
}

function openFulfillmentDialog(request, documentId) {
  const key = getDocumentRequestKey(documentId, request)
  ensureRequestForms([request], documentId)
  selectedRequest.value = request
  selectedRequestDocumentId.value = documentId
  dialogForm.heroId = fulfillmentForms[key].heroId || ''
  dialogForm.telegramPostUrl = fulfillmentForms[key].telegramPostUrl || ''
  fulfillmentDialog.value = true
}

function closeFulfillmentDialog() {
  fulfillmentDialog.value = false; selectedRequest.value = null
  selectedRequestDocumentId.value = ''; dialogForm.heroId = ''; dialogForm.telegramPostUrl = ''
}

function isSubmitting(documentId, request) {
  return store.actionLoading && submittingKey.value === getDocumentRequestKey(documentId, request)
}

async function confirmFulfillment() {
  if (!selectedRequest.value || !selectedRequestDocumentId.value) return
  const requestKey = getDocumentRequestKey(selectedRequestDocumentId.value, selectedRequest.value)
  submittingKey.value = requestKey
  try {
    await store.markFulfilled({
      spellRequestId: selectedRequestDocumentId.value,
      requestId: getRequestKey(selectedRequest.value),
      heroId: dialogForm.heroId,
      telegramPostUrl: dialogForm.telegramPostUrl,
      actorName: userStore.nickname || 'Адміністратор',
    })
    fulfillmentForms[requestKey] = { heroId: dialogForm.heroId, telegramPostUrl: dialogForm.telegramPostUrl }
    closeFulfillmentDialog()
  } finally { submittingKey.value = '' }
}

async function ensureCurrentCycleRequests() {
  try {
    await store.ensureCurrentCycleRequests({
      islandId: islandStore.currentId,
      population: populationStore.totalPopulation,
      createdBy: userStore.nickname || 'Система',
    })
  } catch (_e) {}
}

watch(() => store.requestDocuments, (docs) => {
  for (const doc of docs || []) ensureRequestForms(doc.requests || [], doc.id)
}, { immediate: true })

watch(() => islandStore.currentId, async (id) => {
  populationStore.startListening(id)
  await ensureCurrentCycleRequests()
}, { immediate: true })

onMounted(() => store.startListening())
onBeforeUnmount(() => { store.stopListening(); populationStore.stopListening() })
</script>

<style scoped>
/* ── Page ───────────────────────────────────────────────────── */
.mage-page { padding-bottom: 16px; }

.mage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.mage-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  color: var(--wi-gold);
}

.mage-cycle-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mage-chip {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 3px;
}

.chip-open {
  color: #c8962a;
  background: rgba(200, 150, 42, 0.12);
  border: 1px solid rgba(200, 150, 42, 0.3);
}

.chip-done {
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.12);
  border: 1px solid rgba(90, 138, 60, 0.3);
}

/* Alerts */
.mage-alert {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 12px;
}
.mage-alert-error { color: var(--wi-danger); background: rgba(139,42,42,0.1); border: 1px solid rgba(139,42,42,0.3); }
.mage-alert-warn { color: #c8962a; background: rgba(200,150,42,0.08); border: 1px solid rgba(200,150,42,0.25); }

.mage-empty {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  padding: 20px 0;
}

/* ── Spell card ─────────────────────────────────────────────── */
.spell-card {
  position: relative;
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-border);
  border-left: 3px solid var(--spell-color, var(--wi-border));
  border-radius: 6px;
  padding: 14px 14px 14px 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.spell-card:hover {
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
  border-color: rgba(200, 150, 42, 0.35);
  border-left-color: var(--spell-color, var(--wi-border));
}

.spell-card-fulfilled {
  opacity: 0.65;
}

/* Level badge */
.spell-level-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 10px;
  font-family: var(--wi-font-number);
  font-size: 0.72rem;
  color: #fff;
  opacity: 0.9;
}

/* Card header */
.spell-card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-right: 60px;
}

.spell-name {
  font-family: var(--wi-font-heading);
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  color: var(--wi-text);
  line-height: 1.3;
  flex: 1;
}

.spell-status-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 3px;
}

.status-open {
  color: #c8962a;
  background: rgba(200, 150, 42, 0.12);
  border: 1px solid rgba(200, 150, 42, 0.3);
}

.status-done {
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.12);
  border: 1px solid rgba(90, 138, 60, 0.3);
}

/* Stats */
.spell-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spell-stat {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-size: 0.9rem;
  gap: 4px;
}

.spell-stat .v-icon { color: var(--wi-gold) !important; opacity: 0.7; }

.spell-stat-label {
  color: var(--wi-text-muted);
  font-style: italic;
  flex: 1;
}

.spell-stat-value { color: var(--wi-text); }

.spell-link {
  color: var(--wi-info);
  text-decoration: underline;
  font-style: italic;
}

/* Admin actions */
.spell-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(90, 62, 32, 0.35);
  margin-top: auto;
}

.spell-hero-select { flex: 1; }

.spell-fulfill-btn {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.05em !important;
  background: rgba(90, 138, 60, 0.15) !important;
  color: var(--wi-success) !important;
  border: 1px solid rgba(90, 138, 60, 0.3) !important;
  flex-shrink: 0;
}
.spell-fulfill-btn :deep(.v-btn__overlay) { background-color: var(--wi-success) !important; opacity: 0; }
.spell-fulfill-btn:hover :deep(.v-btn__overlay) { opacity: 0.08 !important; }

/* ── History ────────────────────────────────────────────────── */
.mage-history { margin-top: 24px; }

.mage-history-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.85rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  margin-bottom: 10px;
}

.mage-history-title .v-icon { color: var(--wi-gold) !important; }

.mage-panels { border: 1px solid var(--wi-border) !important; border-radius: 6px !important; overflow: hidden; }

.mage-panel {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

.mage-panel:last-child { border-bottom: none !important; }

.mage-panel-title {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.82rem !important;
  letter-spacing: 0.06em !important;
  color: var(--wi-text-muted) !important;
}

.mage-history-table { background: transparent !important; }

.mage-history-table :deep(thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.7rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  border-bottom: 1px solid var(--wi-border) !important;
  background: #1a1108 !important;
  padding: 8px 12px !important;
}

.mage-history-table :deep(tbody tr td) {
  font-family: var(--wi-font-body);
  font-size: 0.82rem;
  color: var(--wi-text);
  border-bottom: 1px solid rgba(90, 62, 32, 0.3) !important;
  padding: 8px 12px !important;
  vertical-align: middle;
}

/* ── Dialog ─────────────────────────────────────────────────── */
.mage-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.mage-dialog-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.mage-dialog-body { padding: 20px !important; }

.mage-dialog-spell-info {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(90, 62, 32, 0.4);
}

.mage-dialog-spell-name {
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.mage-dialog-spell-meta {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.82rem;
  color: var(--wi-text-muted);
}

.mage-dialog-actions { padding: 12px 20px !important; }

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.06em !important;
}

.save-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}
.save-btn :deep(.v-btn__overlay) { opacity: 0 !important; }
</style>
