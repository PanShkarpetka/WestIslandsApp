<!-- components/DonationGoalDialog.vue -->
<template>
  <teleport to="body">
    <div v-if="visible" class="overlay" @click.self="close">
      <div class="modal">
        <h2 class="modal-title">
          Пожертва на: <span class="accent">{{ goal?.title }}</span>
        </h2>

        <div class="field">
          <label>Сума, ₴</label>
          <input
              type="number"
              min="1"
              step="1"
              v-model.number="amount"
              class="input"
              placeholder="Вкажіть суму"
              @keydown.enter.prevent="saveDonation"
          />
        </div>

        <div v-if="isAdmin" class="field">
          <label>Нікнейм (від кого донат, опційно)</label>
          <input
              v-model="character"
              class="input"
              placeholder="Напр., Марко / Гільдія Будівничих"
              @keydown.enter.prevent="saveDonation"
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions">
          <button class="btn primary" :disabled="loading" @click="saveDonation">
            {{ loading ? 'Збереження…' : 'Підтвердити' }}
          </button>
          <button class="btn ghost" :disabled="loading" @click="close">Закрити</button>
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
  userId: { type: String, default: null }
})
const emit = defineEmits(['update:visible', 'saved'])

const amount = ref(null)
const character = ref('')
const loading = ref(false)
const error = ref('')

const store = useDonationGoalStore()

// Лочимо скрол сторінки під модалкою
watch(() => props.visible, v => {
  if (v) {
    amount.value = null
    character.value = ''
    error.value = ''
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
onBeforeUnmount(() => { document.body.style.overflow = '' })

async function saveDonation() {
  error.value = ''
  const goalId = props.goal?.id
  if (!goalId) { error.value = 'Немає ідентифікатора цілі.'; return }
  if (!amount.value || Number(amount.value) <= 0) { error.value = 'Вкажіть коректну суму.'; return }

  loading.value = true
  try {
    await store.donate({
      goalId,
      amount: Number(amount.value),
      character: props.isAdmin ? (character.value?.trim() || null) : null,
      userId: props.userId || null
    })
    emit('saved')
    close()
  } catch (e) {
    error.value = e?.message || 'Не вдалося зберегти пожертву'
  } finally {
    loading.value = false
  }
}

function close() {
  if (!loading.value) emit('update:visible', false)
}
</script>

<style scoped>
.overlay{
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
}
.modal{
  width: min(92vw, 520px);
  background: #fff; border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 30px 70px rgba(10,31,68,.25), 0 6px 18px rgba(10,31,68,.15);
}
.modal-title{ margin: 0 0 12px; font-size: 20px; font-weight: 800; color:#0f172a; }
.accent{ font-weight: 700; }

.field{ margin-top: 12px; }
.field label{ display:block; font-size: 13px; color:#475569; margin-bottom:6px; }
.input{
  width: 100%; border:1px solid #cbd5e1; border-radius: 12px;
  padding: 10px 12px; outline: none;
}
.input:focus{ border-color:#64748b; }

.error{ color:#dc2626; font-size: 13px; margin-top: 8px; }

.actions{ display:flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.btn{ padding:10px 14px; border-radius:12px; font-weight:700; border:0; cursor:pointer; }
.btn.primary{ background:#059669; color:#fff; }
.btn.primary:hover{ background:#047857; }
.btn.ghost{ background:transparent; color:#334155; }
.btn.ghost:hover{ background:#f1f5f9; }
.btn[disabled]{ opacity:.6; cursor:not-allowed; }
</style>
