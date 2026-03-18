<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Заявки до гільдії магів
        </h1>
      </v-col>
    </v-row>

    <v-row class="my-4">
      <v-col cols="12">
        <v-card class="pa-4" variant="tonal">
          <div class="current-cycle-header">
            <v-avatar color="primary" variant="elevated">
              <v-icon>mdi-timeline-clock</v-icon>
            </v-avatar>
            <div class="current-cycle-text">
              <div class="text-overline text-medium-emphasis mb-1">Поточний цикл</div>
              <div class="text-subtitle-1 font-semibold">{{ currentCycleLabel }}</div>
            </div>
            <div class="d-flex ga-3 flex-wrap chips">
              <v-chip color="warning" variant="flat">Відкрито: {{ store.openCount }}</v-chip>
              <v-chip color="success" variant="flat">Виконано: {{ store.fulfilledCount }}</v-chip>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">{{ store.error }}</v-alert>
    <v-alert v-if="store.heroesError && isAdmin" type="warning" variant="tonal" class="mb-4">{{ store.heroesError }}</v-alert>
    <v-alert v-if="store.actionError" type="error" variant="tonal" class="mb-4">{{ store.actionError }}</v-alert>
    <v-alert v-if="store.syncError" type="warning" variant="tonal" class="mb-4">{{ store.syncError }}</v-alert>

    <v-skeleton-loader
      v-if="store.loading || store.syncLoading"
      type="article, article, article"
    />

    <template v-else>
      <v-alert v-if="!activeRequestDocument" type="info" variant="tonal" class="mb-4">
        Для поточного циклу ще немає заявок.
      </v-alert>

      <v-alert
        v-else-if="!activeRequestDocument.requests?.length"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        Для цього циклу валідних заявок не згенеровано.
      </v-alert>

      <v-row v-else>
        <v-col
          v-for="request in activeRequestDocument.requests"
          :key="request.localId || request.id"
          cols="12"
          md="6"
          xl="4"
        >
          <v-card class="h-100 request-card" :class="{ 'request-card--fulfilled': request.fulfilled }" rounded="xl">
            <v-card-item>
              <template #prepend>
                <v-avatar
                  :color="getSpellLevelColor(request.spellLevel)"
                  variant="flat"
                >
                  <v-icon>{{ getSpellTierIcon(request.spellTier) }}</v-icon>
                </v-avatar>
              </template>
              <v-card-title>{{ request.spellName }}</v-card-title>
              <v-card-subtitle>Рівень {{ request.spellLevel }}</v-card-subtitle>
            </v-card-item>

            <v-card-text class="pt-2">
              <div class="request-metadata">
                <div><strong>Даунтайм:</strong> {{ request.downtimeDays }} дн.</div>
                <div><strong>Винагорода:</strong> {{ formatCompensation(request.compensation) }} 🪙</div>
                <div>
                  <strong>Статус:</strong>
                  <v-chip :color="request.fulfilled ? 'success' : 'warning'" size="small" class="ml-1" variant="flat">
                    {{ request.fulfilled ? 'Виконано' : 'Очікує' }}
                  </v-chip>
                </div>
                <div v-if="request.fulfilledByHeroName"><strong>Герой:</strong> {{ request.fulfilledByHeroName }}</div>
                <div v-if="request.telegramPostUrl">
                  <strong>Telegram:</strong>
                  <a :href="request.telegramPostUrl" target="_blank" rel="noopener">посилання</a>
                </div>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="px-4 pb-4 pt-4">
              <template v-if="isAdmin && !request.fulfilled">
                <v-select
                  v-model="fulfillmentForms[getDocumentRequestKey(activeRequestDocument.id, request)].heroId"
                  :items="heroOptions"
                  label="Герой, що виконав"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  class="mr-2"
                />
              </template>
              <v-spacer />
              <v-btn
                v-if="isAdmin && !request.fulfilled"
                color="success"
                prepend-icon="mdi-check"
                :loading="isSubmitting(activeRequestDocument.id, request)"
                @click="openFulfillmentDialog(request, activeRequestDocument.id)"
              >
                Позначити виконаною
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-card v-if="historyDocuments.length" class="mt-6" rounded="xl">
        <v-card-title>Попередні цикли</v-card-title>
        <v-card-text>
          <v-expansion-panels variant="accordion">
            <v-expansion-panel
              v-for="doc in historyDocuments"
              :key="doc.id"
            >
              <v-expansion-panel-title>
                {{ historyTitle(doc) }}
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-table density="comfortable">
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
                      <td>{{ formatCompensation(request.compensation) }}</td>
                      <td>{{ request.fulfilled ? `Виконано (${request.fulfilledByHeroName || '—'})` : 'Не виконано' }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>
    </template>

    <v-dialog v-model="fulfillmentDialog" max-width="520">
      <v-card rounded="xl">
        <v-card-title>Виконання заявки</v-card-title>
        <v-card-text>
          <div v-if="selectedRequest" class="mb-4">
            <div class="text-subtitle-1 font-weight-bold">{{ selectedRequest.spellName }}</div>
            <div class="text-body-2 text-medium-emphasis">
              Рівень {{ selectedRequest.spellLevel }} · Тір {{ selectedRequest.spellTier }} · {{ selectedRequest.downtimeDays }} дн.
            </div>
          </div>

          <v-select
            v-model="dialogForm.heroId"
            :items="heroOptions"
            label="Герой"
            variant="outlined"
            hide-details="auto"
            class="mb-3"
          />
          <v-text-field
            v-model="dialogForm.telegramPostUrl"
            label="Посилання на Telegram пост"
            variant="outlined"
            placeholder="https://t.me/..."
            hide-details="auto"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeFulfillmentDialog">Скасувати</v-btn>
          <v-btn color="success" :loading="store.actionLoading" @click="confirmFulfillment">Зберегти</v-btn>
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

const SPELL_LEVEL_COLOR_MAP = {
  0: 'blue-grey',
  1: 'green',
  2: 'blue',
  3: 'deep-purple',
  4: 'indigo',
  5: 'teal',
  6: 'amber',
  7: 'deep-orange',
  8: 'red',
  9: 'brown',
}

const SPELL_TIER_ICON_MAP = {
  A: 'mdi-alpha-a-circle',
  B: 'mdi-alpha-b-circle',
  C: 'mdi-alpha-c-circle',
  D: 'mdi-alpha-d-circle',
  E: 'mdi-alpha-e-circle',
  F: 'mdi-alpha-f-circle',
}

const store = useMageGuildStore()
const userStore = useUserStore()
const populationStore = usePopulationStore()
const islandStore = useIslandStore()

const isAdmin = computed(() => userStore.isAdmin)
const activeRequestDocument = computed(() => store.latestRequestDocument)
const historyDocuments = computed(() => store.productionDocuments.slice(1))
const currentCycleLabel = computed(() => {
  if (!activeRequestDocument.value) return 'Цикл ще не розпочато'

  const start = activeRequestDocument.value.cycleStartedAt || '—'
  const end = activeRequestDocument.value.cycleFinishedAt

  return end ? `${start} — ${end}` : `${start} (триває)`
})
const heroOptions = computed(() => store.heroes.map((hero) => ({ title: hero.name, value: hero.id })))
const fulfillmentForms = reactive({})
const submittingKey = ref('')
const fulfillmentDialog = ref(false)
const selectedRequest = ref(null)
const selectedRequestDocumentId = ref('')
const dialogForm = reactive({
  heroId: '',
  telegramPostUrl: '',
})

function getRequestKey(request) {
  return request?.localId || request?.id || 'request'
}

function getDocumentRequestKey(documentId, request) {
  return `${documentId}:${getRequestKey(request)}`
}

function ensureRequestForms(requests, documentId) {
  for (const request of requests || []) {
    const key = getDocumentRequestKey(documentId, request)
    if (!fulfillmentForms[key]) {
      fulfillmentForms[key] = {
        heroId: '',
        telegramPostUrl: '',
      }
    }
  }
}

function formatCompensation(value) {
  return formatAmount(value, 0)
}

function getSpellLevelColor(spellLevel) {
  const normalizedLevel = normalizeSpellLevel(spellLevel)
  return SPELL_LEVEL_COLOR_MAP[normalizedLevel] || 'primary'
}

function getSpellTierIcon(spellTier) {
  const normalizedTier = normalizeSpellTier(spellTier)
  return SPELL_TIER_ICON_MAP[normalizedTier] || 'mdi-star-four-points-outline'
}

function historyTitle(doc) {
  const total = Array.isArray(doc.requests) ? doc.requests.length : 0
  const fulfilled = Array.isArray(doc.requests) ? doc.requests.filter((request) => request.fulfilled).length : 0
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
  fulfillmentDialog.value = false
  selectedRequest.value = null
  selectedRequestDocumentId.value = ''
  dialogForm.heroId = ''
  dialogForm.telegramPostUrl = ''
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

    fulfillmentForms[requestKey] = {
      heroId: dialogForm.heroId,
      telegramPostUrl: dialogForm.telegramPostUrl,
    }
    closeFulfillmentDialog()
  } finally {
    submittingKey.value = ''
  }
}

async function ensureCurrentCycleRequests() {
  try {
    await store.ensureCurrentCycleRequests({
      islandId: islandStore.currentId,
      population: populationStore.totalPopulation,
      createdBy: userStore.nickname || 'Система',
    })
  } catch (_error) {
    // store.syncError already contains a user-friendly message
  }
}

watch(() => store.requestDocuments, (docs) => {
  for (const doc of docs || []) {
    ensureRequestForms(doc.requests || [], doc.id)
  }
}, { immediate: true })

watch(
  () => islandStore.currentId,
  async (id) => {
    populationStore.startListener(id)
    await ensureCurrentCycleRequests()
  },
  { immediate: true },
)

onMounted(() => {
  store.startListening()
})

onBeforeUnmount(() => {
  store.stopListening()
  populationStore.stopListener()
})
</script>

<style scoped>
.mage-summary-card {
  border: 1px solid rgba(76, 110, 245, 0.18);
}

.current-cycle-header {
  display: flex;
  align-items: center;
  gap: 16px;
  .chips {
    margin-left: auto;
  }
}

.request-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.request-card--fulfilled {
  border-color: rgba(34, 197, 94, 0.35);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.72), rgba(255, 255, 255, 1));
}

.request-metadata {
  display: grid;
  gap: 10px;
}
</style>
