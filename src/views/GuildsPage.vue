<template>
  <v-container class="guilds-page">

    <!-- Header -->
    <WiPageHeader title="Гільдії острова" icon="mdi-shield-sword">
      <template #actions>
        <WiActionButton v-if="isAdmin" prepend-icon="mdi-plus" @click="openCreateDialog">Додати гільдію</WiActionButton>
      </template>
    </WiPageHeader>

    <WiPanel v-if="store.error" variant="danger">
      <WiEmptyState title="Не вдалося завантажити гільдії" :text="store.error" icon="mdi-alert-circle" />
    </WiPanel>

    <WiPanel v-else-if="!visibleGuilds.length">
      <WiEmptyState title="Доступні гільдії відсутні" icon="mdi-shield-off-outline" />
    </WiPanel>

    <!-- Guild cards -->
    <v-row>
      <v-col v-for="guild in visibleGuilds" :key="guild.id" cols="12" md="6">
        <div
          class="guild-card"
          :class="{
            'guild-card-clickable': canViewGuildLogs(guild),
            'guild-card-negative': isNegativeGuild(guild),
          }"
          @click="openGuildLogs(guild)"
        >
          <!-- Crest circle -->
          <div class="guild-crest">
            <v-icon size="22">mdi-shield-sword</v-icon>
          </div>

          <!-- Title block -->
          <div class="guild-info">
            <div class="guild-name">{{ guild.name || guild.id }}</div>
            <div class="guild-leader">
              <v-icon size="12" class="mr-1">mdi-crown</v-icon>
              {{ guild.leader || 'Невідомий лідер' }}
            </div>
            <div v-if="guild.shortName" class="guild-short">{{ guild.shortName }}</div>
          </div>

          <!-- Balance -->
          <div class="guild-balance" :class="isNegativeGuild(guild) ? 'balance-negative' : ''">
            <div class="guild-balance-amount wi-number">{{ formatAmount(guild.treasure || 0) }}</div>
            <div class="guild-balance-label">золотих монет</div>
          </div>

          <!-- Goods inventory (compact chips) -->
          <div v-if="guildGoodsList(guild).length" class="guild-goods-row" @click.stop>
            <v-icon size="12" class="mr-1" color="#c8962a">mdi-package-variant</v-icon>
            <span v-for="item in guildGoodsList(guild)" :key="item.goodId" class="guild-good-chip">
              {{ item.name }}: <strong>{{ item.qty }}</strong>
            </span>
          </div>

          <!-- Footer actions -->
          <div class="guild-actions" @click.stop>
            <v-btn class="guild-deposit-btn" size="small" prepend-icon="mdi-tray-arrow-down" @click="openTransaction(guild, 'deposit')">Внести</v-btn>
            <v-btn v-if="isAdmin || user.canAccessGuild(guild.id)" class="guild-withdraw-btn" size="small" prepend-icon="mdi-tray-arrow-up" variant="tonal" @click="openTransaction(guild, 'withdraw')">Зняти</v-btn>
            <v-btn v-if="canManageGuildGoods(guild)" class="guild-goods-btn" size="small" prepend-icon="mdi-package-variant" variant="tonal" @click="openGoodsDialog(guild)">Товари</v-btn>
            <v-spacer />
            <v-btn v-if="isAdmin" size="small" variant="text" icon="mdi-feather" class="guild-edit-btn" @click="openEditDialog(guild)" />
          </div>

          <div v-if="canViewGuildLogs(guild)" class="guild-log-hint">
            <v-icon size="11" class="mr-1">mdi-scroll-text</v-icon>
            Натисніть для перегляду журналу
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Create/Edit guild dialog -->
    <v-dialog v-model="showGuildDialog" max-width="560" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="guild-dialog">
        <div class="guild-dialog-header">
          <v-icon class="mr-2">mdi-shield-sword</v-icon>
          {{ editMode ? 'Змінити гільдію' : 'Нова гільдія' }}
        </div>
        <v-card-text class="guild-dialog-body">
          <v-text-field v-model="guildForm.name" label="Назва гільдії" variant="outlined" density="compact" hide-details="auto" class="mb-3" />
          <v-text-field v-model="guildForm.shortName" label="Коротке ім'я" variant="outlined" density="compact" hide-details="auto" class="mb-3" />
          <v-text-field v-model="guildForm.leader" label="Лідер" variant="outlined" density="compact" hide-details="auto" class="mb-3" />
          <v-checkbox v-model="guildForm.visibleToAll" label="Видима для всіх" density="compact" hide-details class="mb-2" />
          <v-text-field v-model="guildForm.withdrawUsername" label="Має доступ (нікнейм)" variant="outlined" density="compact" hide-details="auto" class="mb-3" />
          <v-text-field v-model="guildForm.withdrawPassword" label="Пароль для доступу" variant="outlined" density="compact" hide-details="auto" type="password" class="mb-3" />
          <v-text-field v-model.number="guildForm.treasure" type="number" min="0" step="0.01" label="Початковий баланс (зм)" variant="outlined" density="compact" hide-details="auto" />
          <div v-if="formError" class="guild-dialog-error mt-3">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ formError }}
          </div>
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="guild-dialog-actions">
          <v-btn variant="text" class="cancel-btn" @click="showGuildDialog = false">Скасувати</v-btn>
          <v-spacer />
          <WiActionButton prepend-icon="mdi-feather" @click="saveGuild">Зберегти</WiActionButton>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Transaction dialog -->
    <v-dialog v-model="showTxDialog" max-width="480" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="guild-dialog">
        <div class="guild-dialog-header">
          <v-icon class="mr-2">{{ txMode === 'deposit' ? 'mdi-tray-arrow-down' : 'mdi-tray-arrow-up' }}</v-icon>
          {{ txMode === 'deposit' ? 'Внести кошти' : 'Зняти кошти' }} · {{ selectedGuild?.name }}
        </div>
        <v-card-text class="guild-dialog-body">
          <v-text-field v-model.number="txAmount" label="Сума (золото)" type="number" min="0.01" step="0.01" variant="outlined" density="compact" hide-details="auto" class="mb-3" prepend-inner-icon="mdi-gold" />
          <v-textarea v-model="txComment" label="Коментар" rows="2" auto-grow variant="outlined" density="compact" hide-details="auto" class="mb-3" prepend-inner-icon="mdi-feather" />
          <v-text-field
            v-if="txMode === 'withdraw' && !isAdmin"
            v-model="txPassword"
            label="Пароль гільдії"
            type="password"
            variant="outlined"
            density="compact"
            hide-details="auto"
          />
          <div v-if="txError" class="guild-dialog-error mt-3">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ txError }}
          </div>
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="guild-dialog-actions">
          <v-btn variant="text" class="cancel-btn" @click="showTxDialog = false">Скасувати</v-btn>
          <v-spacer />
          <WiActionButton :loading="txLoading" @click="submitTransaction">Підтвердити</WiActionButton>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Logs dialog -->
    <v-dialog v-model="showLogsDialog" max-width="860" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="guild-dialog guild-logs-dialog">
        <div class="guild-dialog-header">
          <v-icon class="mr-2">mdi-scroll-text</v-icon>
          Журнал операцій · {{ logsGuild?.name || logsGuild?.id }}
          <v-spacer />
          <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="logsLoading" @click="reloadGuildLogs" class="cancel-btn" style="font-size: 0.72rem !important">Оновити</v-btn>
        </div>
        <v-card-text class="pa-0">
          <div v-if="logsError" class="guild-dialog-error" style="margin: 16px 20px">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ logsError }}
          </div>

          <div v-if="guildLogs.length" class="guild-ledger-wrap">
            <v-table class="guild-ledger-table" density="comfortable">
              <thead>
                <tr>
                  <th>Коли</th>
                  <th>Хто</th>
                  <th>Тип</th>
                  <th class="text-right">Сума</th>
                  <th>Коментар</th>
                  <th class="text-right">Баланс після</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in guildLogs" :key="log.id" class="ledger-row">
                  <td class="ledger-date">{{ formatDate(log.createdAt) }}</td>
                  <td class="ledger-who">{{ log.userNickname || 'Невідомий' }}</td>
                  <td>
                    <span class="tx-type" :class="logOperationClass(log)">
                      <v-icon size="12" class="mr-1">{{ logOperationIcon(log) }}</v-icon>
                      {{ logOperationLabel(log) }}
                    </span>
                  </td>
                  <td class="text-right">
                    <span v-if="isGoodsLog(log)" :class="goodsLogDeltaClass(log)">
                      {{ formatLogGoods(log.goods) }}
                    </span>
                    <span v-else :class="log.amount >= 0 ? 'amount-positive' : 'amount-negative'">
                      {{ log.amount >= 0 ? '+' : '' }}{{ formatAmount(log.amount || 0) }}
                    </span>
                  </td>
                  <td class="ledger-comment">
                    <v-tooltip location="top" max-width="320">
                      <template #activator="{ props }">
                        <span v-bind="props" class="comment-truncated">{{ log.comment || '—' }}</span>
                      </template>
                      {{ log.comment || '—' }}
                    </v-tooltip>
                  </td>
                  <td class="text-right ledger-balance-after">
                    {{ isGoodsLog(log) ? formatLogGoods(log.goodsAfter, { includeSign: false }) : formatAmount(log.treasureAfter || 0) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div v-else-if="!logsLoading" class="guild-logs-empty">
            <v-icon class="mr-2" size="14">mdi-anchor</v-icon>
            Журнал поки що порожній.
          </div>
        </v-card-text>
        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="guild-dialog-actions">
          <v-spacer />
          <v-btn variant="text" class="cancel-btn" @click="showLogsDialog = false">Закрити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Goods dialog (admin only) -->
    <v-dialog v-model="showGoodsDialog" max-width="520" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="guild-dialog">
        <div class="guild-dialog-header">
          <v-icon class="mr-2">mdi-package-variant</v-icon>
          Товари гільдії · {{ selectedGuild?.name }}
        </div>
        <v-card-text class="guild-dialog-body">

          <!-- Current inventory -->
          <div class="goods-inventory-label">Поточний склад</div>
          <div v-if="guildGoodsList(selectedGuild).length" class="goods-inventory-list mb-4">
            <div v-for="item in guildGoodsList(selectedGuild)" :key="item.goodId" class="goods-inventory-row">
              <span class="goods-inv-name">{{ item.name }}</span>
              <span class="goods-inv-qty wi-number">{{ item.qty }}</span>
              <span v-if="item.unit" class="goods-inv-unit">{{ item.unit }}</span>
            </div>
          </div>
          <div v-else class="goods-inventory-empty mb-4">Склад порожній</div>

          <!-- Mode toggle -->
          <v-btn-toggle v-model="goodsTxMode" mandatory density="compact" class="mb-4 goods-mode-toggle">
            <v-btn value="deposit" size="small">
              <v-icon start size="14">mdi-tray-arrow-down</v-icon>Поповнити
            </v-btn>
            <v-btn value="withdraw" size="small">
              <v-icon start size="14">mdi-tray-arrow-up</v-icon>Зняти
            </v-btn>
          </v-btn-toggle>

          <v-text-field
            v-if="goodsTxMode === 'withdraw' && !isAdmin"
            v-model="goodsTxPassword"
            label="Пароль гільдії"
            type="password"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
          />

          <!-- Goods rows -->
          <div v-for="(row, idx) in goodsTxRows" :key="idx" class="good-tx-row mb-2">
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
              v-model.number="row.qty"
              type="number"
              min="0.01"
              step="1"
              label="Кількість"
              density="comfortable"
              hide-details="auto"
              class="goods-qty-field"
            />
            <v-btn icon size="small" variant="text" color="error" @click="removeGoodsTxRow(idx)">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
          <v-btn size="small" variant="text" prepend-icon="mdi-plus" class="mb-3" @click="addGoodsTxRow">
            Додати товар
          </v-btn>

          <v-textarea
            v-model="goodsTxComment"
            label="Коментар"
            rows="2"
            auto-grow
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-2"
          />

          <div v-if="goodsTxError" class="guild-dialog-error mt-2">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>{{ goodsTxError }}
          </div>
        </v-card-text>

        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="guild-dialog-actions">
          <v-btn variant="text" class="cancel-btn" @click="showGoodsDialog = false">Скасувати</v-btn>
          <v-spacer />
          <WiActionButton :loading="goodsTxLoading" @click="submitGoodsTransaction">Підтвердити</WiActionButton>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Timestamp } from 'firebase/firestore'
import { useGuildStore } from '@/store/guildStore'
import { useUserStore } from '@/store/userStore'
import { useGoodsStore } from '@/store/goodsStore'
import { formatAmount } from '@/utils/formatters'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'

const store = useGuildStore()
const user = useUserStore()
const goodsStore = useGoodsStore()
const isAdmin = computed(() => user.isAdmin ?? false)

const showGuildDialog = ref(false)
const showTxDialog = ref(false)
const showLogsDialog = ref(false)
const editMode = ref(false)
const editingGuildId = ref('')
const formError = ref('')
const guildForm = ref(defaultGuildForm())

const selectedGuild = ref(null)
const txMode = ref('deposit')
const txAmount = ref(null)
const txComment = ref('')
const txPassword = ref('')
const txError = ref('')
const txLoading = ref(false)

const logsGuild = ref(null)
const guildLogs = ref([])
const logsLoading = ref(false)
const logsError = ref('')

const visibleGuilds = computed(() =>
  store.guilds.filter((guild) => {
    if (isAdmin.value) return true
    if (guild.visibleToAll) return true
    return user.canAccessGuild(guild.id)
  })
)

function canViewGuildLogs(guild) {
  if (!guild) return false
  if (isAdmin.value) return true
  return user.canAccessGuild(guild.id)
}

function canManageGuildGoods(guild) {
  if (!guild) return false
  if (isAdmin.value) return true
  return user.canAccessGuild(guild.id)
}

function isNegativeGuild(guild) { return Number(guild?.treasure || 0) < 0 }

async function openGuildLogs(guild) {
  if (!canViewGuildLogs(guild)) return
  logsGuild.value = guild
  guildLogs.value = []
  logsError.value = ''
  showLogsDialog.value = true
  await reloadGuildLogs()
}

async function reloadGuildLogs() {
  if (!logsGuild.value?.id) return
  logsLoading.value = true
  logsError.value = ''
  try { guildLogs.value = await store.getGuildLogs(logsGuild.value.id) }
  catch (error) { logsError.value = error?.message || String(error) }
  finally { logsLoading.value = false }
}

function openCreateDialog() {
  editMode.value = false; editingGuildId.value = ''; guildForm.value = defaultGuildForm(); formError.value = ''; showGuildDialog.value = true
}

function openEditDialog(guild) {
  editMode.value = true
  editingGuildId.value = guild.id
  guildForm.value = {
    name: guild.name || '', shortName: guild.shortName || '', leader: guild.leader || '',
    treasure: guild.treasure || 0, visibleToAll: guild.visibleToAll !== false,
    withdrawUsername: guild.withdrawUsername || '', withdrawPassword: guild.withdrawPassword || '',
  }
  formError.value = ''; showGuildDialog.value = true
}

async function saveGuild() {
  formError.value = ''
  if (!guildForm.value.name.trim()) { formError.value = `Назва гільдії обов'язкова`; return }
  try {
    if (editMode.value) await store.updateGuild(editingGuildId.value, guildForm.value)
    else await store.addGuild(guildForm.value)
    showGuildDialog.value = false
  } catch (error) { formError.value = error?.message || String(error) }
}

function openTransaction(guild, mode) {
  selectedGuild.value = guild; txMode.value = mode; txAmount.value = null
  txComment.value = ''; txPassword.value = ''; txError.value = ''; showTxDialog.value = true
}

async function submitTransaction() {
  txError.value = ''
  if (!user.isLoggedIn) { txError.value = 'Спершу потрібно авторизуватися'; return }
  const amount = Number(txAmount.value)
  if (!amount || amount <= 0) { txError.value = 'Число має бути більше нуля.'; return }
  if (txMode.value === 'withdraw' && !hasWithdrawAccess(selectedGuild.value, txPassword.value)) { txError.value = `Хибне ім'я або пароль.`; return }
  txLoading.value = true
  try {
    if (txMode.value === 'withdraw') await store.withdraw({ guildId: selectedGuild.value.id, amount, comment: txComment.value, actor: { nickname: user.nickname } })
    else await store.deposit({ guildId: selectedGuild.value.id, amount, comment: txComment.value, actor: { nickname: user.nickname } })
    showTxDialog.value = false
  } catch (error) { txError.value = error?.message || String(error) }
  finally { txLoading.value = false }
}

function hasWithdrawAccess(guild, password) {
  if (isAdmin.value) return true
  return user.nickname === (guild?.withdrawUsername || '') && password === (guild?.withdrawPassword || '')
}

// ── Goods transactions ────────────────────────────────────────
const showGoodsDialog = ref(false)
const goodsTxMode = ref('deposit')
const goodsTxRows = ref([{ goodId: '', qty: 1 }])
const goodsTxComment = ref('')
const goodsTxPassword = ref('')
const goodsTxError = ref('')
const goodsTxLoading = ref(false)

const goodsOptions = computed(() =>
  goodsStore.goods.map(g => ({ id: g.id, label: g.name + (g.unit ? ` (${g.unit})` : '') }))
)

function guildGoodsList(guild) {
  if (!guild?.goods) return []
  return Object.entries(guild.goods)
    .filter(([, qty]) => Number(qty) !== 0)
    .map(([goodId, qty]) => {
      const def = goodsStore.goods.find(g => g.id === goodId)
      return { goodId, name: def?.name || goodId, unit: def?.unit || '', qty: Number(qty) }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'))
}

function openGoodsDialog(guild) {
  selectedGuild.value = guild
  goodsTxMode.value = 'deposit'
  goodsTxRows.value = [{ goodId: '', qty: 1 }]
  goodsTxComment.value = ''
  goodsTxPassword.value = ''
  goodsTxError.value = ''
  showGoodsDialog.value = true
}

function addGoodsTxRow() { goodsTxRows.value.push({ goodId: '', qty: 1 }) }
function removeGoodsTxRow(idx) { goodsTxRows.value.splice(idx, 1) }

async function submitGoodsTransaction() {
  goodsTxError.value = ''
  const goods = {}
  for (const row of goodsTxRows.value) {
    if (!row.goodId) continue
    const n = Number(row.qty)
    if (n > 0) goods[row.goodId] = (goods[row.goodId] || 0) + n
  }
  if (!Object.keys(goods).length) { goodsTxError.value = 'Додайте хоча б один товар із кількістю.'; return }
  if (goodsTxMode.value === 'withdraw' && !hasWithdrawAccess(selectedGuild.value, goodsTxPassword.value)) { goodsTxError.value = `Хибне ім'я або пароль.`; return }

  goodsTxLoading.value = true
  try {
    if (goodsTxMode.value === 'deposit') {
      await store.depositGoods({ guildId: selectedGuild.value.id, goods, comment: goodsTxComment.value, actor: { nickname: user.nickname } })
    } else {
      await store.withdrawGoods({ guildId: selectedGuild.value.id, goods, comment: goodsTxComment.value, actor: { nickname: user.nickname } })
    }
    showGoodsDialog.value = false
  } catch (e) {
    goodsTxError.value = e?.message || String(e)
  } finally {
    goodsTxLoading.value = false
  }
}

function isGoodsLog(log) {
  return log?.type === 'goods-deposit' || log?.type === 'goods-withdraw'
}

function logOperationClass(log) {
  if (log?.type === 'deposit' || log?.type === 'goods-deposit') return 'tx-deposit'
  return 'tx-withdraw'
}

function logOperationIcon(log) {
  if (log?.type === 'goods-deposit') return 'mdi-package-down'
  if (log?.type === 'goods-withdraw') return 'mdi-package-up'
  return log?.type === 'deposit' ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold'
}

function logOperationLabel(log) {
  if (log?.type === 'goods-deposit') return 'Товари +'
  if (log?.type === 'goods-withdraw') return 'Товари -'
  return log?.type === 'deposit' ? 'Внесок' : 'Зняття'
}

function goodsLogDeltaClass(log) {
  return log?.type === 'goods-deposit' ? 'amount-positive' : 'amount-negative'
}

function formatLogGoods(goods, { includeSign = true } = {}) {
  const entries = Object.entries(goods || {}).filter(([, qty]) => Number(qty) !== 0)
  if (!entries.length) return '—'
  return entries
    .map(([goodId, qty]) => {
      const n = Number(qty)
      const def = goodsStore.goods.find(g => g.id === goodId)
      const sign = includeSign && n > 0 ? '+' : ''
      const unit = def?.unit ? ` ${def.unit}` : ''
      return `${def?.name || goodId}: ${sign}${n}${unit}`
    })
    .join(', ')
}

function defaultGuildForm() {
  return { name: '', shortName: '', leader: '', treasure: 0, visibleToAll: true, withdrawUsername: '', withdrawPassword: '' }
}

function formatDate(value) {
  if (!value) return '—'
  const date = value instanceof Timestamp ? value.toDate() : value
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

onMounted(() => { store.subscribeGuilds(); goodsStore.subscribeGoods() })
onBeforeUnmount(() => { store.unsubscribeGuilds(); goodsStore.unsubscribeGoods() })
</script>

<style scoped>
.guilds-page { padding-bottom: 16px; }

.guilds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.guilds-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  color: var(--wi-gold);
}

.add-guild-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
  font-size: 0.8rem !important;
}
.add-guild-btn :deep(.v-btn__overlay) { opacity: 0 !important; }

.guilds-error {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.85rem;
  margin-bottom: 12px;
}

/* ── Guild card ─────────────────────────────────────────────── */
.guild-card {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  padding: 16px;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  grid-template-rows: auto auto auto auto auto;
  gap: 0 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.guild-card:hover {
  border-color: rgba(200, 150, 42, 0.4);
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}

.guild-card-clickable { cursor: pointer; }
.guild-card-negative { border-color: rgba(139, 42, 42, 0.5) !important; }

.guild-crest {
  grid-column: 1;
  grid-row: 1 / 3;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(200, 150, 42, 0.08);
  border: 1px solid rgba(200, 150, 42, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wi-gold);
  flex-shrink: 0;
  align-self: center;
}

.guild-info { grid-column: 2; grid-row: 1; min-width: 0; }

.guild-name {
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: var(--wi-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.guild-leader {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.8rem;
  color: var(--wi-text-muted);
  margin-top: 2px;
}
.guild-leader .v-icon { color: var(--wi-gold) !important; opacity: 0.6; }

.guild-short {
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--wi-text-muted);
  text-transform: uppercase;
  margin-top: 2px;
}

.guild-balance { grid-column: 3; grid-row: 1 / 3; text-align: right; flex-shrink: 0; }

.guild-balance-amount {
  font-size: 1.3rem;
  color: var(--wi-gold);
  text-shadow: 0 0 10px rgba(200,150,42,0.3);
  line-height: 1.1;
}

.balance-negative .guild-balance-amount { color: var(--wi-danger); text-shadow: none; }

.guild-balance-label {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.7rem;
  color: var(--wi-text-muted);
}

.guild-actions {
  grid-column: 1 / 4;
  grid-row: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(90, 62, 32, 0.35);
}

.guild-deposit-btn {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.05em !important;
  background: rgba(90, 138, 60, 0.15) !important;
  color: var(--wi-success) !important;
  border: 1px solid rgba(90, 138, 60, 0.3) !important;
}
.guild-deposit-btn :deep(.v-btn__overlay) { background-color: var(--wi-success) !important; opacity: 0; }
.guild-deposit-btn:hover :deep(.v-btn__overlay) { opacity: 0.08 !important; }

.guild-withdraw-btn {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.05em !important;
  color: var(--wi-danger) !important;
  border: 1px solid rgba(139, 42, 42, 0.3) !important;
}
.guild-withdraw-btn :deep(.v-btn__overlay) { background-color: var(--wi-danger) !important; opacity: 0; }
.guild-withdraw-btn:hover :deep(.v-btn__overlay) { opacity: 0.08 !important; }

.guild-edit-btn { color: var(--wi-text-muted) !important; }
.guild-edit-btn :deep(.v-btn__overlay) { background-color: var(--wi-gold) !important; }

.guild-log-hint {
  grid-column: 1 / 4;
  grid-row: 5;
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}
.guild-card-clickable:hover .guild-log-hint { opacity: 1; }

/* ── Shared dialogs ─────────────────────────────────────────── */
.guild-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.guild-dialog-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.guild-dialog-body { padding: 20px !important; }

.guild-dialog-error {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.85rem;
}

.guild-dialog-actions { padding: 12px 20px !important; }

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.06em !important;
}

/* ── Ledger ─────────────────────────────────────────────────── */
.guild-ledger-wrap { overflow-x: auto; }
.guild-ledger-table { background: transparent !important; }

.guild-ledger-table :deep(thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  border-bottom: 1px solid var(--wi-border) !important;
  background: #1a1108 !important;
  white-space: nowrap;
  padding: 10px 14px !important;
}

.ledger-row td {
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  color: var(--wi-text);
  border-bottom: 1px solid rgba(90, 62, 32, 0.4) !important;
  padding: 9px 14px !important;
  vertical-align: middle;
}

.ledger-row:nth-child(even) td { background: rgba(255,255,255,0.02); }
.ledger-row:hover td { background: rgba(200,150,42,0.05) !important; }

.ledger-date { white-space: nowrap; color: var(--wi-text-muted) !important; font-size: 0.78rem !important; }
.ledger-who { font-style: italic; color: var(--wi-text-muted) !important; }

.tx-type {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
}

.tx-deposit { color: var(--wi-success); background: rgba(90, 138, 60, 0.15); border: 1px solid rgba(90, 138, 60, 0.3); }
.tx-withdraw { color: var(--wi-danger); background: rgba(139, 42, 42, 0.15); border: 1px solid rgba(139, 42, 42, 0.3); }
.amount-positive { color: var(--wi-success); font-weight: bold; }
.amount-negative { color: var(--wi-danger); font-weight: bold; }

.ledger-comment { max-width: 240px; color: var(--wi-text-muted) !important; font-style: italic; }
.comment-truncated { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: default; }
.ledger-balance-after { font-family: var(--wi-font-number); font-size: 0.8rem; color: var(--wi-gold) !important; white-space: nowrap; }

/* ── Guild goods row on card ────────────────────────────────── */
.guild-goods-row {
  grid-column: 1 / 4;
  grid-row: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--wi-text-muted);
}

.guild-good-chip {
  background: rgba(200, 150, 42, 0.08);
  border: 1px solid rgba(200, 150, 42, 0.2);
  border-radius: 3px;
  padding: 1px 6px;
  color: var(--wi-text);
  font-size: 0.73rem;
}

.guild-good-chip strong {
  color: var(--wi-gold);
  font-family: var(--wi-font-number);
}

.guild-goods-btn {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.05em !important;
  color: var(--wi-sea) !important;
  border-color: rgba(58, 96, 128, 0.35) !important;
}

/* ── Goods dialog ───────────────────────────────────────────── */
.goods-inventory-label {
  font-family: var(--wi-font-heading);
  font-size: 0.68rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  margin-bottom: 8px;
}

.goods-inventory-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.goods-inventory-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(90, 62, 32, 0.3);
  border-radius: 4px;
}

.goods-inv-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--wi-text);
}

.goods-inv-qty {
  font-size: 0.9rem;
  color: var(--wi-gold);
}

.goods-inv-unit {
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  font-style: italic;
}

.goods-inventory-empty {
  font-size: 0.82rem;
  color: var(--wi-text-muted);
  font-style: italic;
}

.goods-mode-toggle {
  width: 100%;
}

.goods-mode-toggle :deep(.v-btn) {
  flex: 1;
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.05em !important;
}

.good-tx-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.goods-qty-field {
  max-width: 100px;
  flex-shrink: 0;
}

.guild-logs-empty {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  padding: 20px;
}
</style>
