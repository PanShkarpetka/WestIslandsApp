<template>
  <v-container class="account-page">
    <WiPageHeader :title="userStore.nickname || 'Особистий рахунок'" icon="mdi-account" subtitle="Особистий рахунок" />

    <WiPanel v-if="loading" variant="sea">
      <WiEmptyState title="Завантажуємо особистий рахунок" icon="mdi-loading">
        <v-progress-circular indeterminate color="primary" size="24" />
      </WiEmptyState>
    </WiPanel>

    <WiPanel v-else-if="loadError" variant="danger">
      <WiEmptyState title="Не вдалося завантажити рахунок" :text="loadError" icon="mdi-alert-circle" />
    </WiPanel>

    <template v-else>
      <v-card class="account-card mb-4" elevation="0">
        <div class="account-card-header">
          <v-icon class="mr-2" size="18">mdi-gold</v-icon>
          Золотий баланс
        </div>
        <v-card-text class="account-card-body">
          <div class="balance-display">
            <span class="wi-number balance-amount">{{ formatAmount(hero.goldBalance) }}</span>
            <span class="balance-unit wi-muted-text">зм</span>
          </div>
          <v-btn
            class="withdraw-btn mt-4"
            prepend-icon="mdi-bank-minus"
            :disabled="hero.goldBalance <= 0"
            @click="openGoldWithdrawDialog"
          >
            Зняти золото
          </v-btn>
        </v-card-text>
      </v-card>

      <v-card class="account-card mb-4" elevation="0">
        <div class="account-card-header">
          <v-icon class="mr-2" size="18">mdi-package-variant</v-icon>
          Товари
        </div>
        <v-card-text class="account-card-body">
          <div v-if="!goodsList.length" class="account-empty-state">
            <v-icon class="mr-1" size="14">mdi-anchor</v-icon>
            Товарів немає.
          </div>
          <div v-else class="goods-list">
            <div v-for="item in goodsList" :key="item.id" class="goods-row">
              <div class="goods-info">
                <span class="goods-name">{{ item.name }}</span>
                <span class="goods-qty wi-number">{{ item.qty }}</span>
                <span class="goods-unit wi-muted-text">{{ item.unit || 'шт.' }}</span>
              </div>
              <v-btn
                size="x-small"
                variant="outlined"
                class="goods-withdraw-btn"
                :disabled="item.qty <= 0"
                @click="openGoodsWithdrawDialog(item)"
              >
                Зняти
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="account-card mb-4" elevation="0">
        <div class="account-card-header">
          <v-icon class="mr-2" size="18">mdi-fish</v-icon>
          Піймана риба
        </div>
        <v-card-text class="account-card-body">
          <div v-if="fishAccountState.error" class="account-error-msg">
            <v-icon size="14" class="mr-1">mdi-alert-circle</v-icon>
            {{ fishAccountState.error }}
          </div>
          <div v-else-if="fishLoading" class="account-empty-state">
            <v-icon class="mr-1" size="14">mdi-compass</v-icon>
            Завантаження улову...
          </div>
          <div v-else-if="fishError" class="account-error-msg">
            <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>
            {{ fishError }}
          </div>
          <div v-else-if="!caughtFish.length" class="account-empty-state">
            <v-icon class="mr-1" size="14">mdi-fish-off</v-icon>
            Пійманої риби немає.
          </div>
          <template v-else>
            <div class="fish-list">
              <label v-for="fish in caughtFish" :key="fish.id" class="fish-row">
                <v-checkbox-btn
                  v-model="selectedFishIds"
                  :value="fish.id"
                  color="primary"
                  class="fish-checkbox"
                />
                <div class="fish-info">
                  <span class="fish-name">{{ fish.fishName }}</span>
                </div>
                <span class="wi-number fish-price">{{ formatAmount(fish.valueGold) }} зм</span>
              </label>
            </div>

            <div class="fish-summary mt-4">
              <span>Обрано: {{ selectedFish.length }}</span>
              <span>Сума: {{ formatAmount(fishSaleTotals.gross) }} зм</span>
              <span>Податок: {{ formatAmount(fishSaleTotals.tax) }} зм</span>
              <strong>До зарахування: {{ formatAmount(fishSaleTotals.net) }} зм</strong>
            </div>
            <div v-if="fishActionError" class="account-error-msg mt-2">
              <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ fishActionError }}
            </div>
            <div class="fish-actions mt-4">
              <v-btn
                variant="outlined"
                prepend-icon="mdi-waves"
                :disabled="!selectedFishIds.length || Boolean(fishActionLoading)"
                :loading="fishActionLoading === 'release'"
                @click="releaseSelectedFish"
              >
                Відпустити
              </v-btn>
              <v-btn
                class="save-btn"
                prepend-icon="mdi-cash-plus"
                :disabled="!selectedFishIds.length || Boolean(fishActionLoading)"
                :loading="fishActionLoading === 'sell'"
                @click="sellSelectedFish"
              >
                Продати
              </v-btn>
            </div>
          </template>
        </v-card-text>
      </v-card>

      <v-card class="account-card mb-4" elevation="0">
        <div class="account-card-header">
          <v-icon class="mr-2" size="18">mdi-diamond-stone</v-icon>
          Скарби
        </div>
        <v-card-text class="account-card-body">
          <div v-if="fishAccountState.error" class="account-error-msg">
            <v-icon size="14" class="mr-1">mdi-alert-circle</v-icon>
            {{ fishAccountState.error }}
          </div>
          <div v-else-if="treasureLoading" class="account-empty-state">
            <v-icon class="mr-1" size="14">mdi-compass</v-icon>
            Завантаження скарбів...
          </div>
          <div v-else-if="treasureError" class="account-error-msg">
            <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>
            {{ treasureError }}
          </div>
          <div v-else-if="!caughtTreasures.length" class="account-empty-state">
            <v-icon class="mr-1" size="14">mdi-treasure-chest-outline</v-icon>
            Знайдених скарбів ще немає.
          </div>
          <div v-else class="treasure-list">
            <div v-for="treasure in caughtTreasures" :key="treasure.id" class="treasure-row">
              <div class="treasure-info">
                <span class="treasure-name">{{ treasure.treasureName }}</span>
                <span class="treasure-meta wi-muted-text">з риби {{ treasure.fishName || 'невідомо' }}</span>
              </div>
              <span class="wi-number treasure-price">{{ formatAmount(treasure.valueGold) }} зм</span>
              <v-btn
                size="x-small"
                variant="outlined"
                class="goods-withdraw-btn"
                :loading="treasureActionLoading === treasure.id"
                :disabled="Boolean(treasureActionLoading)"
                @click="removeTreasure(treasure)"
              >
                Прибрати
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="account-card mb-4" elevation="0">
        <div class="account-card-header">
          <v-icon class="mr-2" size="18">mdi-timer-sand</v-icon>
          Використані дні циклу
        </div>
        <v-card-text class="account-card-body">
          <div class="balance-display">
            <span class="wi-number balance-amount">{{ usedDays.totalDays }}</span>
            <span class="balance-unit wi-muted-text">дн.</span>
          </div>
          <div class="used-days-breakdown mt-2">
            <span>Крафт: {{ usedDays.craftingDays }}</span>
            <span>Магічна допомога: {{ usedDays.mageGuildDays }}</span>
            <span>Релігія: {{ usedDays.religionDays }}</span>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="account-card" elevation="0">
        <div class="account-card-header">
          <v-icon class="mr-2" size="18">mdi-history</v-icon>
          Історія операцій
        </div>
        <v-card-text class="account-card-body pa-0">
          <div v-if="!transactions.length" class="account-empty-state pa-4">
            <v-icon class="mr-1" size="14">mdi-anchor</v-icon>
            {{ transactionsError || 'Операцій не було.' }}
          </div>
          <v-table v-else density="compact" class="tx-table">
            <thead>
              <tr>
                <th class="tx-th">Тип</th>
                <th class="tx-th">Золото</th>
                <th class="tx-th">Товари</th>
                <th class="tx-th">Коментар</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in transactions" :key="tx.id" class="tx-row">
                <td class="tx-td">
                  <span :class="txTypeClass(tx.type)">{{ txTypeLabel(tx.type) }}</span>
                </td>
                <td class="tx-td tx-amount" :class="tx.goldAmount >= 0 ? 'wi-success-text' : 'wi-danger-text'">
                  {{ tx.goldAmount >= 0 ? '+' : '' }}{{ formatAmount(tx.goldAmount) }} зм
                </td>
                <td class="tx-td tx-goods">{{ formatTxGoods(tx.goods) }}</td>
                <td class="tx-td tx-comment wi-muted-text">{{ tx.comment }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </template>

    <v-dialog v-model="goldDialog" max-width="400">
      <v-card class="account-dialog">
        <div class="account-dialog-header">
          <v-icon class="mr-2">mdi-bank-minus</v-icon>
          Зняти золото
        </div>
        <v-card-text class="pa-5">
          <p class="wi-muted-text mb-3">Доступно: <strong class="wi-gold-text">{{ formatAmount(hero.goldBalance) }} зм</strong></p>
          <v-text-field
            v-model.number="goldWithdrawAmount"
            label="Сума (зм)"
            type="number"
            min="0.01"
            :max="hero.goldBalance"
            step="0.01"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
          <div v-if="withdrawError" class="account-error-msg mt-2">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ withdrawError }}
          </div>
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="pa-4">
          <v-btn variant="text" class="cancel-btn" @click="goldDialog = false">Скасувати</v-btn>
          <v-spacer />
          <v-btn class="save-btn" :loading="withdrawing" prepend-icon="mdi-check" @click="withdrawGold">
            Підтвердити
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="goodsDialog" max-width="400">
      <v-card class="account-dialog">
        <div class="account-dialog-header">
          <v-icon class="mr-2">mdi-package-variant-minus</v-icon>
          Зняти товар
        </div>
        <v-card-text class="pa-5">
          <p class="wi-muted-text mb-1">Товар: <strong class="wi-gold-text">{{ selectedGood?.name }}</strong></p>
          <p class="wi-muted-text mb-3">Доступно: <strong class="wi-gold-text">{{ selectedGood?.qty }} {{ selectedGood?.unit || 'шт.' }}</strong></p>
          <v-text-field
            v-model.number="goodsWithdrawAmount"
            label="Кількість"
            type="number"
            min="1"
            :max="selectedGood?.qty"
            step="1"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
          <div v-if="withdrawError" class="account-error-msg mt-2">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ withdrawError }}
          </div>
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="pa-4">
          <v-btn variant="text" class="cancel-btn" @click="goodsDialog = false">Скасувати</v-btn>
          <v-spacer />
          <v-btn class="save-btn" :loading="withdrawing" prepend-icon="mdi-check" @click="withdrawGoods">
            Підтвердити
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useUserStore } from '@/store/userStore'
import { useGoodsStore } from '@/store/goodsStore'
import { formatAmount } from '@/utils/formatters'
import { DEFAULT_ISLAND_ID } from '@/config/constants.js'
import {
  calculateFishSaleTotals,
  getCaughtFishLookup,
  getCaughtFishAccountState,
  isCaughtFishOwnedByHero,
  releaseCaughtFish,
  sellCaughtFish,
} from '@/services/caughtFishService.js'
import {
  getCaughtTreasureLookup,
  isCaughtTreasureOwnedByHero,
  removeCaughtTreasure,
} from '@/services/caughtTreasureService.js'
import { subscribeCurrentCycleUsedDays } from '@/services/usedDaysService.js'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'

const userStore = useUserStore()
const goodsStore = useGoodsStore()

const hero = ref({ id: '', name: '', goldBalance: 0, goods: {}, telegramId: '' })
const transactions = ref([])
const transactionsError = ref('')
const caughtFish = ref([])
const caughtTreasures = ref([])
const selectedFishIds = ref([])
const fishLoading = ref(false)
const treasureLoading = ref(false)
const fishError = ref('')
const treasureError = ref('')
const fishActionError = ref('')
const fishActionLoading = ref('')
const treasureActionLoading = ref('')
const fishSaleTaxRate = ref(0.1)
const loading = ref(true)
const loadError = ref('')
const goldDialog = ref(false)
const goodsDialog = ref(false)
const goldWithdrawAmount = ref(0)
const goodsWithdrawAmount = ref(1)
const selectedGood = ref(null)
const withdrawError = ref('')
const withdrawing = ref(false)
const usedDays = ref({ craftingDays: 0, mageGuildDays: 0, religionDays: 0, religionActions: 0, totalDays: 0 })

let unsubscribeHero = null
let unsubscribeTx = null
let unsubscribeFish = null
let unsubscribeTreasures = null
let unsubscribeIsland = null
let unsubscribeUsedDays = null

const fishAccountState = computed(() => getCaughtFishAccountState(hero.value))

const selectedFish = computed(() =>
  caughtFish.value.filter((fish) => selectedFishIds.value.includes(fish.id))
)

const fishSaleTotals = computed(() => calculateFishSaleTotals(selectedFish.value, fishSaleTaxRate.value))

const goodsList = computed(() => {
  const goods = hero.value.goods || {}
  return Object.entries(goods)
    .filter(([, qty]) => qty > 0)
    .map(([goodId, qty]) => {
      const goodMeta = goodsStore.goods.find((g) => g.id === goodId)
      return { id: goodId, qty, name: goodMeta?.name || goodId, unit: goodMeta?.unit || '' }
    })
})

function txTypeLabel(type) {
  if (type === 'income') return 'Дохід'
  if (type === 'withdrawal') return 'Зняття'
  if (type === 'fish-sale') return 'Продаж риби'
  if (type === 'fish-release') return 'Відпускання риби'
  if (type === 'treasure-remove') return 'Скарб прибрано'
  if (type === 'admin-balance-adjustment') return 'Корекція балансу'
  if (type === 'admin-goods-adjustment') return 'Корекція товарів'
  if (type === 'mage-guild-reward') return 'Магічна допомога'
  if (type === 'crew-payment') return 'Оплата екіпажу'
  return 'Списання'
}

function txTypeClass(type) {
  if (type === 'income' || type === 'fish-sale' || type === 'mage-guild-reward') return 'wi-success-text'
  if (type === 'withdrawal') return 'wi-gold-text'
  if (type === 'fish-release') return 'wi-sea-text'
  if (type === 'treasure-remove') return 'wi-sea-text'
  if (type === 'admin-balance-adjustment' || type === 'admin-goods-adjustment') return 'wi-gold-text'
  return 'wi-danger-text'
}

function formatTxGoods(goods) {
  if (!goods || !Object.keys(goods).length) return '-'
  return Object.entries(goods)
    .map(([goodId, qty]) => {
      const meta = goodsStore.goods.find((g) => g.id === goodId)
      return `${qty > 0 ? '+' : ''}${qty} ${meta?.name || goodId}`
    })
    .join(', ')
}

function toMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (typeof value === 'number') return value
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function openGoldWithdrawDialog() {
  withdrawError.value = ''
  goldWithdrawAmount.value = 0
  goldDialog.value = true
}

function openGoodsWithdrawDialog(item) {
  withdrawError.value = ''
  goodsWithdrawAmount.value = 1
  selectedGood.value = item
  goodsDialog.value = true
}

function subscribeCaughtFish() {
  unsubscribeFish?.()
  unsubscribeFish = null
  caughtFish.value = []
  selectedFishIds.value = []
  fishError.value = ''

  if (!fishAccountState.value.canLoadFish) {
    fishLoading.value = false
    return
  }

  fishLoading.value = true
  const lookup = getCaughtFishLookup(fishAccountState.value.telegramId)
  if (!lookup) {
    fishLoading.value = false
    return
  }

  const fishQuery = query(
    collection(db, 'caught-fish'),
    where(lookup.field, '==', lookup.value),
  )

  unsubscribeFish = onSnapshot(fishQuery, (snap) => {
    caughtFish.value = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((fish) => fish.status === 'available')
      .filter((fish) => isCaughtFishOwnedByHero(fish, { heroId: userStore.heroId, telegramId: fishAccountState.value.telegramId }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    selectedFishIds.value = selectedFishIds.value.filter((id) => caughtFish.value.some((fish) => fish.id === id))
    fishLoading.value = false
  }, (err) => {
    fishError.value = err?.message || 'Не вдалося завантажити пійману рибу.'
    fishLoading.value = false
  })
}

function subscribeCaughtTreasures() {
  unsubscribeTreasures?.()
  unsubscribeTreasures = null
  caughtTreasures.value = []
  treasureError.value = ''

  if (!fishAccountState.value.canLoadFish) {
    treasureLoading.value = false
    return
  }

  treasureLoading.value = true
  const lookup = getCaughtTreasureLookup(fishAccountState.value.telegramId)
  if (!lookup) {
    treasureLoading.value = false
    return
  }

  const treasureQuery = query(
    collection(db, 'caught-treasures'),
    where(lookup.field, '==', lookup.value),
  )

  unsubscribeTreasures = onSnapshot(treasureQuery, (snap) => {
    caughtTreasures.value = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((treasure) => treasure.status === 'available')
      .filter((treasure) => isCaughtTreasureOwnedByHero(treasure, { heroId: userStore.heroId, telegramId: fishAccountState.value.telegramId }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    treasureLoading.value = false
  }, (err) => {
    treasureError.value = err?.message || 'Не вдалося завантажити скарби.'
    treasureLoading.value = false
  })
}

async function sellSelectedFish() {
  fishActionError.value = ''
  fishActionLoading.value = 'sell'
  try {
    await sellCaughtFish({
      heroId: userStore.heroId,
      heroName: hero.value.name || userStore.nickname,
      telegramId: hero.value.telegramId,
      caughtFishIds: selectedFishIds.value,
      actorName: userStore.nickname,
    })
    selectedFishIds.value = []
  } catch (e) {
    fishActionError.value = e?.message || 'Не вдалося продати рибу.'
  } finally {
    fishActionLoading.value = ''
  }
}

async function removeTreasure(treasure) {
  treasureActionLoading.value = treasure.id
  treasureError.value = ''
  try {
    await removeCaughtTreasure({
      heroId: userStore.heroId,
      heroName: hero.value.name || userStore.nickname,
      telegramId: hero.value.telegramId,
      treasureId: treasure.id,
      actorName: userStore.nickname,
      isAdmin: useUserStore().isAdmin ?? false,
    })
  } catch (e) {
    treasureError.value = e?.message || 'Не вдалося прибрати скарб.'
  } finally {
    treasureActionLoading.value = ''
  }
}

async function releaseSelectedFish() {
  fishActionError.value = ''
  fishActionLoading.value = 'release'
  try {
    await releaseCaughtFish({
      heroId: userStore.heroId,
      heroName: hero.value.name || userStore.nickname,
      telegramId: hero.value.telegramId,
      caughtFishIds: selectedFishIds.value,
      actorName: userStore.nickname,
    })
    selectedFishIds.value = []
  } catch (e) {
    fishActionError.value = e?.message || 'Не вдалося відпустити рибу.'
  } finally {
    fishActionLoading.value = ''
  }
}

async function withdrawGold() {
  withdrawError.value = ''
  const amount = Number(goldWithdrawAmount.value)
  if (!amount || amount <= 0) return (withdrawError.value = 'Введіть суму більше 0')
  if (amount > hero.value.goldBalance) return (withdrawError.value = 'Недостатньо коштів')

  withdrawing.value = true
  try {
    const heroRef = doc(db, 'heroes', userStore.heroId)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(heroRef)
      if (!snap.exists()) throw new Error('Героя не знайдено')
      const current = Number(snap.data().goldBalance ?? 0)
      if (amount > current) throw new Error('Недостатньо коштів')
      tx.update(heroRef, { goldBalance: current - amount })
      const txDocRef = doc(collection(db, 'hero-transactions'))
      tx.set(txDocRef, {
        heroId: userStore.heroId,
        heroName: userStore.nickname,
        goldAmount: -amount,
        goods: {},
        type: 'withdrawal',
        comment: `Гравець зняв ${formatAmount(amount)} зм.`,
        createdAt: serverTimestamp(),
      })
    })
    goldDialog.value = false
  } catch (e) {
    withdrawError.value = e?.message || 'Помилка'
  } finally {
    withdrawing.value = false
  }
}

async function withdrawGoods() {
  withdrawError.value = ''
  const item = selectedGood.value
  if (!item) return
  const amount = Math.floor(Number(goodsWithdrawAmount.value))
  if (!amount || amount <= 0) return (withdrawError.value = 'Введіть кількість більше 0')
  if (amount > item.qty) return (withdrawError.value = 'Недостатньо товару')

  withdrawing.value = true
  try {
    const heroRef = doc(db, 'heroes', userStore.heroId)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(heroRef)
      if (!snap.exists()) throw new Error('Героя не знайдено')
      const currentGoods = snap.data().goods || {}
      const currentQty = Number(currentGoods[item.id] ?? 0)
      if (amount > currentQty) throw new Error('Недостатньо товару')
      const newGoods = { ...currentGoods, [item.id]: currentQty - amount }
      tx.update(heroRef, { goods: newGoods })
      const txDocRef = doc(collection(db, 'hero-transactions'))
      tx.set(txDocRef, {
        heroId: userStore.heroId,
        heroName: userStore.nickname,
        goldAmount: 0,
        goods: { [item.id]: -amount },
        type: 'withdrawal',
        comment: `Гравець зняв ${amount} ${item.unit || 'шт.'} "${item.name}".`,
        createdAt: serverTimestamp(),
      })
    })
    goodsDialog.value = false
  } catch (e) {
    withdrawError.value = e?.message || 'Помилка'
  } finally {
    withdrawing.value = false
  }
}

onMounted(() => {
  goodsStore.subscribeGoods()

  if (!userStore.heroId) {
    loadError.value = 'Ви не авторизовані як гравець.'
    loading.value = false
    return
  }

  const heroRef = doc(db, 'heroes', userStore.heroId)
  unsubscribeHero = onSnapshot(heroRef, (snap) => {
    if (!snap.exists()) {
      loadError.value = 'Героя не знайдено.'
      loading.value = false
      return
    }
    const data = snap.data() || {}
    hero.value = {
      id: snap.id,
      name: data.name || userStore.nickname,
      goldBalance: data.goldBalance ?? 0,
      goods: data.goods || {},
      telegramId: String(data.telegramId || '').trim(),
    }
    loading.value = false
  }, () => {
    loadError.value = 'Не вдалося завантажити дані.'
    loading.value = false
  })

  const txQuery = query(
    collection(db, 'hero-transactions'),
    where('heroId', '==', userStore.heroId),
  )
  unsubscribeTx = onSnapshot(txQuery, (snap) => {
    transactionsError.value = ''
    transactions.value = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
  }, (err) => {
    transactionsError.value = err?.message || 'Не вдалося завантажити історію операцій.'
  })

  unsubscribeIsland = onSnapshot(doc(db, 'islands', DEFAULT_ISLAND_ID), (snap) => {
    fishSaleTaxRate.value = Number(snap.data()?.fishSaleTaxRate ?? 0.1) || 0.1
  })

  unsubscribeUsedDays = subscribeCurrentCycleUsedDays({ heroIds: [userStore.heroId] }, (usedDaysByHero) => {
    usedDays.value = usedDaysByHero.get(userStore.heroId) || { craftingDays: 0, mageGuildDays: 0, religionDays: 0, religionActions: 0, totalDays: 0 }
  }, (err) => {
    console.warn('[account] Failed to load used days', err)
  })
})

watch(() => hero.value.telegramId, () => {
  subscribeCaughtFish()
  subscribeCaughtTreasures()
})

onBeforeUnmount(() => {
  unsubscribeHero?.()
  unsubscribeTx?.()
  unsubscribeFish?.()
  unsubscribeTreasures?.()
  unsubscribeIsland?.()
  unsubscribeUsedDays?.()
  goodsStore.unsubscribeGoods()
})
</script>

<style scoped>
.account-page {
  max-width: 720px;
  padding-top: 24px;
  padding-bottom: 40px;
}

.account-card {
  background: linear-gradient(160deg, #2c1e0f 0%, #241809 100%);
  border: 1px solid var(--wi-border);
  border-radius: 6px;
}

.account-card-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 0.85rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-gold);
}

.account-card-body {
  padding: 16px !important;
}

.balance-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.balance-amount {
  font-size: 2.2rem;
}

.balance-unit {
  font-size: 1rem;
}

.used-days-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-family: var(--wi-font-body);
  color: var(--wi-text-muted);
  font-size: 0.86rem;
}

.withdraw-btn,
.save-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}

.withdraw-btn {
  font-size: 0.8rem !important;
}

.withdraw-btn :deep(.v-btn__overlay),
.save-btn :deep(.v-btn__overlay) {
  opacity: 0 !important;
}

.account-empty-state {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  font-size: 0.88rem;
}

.goods-list,
.fish-list,
.treasure-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goods-row,
.fish-row,
.treasure-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--wi-border);
  border-radius: 4px;
}

.fish-row {
  cursor: pointer;
}

.fish-checkbox {
  flex: 0 0 32px !important;
  width: 32px !important;
  min-width: 32px !important;
}

.fish-checkbox :deep(.v-selection-control) {
  flex: 0 0 32px;
  min-width: 32px;
}

.fish-checkbox :deep(.v-selection-control__wrapper) {
  margin-inline-start: 0;
  margin-inline-end: 0;
}

.goods-info,
.fish-info,
.treasure-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.fish-info {
  justify-content: flex-start;
  text-align: left;
}

.goods-name,
.fish-name,
.treasure-name {
  font-family: var(--wi-font-body);
  color: var(--wi-text);
  font-size: 0.9rem;
}

.fish-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.goods-qty {
  font-size: 1.1rem;
}

.goods-unit,
.fish-meta,
.treasure-meta {
  font-size: 0.8rem;
}

.fish-price,
.treasure-price {
  font-size: 0.95rem;
  white-space: nowrap;
  margin-left: auto;
}

.fish-summary {
  display: grid;
  gap: 6px;
  color: var(--wi-text);
  font-size: 0.85rem;
}

.fish-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.goods-withdraw-btn {
  color: var(--wi-gold) !important;
  border-color: var(--wi-border) !important;
  font-family: var(--wi-font-heading) !important;
  font-size: 0.7rem !important;
  letter-spacing: 0.06em !important;
}

.tx-table {
  background: transparent !important;
}

.tx-th {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.7rem !important;
  letter-spacing: 0.07em !important;
  text-transform: uppercase !important;
  color: var(--wi-text-muted) !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

.tx-row:hover {
  background: rgba(200, 150, 42, 0.04) !important;
}

.tx-td {
  font-size: 0.82rem !important;
  border-bottom: 1px solid rgba(90, 62, 32, 0.3) !important;
  padding: 8px 12px !important;
}

.tx-amount {
  font-family: var(--wi-font-number);
  white-space: nowrap;
}

.tx-goods {
  font-family: var(--wi-font-body);
  font-size: 0.78rem !important;
  color: var(--wi-text-muted);
}

.tx-comment {
  font-style: italic;
  font-size: 0.78rem !important;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.account-dialog-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 0.95rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.account-error-msg {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.85rem;
}

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
}
</style>
