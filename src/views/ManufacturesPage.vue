<template>
  <div class="manufactures-page">

    <!-- Tabs -->
    <v-tabs v-model="activeTab" align-tabs="start" class="mfg-tabs mb-4">
      <v-tab value="manufactures">
        <v-icon start>mdi-factory</v-icon>
        Мануфактури
      </v-tab>
      <v-tab value="auto">
        <v-icon start>mdi-autorenew</v-icon>
        Авто-доходи
      </v-tab>
    </v-tabs>

    <!-- Header row -->
    <div class="mfg-header">
      <div class="mfg-title">
        <v-icon class="mr-2" size="20">{{ activeTab === 'manufactures' ? 'mdi-factory' : 'mdi-autorenew' }}</v-icon>
        {{ activeTab === 'manufactures' ? 'Мануфактури острова' : 'Авто-доходи та витрати' }}
      </div>
      <v-btn v-if="isAdmin" class="add-btn" prepend-icon="mdi-plus" @click="openAddDialog">
        Додати
      </v-btn>
    </div>

    <!-- States -->
    <div v-if="loading" class="mfg-state">
      <v-icon class="mr-2" size="16">mdi-compass</v-icon>
      Завантаження…
    </div>
    <div v-else-if="error" class="mfg-state mfg-error">
      <v-icon class="mr-2" size="16">mdi-skull-crossbones</v-icon>
      {{ error }}
    </div>
    <div v-else-if="!visibleItems.length" class="mfg-state">
      <v-icon class="mr-2" size="16">mdi-anchor</v-icon>
      {{ activeTab === 'manufactures' ? 'Наразі на острові немає мануфактур.' : 'Наразі немає авто-доходів чи витрат.' }}
    </div>

    <!-- Cards grid -->
    <v-row v-else class="mfg-grid">
      <v-col
        v-for="(item, index) in visibleItems"
        :key="item.key"
        cols="12"
        md="6"
        lg="4"
      >
        <div class="invoice-card">
          <div class="invoice-header">
            <span class="invoice-number">№{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="invoice-name">{{ item.name || 'Без назви' }}</span>
            <v-btn
              v-if="isAdmin"
              size="x-small"
              variant="text"
              icon="mdi-feather"
              class="invoice-edit-btn"
              @click="openEditDialog(item)"
            />
          </div>

          <p class="invoice-desc">{{ item.description || 'Опис відсутній.' }}</p>

          <!-- Payouts list -->
          <div class="invoice-footer">
            <div
              v-for="(payout, pi) in item.payouts"
              :key="pi"
              class="payout-row"
              :class="{ 'payout-row--border': pi > 0 }"
            >
              <div class="invoice-row">
                <span class="invoice-label">
                  <v-icon size="13" class="mr-1">mdi-gold</v-icon>
                  Дохід
                </span>
                <span class="invoice-income" :class="payout.income >= 0 ? 'income-positive' : 'income-negative'">
                  {{ payout.income >= 0 ? '+' : '' }}{{ formatAmount(payout.income) }} зм
                </span>
              </div>
              <div class="invoice-row">
                <span class="invoice-label">
                  <v-icon size="13" class="mr-1">{{ destinationIcon(payout.destination) }}</v-icon>
                  До
                </span>
                <span class="invoice-destination">{{ getIncomeDestinationLabel(payout.destination) }}</span>
              </div>
              <div v-if="payout.destination?.startsWith('hero:') && Object.keys(payout.incomeGoods || {}).length" class="invoice-row">
                <span class="invoice-label">
                  <v-icon size="13" class="mr-1">mdi-package-variant</v-icon>
                  Товари
                </span>
                <span class="invoice-destination">{{ formatIncomeGoods(payout.incomeGoods) }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Add/Edit dialog -->
    <v-dialog v-model="dialogOpen" max-width="560" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="mfg-dialog">
        <div class="mfg-dialog-header">
          <v-icon class="mr-2">{{ dialogMode === 'add' ? (activeTab === 'manufactures' ? 'mdi-factory' : 'mdi-autorenew') : 'mdi-feather' }}</v-icon>
          {{ dialogMode === 'add' ? (activeTab === 'manufactures' ? 'Нова мануфактура' : 'Новий авто-дохід') : 'Редагувати запис' }}
        </div>
        <v-card-text class="mfg-dialog-body">
          <v-text-field
            v-model="form.name"
            label="Назва"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
            :rules="[v => !!v || 'Вкажіть назву']"
          />
          <v-textarea
            v-model="form.description"
            label="Опис"
            variant="outlined"
            density="compact"
            rows="3"
            auto-grow
            hide-details="auto"
            class="mb-3"
          />
          <v-select
            v-model="form.type"
            :items="typeOptions"
            item-title="title"
            item-value="value"
            label="Тип запису"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-4"
          />

          <!-- Payouts -->
          <div class="payouts-label mb-2">
            <v-icon size="14" class="mr-1">mdi-cash-multiple</v-icon>
            Нарахування за цикл
          </div>

          <div
            v-for="(payout, pi) in form.payouts"
            :key="pi"
            class="payout-form-block mb-3"
          >
            <div class="payout-form-row">
              <v-select
                v-model="payout.destination"
                :items="incomeDestinationOptions"
                item-title="title"
                item-value="value"
                label="Отримувач"
                variant="outlined"
                density="compact"
                hide-details
                class="flex-1"
              />
              <v-text-field
                v-model.number="payout.income"
                label="Сума (зм)"
                type="number"
                variant="outlined"
                density="compact"
                step="0.01"
                hide-details
                style="max-width: 110px"
              />
              <v-btn
                size="small"
                icon
                variant="text"
                color="error"
                :disabled="form.payouts.length === 1"
                @click="form.payouts.splice(pi, 1)"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>

            <!-- Goods sub-form for hero destinations -->
            <template v-if="payout.destination?.startsWith('hero:')">
              <div class="goods-section-label mt-2 mb-1">
                <v-icon size="13" class="mr-1">mdi-package-variant</v-icon>
                Товари
              </div>
              <div
                v-for="(row, gi) in payout.incomeGoods"
                :key="gi"
                class="goods-row-form mb-1"
              >
                <v-select
                  v-model="row.goodId"
                  :items="goodsStore.goods"
                  item-title="name"
                  item-value="id"
                  label="Товар"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-1"
                />
                <v-text-field
                  v-model.number="row.qty"
                  label="К-сть"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="max-width: 80px"
                />
                <v-btn size="x-small" icon variant="text" color="error" @click="payout.incomeGoods.splice(gi, 1)">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
              <v-btn
                size="x-small"
                variant="text"
                prepend-icon="mdi-plus"
                class="mt-1 mb-1"
                @click="payout.incomeGoods.push({ goodId: '', qty: 0 })"
              >
                Додати товар
              </v-btn>
            </template>
          </div>

          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-plus"
            class="mb-3"
            @click="addPayout"
          >
            Додати отримувача
          </v-btn>

          <div v-if="formError" class="mfg-dialog-error">
            <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>{{ formError }}
          </div>
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="mfg-dialog-actions">
          <!-- Delete (edit mode only) -->
          <template v-if="dialogMode === 'edit'">
            <v-btn
              v-if="!confirmDelete"
              variant="text"
              class="delete-btn"
              prepend-icon="mdi-trash-can-outline"
              @click="confirmDelete = true"
            >
              Видалити
            </v-btn>
            <template v-else>
              <span class="delete-confirm-text">Підтвердити?</span>
              <v-btn variant="text" class="delete-btn" :loading="deleting" @click="deleteManufacture">Так</v-btn>
              <v-btn variant="text" class="cancel-btn" @click="confirmDelete = false">Ні</v-btn>
            </template>
          </template>
          <template v-else>
            <v-btn variant="text" class="cancel-btn" @click="dialogOpen = false">Скасувати</v-btn>
          </template>
          <v-spacer />
          <v-btn class="save-btn" :loading="saving" prepend-icon="mdi-feather" @click="saveManufacture">
            Зберегти
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, documentId, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { useIslandStore } from '@/store/islandStore'
import { useUserStore } from '@/store/userStore'
import { useGuildStore } from '@/store/guildStore'
import { useGoodsStore } from '@/store/goodsStore'
import { useHeroesStore } from '@/store/heroesStore'
import { db } from '@/services/firebase'
import { formatAmount } from '@/utils/formatters'

const islandStore = useIslandStore()
const { data: island } = storeToRefs(islandStore)
const userStore = useUserStore()
const guildStore = useGuildStore()
const goodsStore = useGoodsStore()
const heroesStore = useHeroesStore()
const isAdmin = computed(() => !!userStore.isAdmin)

const activeTab = ref('manufactures')
const manufactures = ref([])
const loading = ref(false)
const error = ref('')
const dialogOpen = ref(false)
const dialogMode = ref('add')
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const formError = ref('')
const form = ref({ id: null, name: '', description: '', type: 'manufacture', payouts: [emptyPayout()] })

function emptyPayout() {
  return { destination: 'treasury', income: 0, incomeGoods: [] }
}

const visibleItems = computed(() =>
  manufactures.value.filter(item =>
    activeTab.value === 'manufactures'
      ? (item.type === 'manufacture' || !item.type)
      : item.type === 'auto'
  )
)

const typeOptions = [
  { title: 'Мануфактура', value: 'manufacture' },
  { title: 'Авто-дохід / витрата', value: 'auto' },
]

const incomeDestinationOptions = computed(() => ([
  { title: 'Скарбниця острова', value: 'treasury' },
  ...guildStore.guilds.map((guild) => ({
    title: `Гільдія: ${guild.name || guild.id}`,
    value: `guild:${guild.id}`,
  })),
  ...heroesStore.playerHeroes.map((hero) => ({
    title: `Гравець: ${hero.name}`,
    value: `hero:${hero.id}`,
  })),
]))

function addPayout() {
  form.value.payouts.push(emptyPayout())
}

function destinationIcon(dest) {
  if (!dest || dest === 'treasury') return 'mdi-anchor'
  if (dest.startsWith('hero:')) return 'mdi-account'
  return 'mdi-sword-cross'
}

function loadManufacturesFromSnap(docSnap) {
  const data = docSnap.data() || {}
  // Normalise payouts — support both new array and legacy single-field format
  let payouts
  if (Array.isArray(data.payouts) && data.payouts.length) {
    payouts = data.payouts.map((p) => ({
      destination: normalizeIncomeDestination(p.destination),
      income: normalizeAmount(p.income || 0),
      incomeGoods: p.incomeGoods && typeof p.incomeGoods === 'object' ? p.incomeGoods : {},
    }))
  } else {
    payouts = [{
      destination: normalizeIncomeDestination(data.incomeDestination),
      income: normalizeAmount(data.income || 0),
      incomeGoods: data.incomeGoods && typeof data.incomeGoods === 'object' ? data.incomeGoods : {},
    }]
  }
  return {
    key: docSnap.id,
    name: data.name || '',
    description: data.description || '',
    type: data.type === 'auto' ? 'auto' : 'manufacture',
    payouts,
  }
}

async function loadManufactures(ids) {
  if (!Array.isArray(ids) || ids.length === 0) { manufactures.value = []; return }
  loading.value = true
  error.value = ''
  try {
    const chunks = []
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10))
    const results = []
    for (const chunk of chunks) {
      const q = query(collection(db, 'manufactures'), where(documentId(), 'in', chunk))
      const snap = await getDocs(q)
      snap.docs.forEach((docSnap) => results.push(loadManufacturesFromSnap(docSnap)))
    }
    const order = new Map(ids.map((id, index) => [id, index]))
    results.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
    manufactures.value = results
  } catch (e) {
    console.error('[manufactures] Failed to load list', e)
    error.value = 'Не вдалося завантажити мануфактури.'
    manufactures.value = []
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  dialogMode.value = 'add'
  form.value = {
    id: null,
    name: '',
    description: '',
    type: activeTab.value === 'auto' ? 'auto' : 'manufacture',
    payouts: [emptyPayout()],
  }
  formError.value = ''
  confirmDelete.value = false
  dialogOpen.value = true
}

function openEditDialog(item) {
  dialogMode.value = 'edit'
  form.value = {
    id: item.key,
    name: item.name || '',
    description: item.description || '',
    type: item.type === 'auto' ? 'auto' : 'manufacture',
    payouts: item.payouts.map((p) => ({
      destination: p.destination,
      income: p.income,
      incomeGoods: Object.entries(p.incomeGoods || {}).map(([goodId, qty]) => ({ goodId, qty })),
    })),
  }
  formError.value = ''
  confirmDelete.value = false
  dialogOpen.value = true
}

async function deleteManufacture() {
  if (!form.value.id) return
  deleting.value = true
  try {
    await deleteDoc(doc(db, 'manufactures', form.value.id))
    if (island.value?.id) {
      await updateDoc(doc(db, 'islands', island.value.id), { manufactures: arrayRemove(form.value.id) })
    }
    manufactures.value = manufactures.value.filter((m) => m.key !== form.value.id)
    dialogOpen.value = false
  } catch (e) {
    console.error('[manufactures] Failed to delete', e)
    formError.value = 'Не вдалося видалити запис.'
  } finally {
    deleting.value = false
    confirmDelete.value = false
  }
}

async function saveManufacture() {
  formError.value = ''
  const name = form.value.name?.trim()
  if (!name) { formError.value = 'Вкажіть назву мануфактури.'; return }
  if (!form.value.payouts.length) { formError.value = 'Додайте хоча б одне нарахування.'; return }

  saving.value = true
  try {
    const type = form.value.type === 'auto' ? 'auto' : 'manufacture'
    const payouts = form.value.payouts.map((p) => {
      const destination = normalizeIncomeDestination(p.destination)
      const payout = {
        destination,
        income: normalizeAmount(p.income || 0),
      }
      if (destination.startsWith('hero:')) {
        const incomeGoods = {}
        for (const row of (p.incomeGoods || [])) {
          if (row.goodId && row.qty !== 0) incomeGoods[row.goodId] = Number(row.qty) || 0
        }
        payout.incomeGoods = incomeGoods
      }
      return payout
    })

    const payload = {
      name,
      description: form.value.description?.trim() || '',
      type,
      payouts,
    }

    if (dialogMode.value === 'add') {
      if (!island.value?.id) throw new Error('Острів не вибрано.')
      const docRef = await addDoc(collection(db, 'manufactures'), payload)
      await updateDoc(doc(db, 'islands', island.value.id), { manufactures: arrayUnion(docRef.id) })
    } else if (form.value.id) {
      await updateDoc(doc(db, 'manufactures', form.value.id), payload)
      const index = manufactures.value.findIndex((item) => item.key === form.value.id)
      if (index !== -1) {
        manufactures.value[index] = {
          ...manufactures.value[index],
          name: payload.name,
          description: payload.description,
          type: payload.type,
          payouts: payload.payouts.map((p) => ({
            ...p,
            incomeGoods: p.incomeGoods || {},
          })),
        }
      }
    }
    dialogOpen.value = false
  } catch (e) {
    console.error('[manufactures] Failed to save', e)
    formError.value = e?.message || 'Не вдалося зберегти мануфактуру.'
  } finally {
    saving.value = false
  }
}

function normalizeAmount(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

function normalizeIncomeDestination(value) {
  if (typeof value !== 'string') return 'treasury'
  if (value === 'treasury') return 'treasury'
  if (value.startsWith('guild:') && value.length > 'guild:'.length) return value
  if (value.startsWith('hero:') && value.length > 'hero:'.length) return value
  return 'treasury'
}

function getIncomeDestinationLabel(destination) {
  if (!destination || destination === 'treasury') return 'Скарбниця острова'
  if (destination.startsWith('guild:')) {
    const guildId = destination.slice('guild:'.length)
    const guild = guildStore.guilds.find((entry) => entry.id === guildId)
    return guild?.name ? `Гільдія: ${guild.name}` : `Гільдія: ${guildId}`
  }
  if (destination.startsWith('hero:')) {
    const heroId = destination.slice('hero:'.length)
    const hero = heroesStore.playerHeroes.find((h) => h.id === heroId)
    return hero?.name ? `Гравець: ${hero.name}` : `Гравець: ${heroId}`
  }
  return 'Скарбниця острова'
}

function formatIncomeGoods(incomeGoods) {
  if (!incomeGoods || !Object.keys(incomeGoods).length) return '—'
  return Object.entries(incomeGoods)
    .map(([goodId, qty]) => {
      const good = goodsStore.goods.find((g) => g.id === goodId)
      return `${qty} ${good?.name || goodId}`
    })
    .join(', ')
}

onMounted(() => {
  guildStore.subscribeGuilds()
  goodsStore.subscribeGoods()
  heroesStore.subscribeHeroes()
  loadManufactures(island.value?.manufactures)
})

watch(() => island.value?.manufactures, (ids) => { loadManufactures(ids) }, { deep: true })
</script>

<style scoped>
/* ── Page header ────────────────────────────────────────────── */
.manufactures-page {
  padding-bottom: 16px;
}

.mfg-tabs {
  border-bottom: 1px solid var(--wi-border);
  margin-bottom: 0 !important;
}

.mfg-tabs :deep(.v-tab) {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.06em !important;
  font-size: 0.82rem !important;
  color: var(--wi-text-muted) !important;
  text-transform: uppercase !important;
  min-width: 120px !important;
}

.mfg-tabs :deep(.v-tab--selected) {
  color: var(--wi-gold) !important;
}

.mfg-tabs :deep(.v-tabs-slider) {
  background-color: var(--wi-gold) !important;
}

.mfg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  margin-top: 16px;
}

.mfg-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  color: var(--wi-gold);
}

.add-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
  font-size: 0.8rem !important;
}

.add-btn :deep(.v-btn__overlay) {
  opacity: 0 !important;
}

/* States */
.mfg-state {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  padding: 24px 0;
}

.mfg-error { color: var(--wi-danger); }

/* ── Invoice card ───────────────────────────────────────────── */
.mfg-grid {
  margin: 0 -8px;
}

.invoice-card {
  background: linear-gradient(160deg, #2c1e0f 0%, #241809 100%);
  border: 1px solid var(--wi-border);
  border-radius: 6px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.invoice-card:hover {
  border-color: rgba(200, 150, 42, 0.5);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.invoice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #1a1108;
  border-bottom: 1px solid var(--wi-border);
}

.invoice-number {
  font-family: var(--wi-font-number);
  font-size: 0.7rem;
  color: var(--wi-text-muted);
  flex-shrink: 0;
  letter-spacing: 0.05em;
}

.invoice-name {
  font-family: var(--wi-font-heading);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  color: var(--wi-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invoice-edit-btn {
  color: var(--wi-text-muted) !important;
  flex-shrink: 0;
}

.invoice-edit-btn :deep(.v-btn__overlay) {
  background-color: var(--wi-gold) !important;
}

.invoice-desc {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--wi-text-muted);
  line-height: 1.5;
  padding: 12px 14px;
  flex: 1;
  margin: 0;
}

.invoice-footer {
  border-top: 1px solid rgba(90, 62, 32, 0.4);
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.payout-row {
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payout-row--border {
  border-top: 1px dashed rgba(90, 62, 32, 0.5);
  margin-top: 4px;
  padding-top: 8px;
}

.invoice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.invoice-label {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.invoice-label .v-icon {
  color: var(--wi-gold) !important;
  opacity: 0.7;
}

.invoice-income {
  font-family: var(--wi-font-number);
  font-size: 0.9rem;
  font-weight: bold;
}

.income-positive { color: var(--wi-success); }
.income-negative { color: var(--wi-danger); }

.invoice-destination {
  font-family: var(--wi-font-body);
  font-size: 0.8rem;
  color: var(--wi-text-muted);
  font-style: italic;
}

/* ── Dialog ─────────────────────────────────────────────────── */
.mfg-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.mfg-dialog-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.mfg-dialog-body {
  padding: 20px !important;
}

.mfg-dialog-error {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.85rem;
  margin-top: 10px;
}

.mfg-dialog-actions {
  padding: 12px 20px !important;
}

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
}

.delete-btn {
  color: var(--wi-danger) !important;
  font-family: var(--wi-font-heading) !important;
}

.delete-confirm-text {
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  color: var(--wi-danger);
  letter-spacing: 0.05em;
  margin-right: 4px;
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

/* ── Payouts form ───────────────────────────────────────────── */
.payouts-label {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.payout-form-block {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--wi-border);
  border-radius: 4px;
  padding: 10px 12px;
}

.payout-form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payout-form-row .flex-1 {
  flex: 1;
}

/* ── Goods sub-form ─────────────────────────────────────────── */
.goods-section-label {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

.goods-row-form {
  display: flex;
  align-items: center;
  gap: 6px;
}

.goods-row-form .flex-1 {
  flex: 1;
}
</style>
