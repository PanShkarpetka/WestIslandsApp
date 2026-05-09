<template>
  <div>
    <!-- Chest card -->
    <div
      class="chest-card"
      role="button"
      tabindex="0"
      @click="open()"
      @keydown.enter.prevent="open()"
      @keydown.space.prevent="open()"
    >
      <div class="chest-bg" />
      <div class="chest-content">
        <div class="chest-balance wi-number">{{ formattedBalance }}</div>
        <div class="chest-unit">золотих монет</div>
        <div class="chest-hint">
          <v-icon size="16" class="mr-1">mdi-hand-coin</v-icon>
          {{ isAdmin ? 'Внести або зняти' : 'Внести' }}
        </div>
      </div>
    </div>

    <!-- Dialog -->
    <v-dialog v-model="isOpen" max-width="520" :fullscreen="$vuetify.display.smAndDown" scrollable>
      <v-card class="chest-dialog">

        <div class="chest-dialog-header">
          <v-icon class="mr-2">mdi-treasure-chest</v-icon>
          <span>{{ mode === 'deposit' ? 'Внесок у скарбницю' : 'Зняття зі скарбниці' }}</span>
          <v-spacer />
          <span class="chest-dialog-balance">
            <v-icon size="14" class="mr-1">mdi-gold</v-icon>
            {{ formattedBalance }} зм
          </span>
        </div>

        <v-card-text class="chest-dialog-body">

          <!-- Mode toggle (admin only) -->
          <div v-if="isAdmin" class="mode-toggle-wrap">
            <v-btn-toggle v-model="mode" mandatory density="comfortable" class="mode-toggle">
              <v-btn value="deposit" prepend-icon="mdi-tray-arrow-down">Внести</v-btn>
              <v-btn value="withdraw" prepend-icon="mdi-tray-arrow-up">Зняти</v-btn>
            </v-btn-toggle>
          </div>

          <!-- Amount -->
          <v-text-field
            v-model.number="amount"
            type="number"
            label="Сума (золото)"
            variant="outlined"
            density="comfortable"
            min="0.01"
            step="0.01"
            prepend-inner-icon="mdi-gold"
            :rules="[v => !!v || 'Вкажіть суму', v => v > 0 || 'Більше нуля']"
            hide-details="auto"
            class="mb-3"
          />

          <!-- Quick amounts -->
          <div class="quick-amounts">
            <v-chip
              v-for="n in [5, 10, 25, 50, 100]"
              :key="n"
              size="small"
              class="quick-chip"
              @click="amount = (Number(amount) || 0) + n"
            >+{{ n }}</v-chip>
            <v-chip size="small" variant="text" class="clear-chip" @click="amount = null">
              Очистити
            </v-chip>
          </div>

          <!-- Split with guild -->
          <v-checkbox
            v-if="mode === 'deposit'"
            v-model="splitWithAdventurerGuild"
            label="Половину в гільдію Авантюристів, половину в скарбницю"
            density="comfortable"
            hide-details
            color="primary"
            class="mb-3"
          />

          <!-- Comment -->
          <v-textarea
            v-model="comment"
            label="Коментар"
            variant="outlined"
            density="comfortable"
            rows="2"
            auto-grow
            maxlength="500"
            prepend-inner-icon="mdi-feather"
            :rules="[v => !!v || 'Вкажіть коментар']"
            hide-details="auto"
          />

          <p class="chest-dialog-note">
            Баланс після операції порахується автоматично. Транзакція з'явиться в списку нижче.
            <strong v-if="!isLoggedIn"> Для операції необхідна авторизація.</strong>
          </p>

          <div v-if="error" class="chest-dialog-error">
            <v-icon size="14" class="mr-1">mdi-skull-crossbones</v-icon>{{ error }}
          </div>
        </v-card-text>

        <v-divider style="border-color: var(--wi-border)" />
        <v-card-actions class="chest-dialog-actions">
          <v-btn variant="text" class="cancel-btn" @click="isOpen = false">Скасувати</v-btn>
          <v-spacer />
          <v-btn
            :loading="loading"
            :disabled="!isLoggedIn"
            class="confirm-btn"
            size="large"
            :prepend-icon="mode === 'deposit' ? 'mdi-tray-arrow-down' : 'mdi-tray-arrow-up'"
            @click="submit"
          >
            Підтвердити
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTreasuryStore } from '@/store/treasuryStore'
import { useUserStore } from '@/store/userStore'
import { useGuildStore } from '@/store/guildStore'
import { formatAmount } from '@/utils/formatters'

const treasury = useTreasuryStore()
const guildStore = useGuildStore()
const user = useUserStore()

const isOpen = ref(false)
const mode = ref('deposit')
const amount = ref(null)
const comment = ref('')
const loading = ref(false)
const error = ref('')
const splitWithAdventurerGuild = ref(false)

const isAdmin = computed(() => !!user.isAdmin)
const isLoggedIn = computed(() => user.nickname !== '')
const balance = computed(() => treasury.balance)
const formattedBalance = computed(() => formatAmount(balance.value))

function open() {
  mode.value = 'deposit'
  amount.value = null
  comment.value = ''
  error.value = ''
  splitWithAdventurerGuild.value = false
  isOpen.value = true
}

async function submit() {
  error.value = ''
  if (!amount.value || amount.value <= 0) { error.value = 'Вкажіть коректну суму.'; return }
  loading.value = true
  try {
    const enteredAmount = Number(amount.value)
    const payload = { amount: enteredAmount, comment: comment.value, user: { uid: user.uid, nickname: user.nickname || 'Гравець' } }
    if (mode.value === 'withdraw') {
      await treasury.withdraw(payload)
    } else if (splitWithAdventurerGuild.value) {
      const guildPart = Math.round((enteredAmount / 2) * 100) / 100
      const treasuryPart = Math.round((enteredAmount - guildPart) * 100) / 100
      if (treasuryPart > 0) await treasury.deposit({ ...payload, amount: treasuryPart, comment: `${comment.value} (50% до скарбниці)`.trim() })
      if (guildPart > 0) await guildStore.deposit({ guildId: 'AdventureGuild', amount: guildPart, comment: `${comment.value} (50% до ГАК)`.trim(), actor: { nickname: user.nickname || 'Гравець' } })
    } else {
      await treasury.deposit(payload)
    }
    isOpen.value = false
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => treasury.subscribeBalance())
onBeforeUnmount(() => treasury.unsubscribeBalance())
</script>

<style scoped>
/* ── Chest card ─────────────────────────────────────────────── */
.chest-card {
  position: relative;
  height: 260px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--wi-border);
  box-shadow: 0 6px 32px rgba(0,0,0,0.6);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.chest-card:hover {
  border-color: var(--wi-gold);
  box-shadow: 0 6px 32px rgba(0,0,0,0.6), 0 0 24px rgba(200,150,42,0.2);
}

.chest-bg {
  position: absolute;
  inset: 0;
  background-image: url(@/images/island/treasury/chest.png);
  background-repeat: no-repeat;
  background-position: right 24px center;
  background-size: 280px;
  background-color: var(--wi-surface);
  transition: transform 0.3s ease;
}

.chest-card:hover .chest-bg {
  transform: scale(1.02);
}

.chest-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0 32px;
  background: linear-gradient(90deg, rgba(26,18,9,0.92) 45%, rgba(26,18,9,0.3) 100%);
}

.chest-balance {
  font-size: clamp(3rem, 8vw, 5.5rem);
  line-height: 1;
  color: var(--wi-gold);
  text-shadow: 0 0 20px rgba(200,150,42,0.5), 0 2px 8px rgba(0,0,0,0.5);
  letter-spacing: 0.02em;
}

.chest-unit {
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  font-size: 0.95rem;
  margin-top: 4px;
  letter-spacing: 0.05em;
}

.chest-hint {
  display: flex;
  align-items: center;
  margin-top: 16px;
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  opacity: 0.7;
  transition: opacity 0.2s;
}

.chest-card:hover .chest-hint {
  opacity: 1;
  color: var(--wi-gold);
}

/* ── Dialog ─────────────────────────────────────────────────── */
.chest-dialog {
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%) !important;
  border: 1px solid var(--wi-gold) !important;
}

.chest-dialog-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.chest-dialog-balance {
  font-family: var(--wi-font-number);
  font-size: 0.9rem;
  color: var(--wi-gold);
  opacity: 0.8;
  display: flex;
  align-items: center;
}

.chest-dialog-body {
  padding: 20px !important;
}

/* Mode toggle */
.mode-toggle-wrap { margin-bottom: 16px; }

.mode-toggle {
  border: 1px solid var(--wi-border) !important;
  border-radius: 6px !important;
  background: #1a1108 !important;
}

.mode-toggle :deep(.v-btn) {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.05em !important;
  background: transparent !important;
}

.mode-toggle :deep(.v-btn .v-btn__overlay) {
  background-color: var(--wi-gold) !important;
  opacity: 0 !important;
}

.mode-toggle :deep(.v-btn--active) {
  background: linear-gradient(180deg, #d4a233, #a07020) !important;
  color: #1a1209 !important;
}

.mode-toggle :deep(.v-btn--active .v-btn__overlay) {
  opacity: 0 !important;
}

.mode-toggle :deep(.v-btn--active .v-btn__content) {
  color: #1a1209 !important;
}

/* Quick amounts */
.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.quick-chip {
  background: rgba(200,150,42,0.12) !important;
  border: 1px solid var(--wi-border) !important;
  color: var(--wi-gold) !important;
  font-family: var(--wi-font-heading) !important;
  cursor: pointer;
}

.quick-chip:hover {
  background: rgba(200,150,42,0.22) !important;
}

.clear-chip {
  color: var(--wi-text-muted) !important;
}

/* Notes & errors */
.chest-dialog-note {
  font-family: var(--wi-font-body);
  font-size: 0.8rem;
  color: var(--wi-text-muted);
  font-style: italic;
  margin-top: 12px;
}

.chest-dialog-error {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.85rem;
  margin-top: 8px;
}

/* Actions */
.chest-dialog-actions {
  padding: 12px 20px !important;
}

.cancel-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
}

.confirm-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
}
</style>
