<template>
  <article class="card" :aria-disabled="isCompleted || isLocked">
    <!-- bg art layer -->
    <div
        class="bg-art"
        :class="isCompleted ? 'completed' : 'ongoing'"
        aria-hidden="true"
    ></div>

    <!-- admin actions -->
    <div v-if="isAdmin" class="card-actions">
      <button
          class="icon-btn"
          title="Заблокувати збір"
          v-if="!isCompleted"
          @click.stop="onToggleLockClick"
      >🔒</button>
    </div>

    <!-- content -->
    <div class="card-content">
      <div class="card-head">
        <h3 class="title">{{ goal.title }}</h3>
        <span class="chip" :data-variant="goal.type">{{ categoryLabel }}</span>
      </div>

      <p class="desc" v-if="goal.description">{{ goal.description }}</p>

      <div class="progress">
        <div class="bar">
          <div class="fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="nums">
          <span><strong>{{ goal.currentAmount }}</strong> / {{ goal.targetAmount }} ₴</span>
          <span class="pct">{{ progress }}%</span>
        </div>
        <div class="left" v-if="!isCompleted && !isLocked">Залишилось: {{ left }} ₴</div>
      </div>

      <div class="meta">
        <span>Автор: {{ goal.createdBy }}</span>
        <span>Створено: {{ createdAtText }}</span>
      </div>

      <div class="cta">
        <span
            class="tooltip"
            :class="{ 'has-tip': !!donateDisabledReason && isDonateDisabled }"
            :data-tip="donateDisabledReason"
        >
          <button class="primary" @click.stop="openDonate" :disabled="isDonateDisabled">Задонатити</button>
        </span>
          <span class="state" v-if="isCompleted">✅ Збір завершено</span>
        <span class="state warn" v-else-if="isLocked">🔒 Заблоковано</span>
      </div>
    </div>

    <!-- Діалог пожертви -->
    <DonationGoalDialog
        v-model:visible="showDonate"
        :key="goal.id"
        :goal="goal"
        :isAdmin="props.isAdmin"
        :nickname="props.nickname"
        @saved="onDonationSaved"
    />

    <!-- Toast -->
    <teleport to="body">
      <div v-if="toastVisible" class="toast" role="status" aria-live="polite">
        {{ toastText }}
      </div>
    </teleport>
  </article>
</template>

<script setup>
import { ref, toRef, computed, onBeforeUnmount } from 'vue'
import DonationGoalDialog from '@/components/DonationGoalDialog.vue'
import { useDonationGoalStore } from '@/store/donationGoalStore'

const store = useDonationGoalStore()
const showDonate = ref(false)
const props = defineProps({
  goal: { type: Object, required: true },
  isAdmin: { type: Boolean, default: false },
  isLoggedIn: { type: Boolean, default: false },
  nickname: { type: String, default: 'Unexpected anonim' },
})
const goal = toRef( props, "goal" );
const progress = computed(() => {
  const t = goal.value.targetAmount || 0
  const c = Math.min(goal.value.currentAmount || 0, t)
  return t ? Math.round((c / t) * 100) : 0
})
const createdAtText = computed(() => goal.value.createdAt?.toDate().toLocaleString())

const left = computed(() => Math.max((goal.value.targetAmount || 0) - (goal.value.currentAmount || 0), 0))

const categoryLabel = computed(() => {
  const m = { building: 'Будівництво', other: 'Інше' }
  return m[goal.value.type] || goal.value.type
})

const isLocked = computed(() => goal.value.status === 'locked')
const isCompleted = computed(() => Number(goal.value.targetAmount) <= Number(goal.value.currentAmount))
const isDonateDisabled = computed(() =>
    !props.isLoggedIn || isCompleted.value || isLocked.value
)
async function onToggleLockClick() {
  try {
    await store.toggleLockGoal(goal.value.id, isLocked.value ? 'unlocked' : 'locked');
  } catch (e) {
    console.error('Не вдалось заблокувати збір:', e)
  }
}

function openDonate() { showDonate.value = true }
const toastVisible = ref(false)
const toastText = ref('')
let toastTimer = null

function showToast(text, ms = 2500) {
  toastText.value = text
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, ms)
}

onBeforeUnmount(() => clearTimeout(toastTimer))

function onDonationSaved() {
  showDonate.value = false
  showToast('Дякуємо! Пожертву збережено.')
}
const donateDisabledReason = computed(() => {
  if (!props.isLoggedIn) return 'Залогіньтеся для донату'
  if (isCompleted.value) return 'Збір закрито'
  if (isLocked.value) return 'Збір заблоковано'
  return ''
})

</script>

<style scoped>
.card {
  position: relative; overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f7fafc 100%);
  border: 1px solid #e6edf2; border-radius: 16px; padding: 16px;
  box-shadow: 0 4px 18px rgba(10,31,68,0.06);
  cursor: pointer;
}

/* Легке затемнення всієї картки лише коли вона реально disabled */
.card[aria-disabled="true"] { opacity: .9; }

/* ===== BG ART LAYER ===== */
.bg-art {
  position: absolute; inset: 0;
  background: url('@/assets/donations/gold-bg.png') no-repeat right center / 520px auto;
  pointer-events: none; z-index: 0;
}
.bg-art.ongoing { opacity: .98; filter: saturate(1.1) contrast(1.05); }
.bg-art.completed { opacity: .25; filter: saturate(.8) contrast(.9); }

/* Додатковий «скрім» для читабельності зліва */
.card::before{
  content:""; position:absolute; inset:0 40% 0 0;
  background: linear-gradient(to right, rgba(255,255,255,.98), rgba(255,255,255,.7), transparent);
  pointer-events:none; z-index: 1;
}

/* CONTENT ABOVE BG */
.card-content { position: relative; z-index: 2; }

.card-actions {
  position: absolute; bottom: 8px; right: 8px; display: flex; gap: 6px;
  background: rgba(255,255,255,.6); backdrop-filter: blur(6px); padding: 6px; border-radius: 12px;
  z-index: 3;
}
.icon-btn { border: 0; background: #fff; border-radius: 10px; padding: 6px 8px; cursor: pointer; }
.icon-btn:hover { background: #f1f5f9; }
.icon-btn.danger:hover { background: #ffe8e8; }

.card-head { display:flex; align-items:center; justify-content: space-between; gap: 12px; }
.title { font-size: 18px; font-weight: 700; margin: 0; }

.chip {
  padding: 6px 10px; border-radius: 999px; font-size: 12px; border: 1px solid #e2e8f0; background: #fff;
}
.chip[data-variant="building"] { border-color:#cce1d4; background:#e9f7ef; }
.chip[data-variant="other"] { border-color:#e6d8ff; background:#f4edff; }

.desc { color:#475569; margin:.25rem 0 .5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow:hidden; }

.progress .bar { height: 10px; background:#edf2f7; border-radius: 999px; overflow:hidden; }
.progress .fill { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); }
.progress .nums { display:flex; justify-content: space-between; margin-top: 6px; font-size: 14px; }
.progress .pct { font-weight: 700; }
.left { font-size: 12px; color:#475569; margin-top: 2px; }

.meta { display:flex; gap: 16px; font-size: 12px; color:#64748b; margin-top: 8px; }

.cta { margin-top: 12px; display:flex; align-items:center; gap: 10px; }
.primary {
  height: 40px; padding: 0 14px; border: 0; border-radius: 12px; cursor: pointer;
  background: #2563eb; color:#fff; font-weight: 700;
}
.primary:disabled { opacity: .6; cursor: not-allowed; }
.state { font-size: 14px; }
.state.warn { color:#9a6700; }
.toast{
  position: fixed;
  left: 50%; bottom: 24px; transform: translateX(-50%);
  background: #0f172a; color:#fff;
  padding: 10px 14px; border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
  z-index: 11000;
  font-weight: 700; font-size: 14px;
}
/* Tooltip wrapper */
.tooltip { position: relative; display: inline-block; }

/* Показуємо підказку тільки коли є клас has-tip і є hover */
.tooltip.has-tip:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1;
  box-shadow: 0 8px 20px rgba(0,0,0,.18);
  z-index: 5;
}
.tooltip.has-tip:hover::before {
  content: "";
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #0f172a;
  z-index: 5;
}
</style>

