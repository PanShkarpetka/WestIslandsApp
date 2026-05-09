<template>
  <teleport to="body">
    <div v-if="visible" class="donate-overlay" @click.self="close">
      <div class="donate-modal">
        <div class="donate-header">
          <v-icon class="mr-2" size="18">mdi-hand-coin</v-icon>
          Внесок у збір
        </div>
        <div class="donate-goal-name">{{ goal?.title }}</div>

        <div class="donate-body">
          <div class="donate-field">
            <label class="donate-label">
              <v-icon size="13" class="mr-1">mdi-gold</v-icon>
              Сума (золото)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              v-model.number="amount"
              class="donate-input"
              placeholder="Вкажіть суму"
              @keydown.enter.prevent="saveDonation"
            />
          </div>

          <div v-if="isAdmin" class="donate-field">
            <label class="donate-label">
              <v-icon size="13" class="mr-1">mdi-account</v-icon>
              Від кого (опційно)
            </label>
            <input
              v-model="character"
              class="donate-input"
              placeholder="Напр., Марко / Гільдія Будівничих"
              @keydown.enter.prevent="saveDonation"
            />
          </div>

          <div v-if="error" class="donate-error">
            <v-icon size="13" class="mr-1">mdi-skull-crossbones</v-icon>
            {{ error }}
          </div>
        </div>

        <div class="donate-actions">
          <button class="donate-cancel-btn" :disabled="loading" @click="close">Скасувати</button>
          <button class="donate-confirm-btn" :disabled="loading" @click="saveDonation">
            <v-icon size="14" class="mr-1">mdi-hand-coin</v-icon>
            {{ loading ? 'Збереження…' : 'Підтвердити' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useDonationGoalStore } from '@/store/donationGoalStore'

const props = defineProps({
  visible: { type: Boolean, default: false },
  goal: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
  nickname: { type: String, default: 'Unexpected anonim' },
})
const emit = defineEmits(['update:visible', 'saved'])

const amount = ref(null)
const character = ref('')
const loading = ref(false)
const error = ref('')
const store = useDonationGoalStore()

watch(() => props.visible, v => {
  if (v) { amount.value = null; character.value = ''; error.value = ''; document.body.style.overflow = 'hidden' }
  else document.body.style.overflow = ''
})
onBeforeUnmount(() => { document.body.style.overflow = '' })

async function saveDonation() {
  error.value = ''
  const goalId = props.goal?.id
  if (!goalId) { error.value = 'Немає ідентифікатора цілі.'; return }
  if (!amount.value || Number(amount.value) <= 0) { error.value = 'Вкажіть коректну суму.'; return }
  loading.value = true
  try {
    await store.donate({ goalId, amount: Number(amount.value), character: props.isAdmin ? (character.value?.trim() || null) : props.nickname })
    emit('saved')
    close()
  } catch (e) {
    error.value = e?.message || 'Не вдалося зберегти внесок'
  } finally {
    loading.value = false }
}

function close() { if (!loading.value) emit('update:visible', false) }
</script>

<style scoped>
.donate-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.donate-modal {
  width: min(92vw, 480px);
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-gold);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
}

.donate-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--wi-border);
  background: linear-gradient(180deg, #1f1508, #2c1e0f);
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
}

.donate-goal-name {
  padding: 10px 20px 0;
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--wi-text-muted);
}

.donate-body {
  padding: 16px 20px;
}

.donate-field { margin-bottom: 14px; }

.donate-label {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
  margin-bottom: 6px;
}

.donate-label .v-icon { color: var(--wi-gold) !important; opacity: 0.7; }

.donate-input {
  width: 100%;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--wi-border);
  border-radius: 4px;
  padding: 9px 12px;
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.donate-input:focus { border-color: var(--wi-gold); }

.donate-error {
  display: flex;
  align-items: center;
  color: var(--wi-danger);
  font-size: 0.82rem;
  margin-top: 4px;
}

.donate-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--wi-border);
  background: #1a1108;
}

.donate-cancel-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s;
}
.donate-cancel-btn:hover { color: var(--wi-text); }
.donate-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.donate-confirm-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  border: 1px solid var(--wi-gold);
  border-radius: 4px;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%);
  color: #1a1209;
  font-family: var(--wi-font-heading);
  font-size: 0.75rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.15s;
}
.donate-confirm-btn:hover { filter: brightness(1.1); }
.donate-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: none; }
</style>
