<template>
  <article class="bounty-card" :class="{ 'bounty-complete': isCompleted, 'bounty-locked': isLocked }">

    <!-- Gold coin bg art -->
    <div class="bounty-bg-art" aria-hidden="true" />

    <!-- Admin lock -->
    <button v-if="isAdmin && !isCompleted" class="bounty-lock-btn" title="Заблокувати збір" @click.stop="onToggleLockClick">
      <v-icon size="14">mdi-lock</v-icon>
    </button>

    <div class="bounty-content">
      <!-- Head -->
      <div class="bounty-head">
        <h3 class="bounty-title">{{ goal.title }}</h3>
        <span class="bounty-chip" :class="`chip-${goal.type}`">{{ categoryLabel }}</span>
      </div>

      <p v-if="goal.description" class="bounty-desc">{{ goal.description }}</p>

      <!-- Progress -->
      <div class="bounty-progress">
        <div class="bounty-bar-wrap">
          <div class="bounty-bar-fill" :style="{ width: progress + '%' }" />
        </div>
        <div class="bounty-nums">
          <span class="wi-number">{{ goal.currentAmount }}</span>
          <span class="bounty-sep">/</span>
          <span class="wi-number">{{ goal.targetAmount }}</span>
          <span class="bounty-unit">зм</span>
          <span class="bounty-pct">{{ progress }}%</span>
        </div>
        <div v-if="!isCompleted && !isLocked" class="bounty-left">
          Залишилось: {{ left }} зм
        </div>
      </div>

      <!-- Meta -->
      <div class="bounty-meta">
        <span>
          <v-icon size="11" class="mr-1">mdi-feather</v-icon>
          {{ goal.createdBy }}
        </span>
        <span>{{ createdAtText }}</span>
      </div>

      <!-- CTA -->
      <div class="bounty-cta">
        <span class="bounty-tooltip-wrap" :class="{ 'has-tip': !!donateDisabledReason && isDonateDisabled }" :data-tip="donateDisabledReason">
          <button class="bounty-donate-btn" @click.stop="openDonate" :disabled="isDonateDisabled">
            <v-icon size="14" class="mr-1">mdi-hand-coin</v-icon>
            Зробити внесок
          </button>
        </span>
        <span v-if="isCompleted" class="bounty-state-done">
          <v-icon size="13" class="mr-1">mdi-check-decagram</v-icon>
          Збір завершено
        </span>
        <span v-else-if="isLocked" class="bounty-state-locked">
          <v-icon size="13" class="mr-1">mdi-lock</v-icon>
          Заблоковано
        </span>
      </div>
    </div>

    <!-- Completed stamp -->
    <div v-if="isCompleted" class="bounty-stamp">ВИКОНАНО</div>

    <DonationGoalDialog
      v-model:visible="showDonate"
      :key="goal.id"
      :goal="goal"
      :isAdmin="props.isAdmin"
      :nickname="props.nickname"
      @saved="onDonationSaved"
    />

    <teleport to="body">
      <div v-if="toastVisible" class="bounty-toast" role="status" aria-live="polite">
        <v-icon size="14" class="mr-1">mdi-check</v-icon>
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
const goal = toRef(props, 'goal')
const progress = computed(() => {
  const t = goal.value.targetAmount || 0
  const c = Math.min(goal.value.currentAmount || 0, t)
  return t ? Math.round((c / t) * 100) : 0
})
const createdAtText = computed(() => goal.value.createdAt?.toDate().toLocaleString())
const left = computed(() => Math.max((goal.value.targetAmount || 0) - (goal.value.currentAmount || 0), 0))
const categoryLabel = computed(() => ({ building: 'Будівництво', other: 'Інше', general: 'Загальний' }[goal.value.type] || goal.value.type))
const isLocked = computed(() => goal.value.status === 'locked')
const isCompleted = computed(() => Number(goal.value.targetAmount) <= Number(goal.value.currentAmount))
const isDonateDisabled = computed(() => !props.isLoggedIn || isCompleted.value || isLocked.value)
const donateDisabledReason = computed(() => {
  if (!props.isLoggedIn) return 'Залогіньтеся для внеску'
  if (isCompleted.value) return 'Збір завершено'
  if (isLocked.value) return 'Збір заблоковано'
  return ''
})

async function onToggleLockClick() {
  try {
    await store.toggleLockGoal(goal.value.id, isLocked.value ? 'unlocked' : 'locked')
  } catch (e) {
    console.error('Не вдалось заблокувати збір:', e)
  }
}

function openDonate() { showDonate.value = true }

const toastVisible = ref(false)
const toastText = ref('')
let toastTimer = null
function showToast(text, ms = 2500) {
  toastText.value = text; toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, ms)
}
onBeforeUnmount(() => clearTimeout(toastTimer))
function onDonationSaved() { showDonate.value = false; showToast('Дякуємо! Внесок збережено.') }
</script>

<style scoped>
/* ── Bounty board card ──────────────────────────────────────── */
.bounty-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.5);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.bounty-card:hover {
  border-color: rgba(200, 150, 42, 0.5);
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
}

.bounty-card.bounty-complete { opacity: 0.75; }

/* Coin bg art */
.bounty-bg-art {
  position: absolute;
  inset: 0;
  background: url('@/images/donations/gold-bg.png') no-repeat right center / 480px auto;
  pointer-events: none;
  z-index: 0;
  opacity: 0.06;
}

/* Left fade scrim */
.bounty-card::before {
  content: '';
  position: absolute;
  inset: 0 30% 0 0;
  background: linear-gradient(to right, rgba(26,18,9,0.98), rgba(26,18,9,0.6), transparent);
  pointer-events: none;
  z-index: 1;
}

.bounty-content {
  position: relative;
  z-index: 2;
}

/* Admin lock btn */
.bounty-lock-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--wi-border);
  border-radius: 4px;
  padding: 4px 7px;
  cursor: pointer;
  color: var(--wi-text-muted);
  transition: color 0.15s, border-color 0.15s;
}
.bounty-lock-btn:hover { color: var(--wi-gold); border-color: var(--wi-gold); }

/* Head */
.bounty-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.bounty-title {
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  letter-spacing: 0.04em;
  color: var(--wi-gold);
  margin: 0;
  line-height: 1.3;
  text-shadow: 0 0 8px rgba(200,150,42,0.2);
}

.bounty-chip {
  flex-shrink: 0;
  font-family: var(--wi-font-heading);
  font-size: 0.65rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 3px;
}

.chip-building {
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.15);
  border: 1px solid rgba(90, 138, 60, 0.3);
}

.chip-general, .chip-other {
  color: var(--wi-info);
  background: rgba(58, 96, 128, 0.15);
  border: 1px solid rgba(58, 96, 128, 0.3);
}

/* Desc */
.bounty-desc {
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--wi-text-muted);
  line-height: 1.4;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Progress */
.bounty-progress { margin-bottom: 10px; }

.bounty-bar-wrap {
  height: 8px;
  background: rgba(90, 62, 32, 0.4);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(90, 62, 32, 0.5);
  margin-bottom: 6px;
}

.bounty-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #a07020, #d4a233, #e8b84b);
  border-radius: 4px;
  transition: width 0.4s ease;
  box-shadow: 0 0 6px rgba(200,150,42,0.4);
}

.bounty-nums {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 0.82rem;
  color: var(--wi-text);
}

.bounty-sep { color: var(--wi-text-muted); }
.bounty-unit {
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  font-size: 0.75rem;
}

.bounty-pct {
  margin-left: auto;
  font-family: var(--wi-font-number);
  font-size: 0.85rem;
  color: var(--wi-gold);
}

.bounty-left {
  font-family: var(--wi-font-body);
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  font-style: italic;
  margin-top: 2px;
}

/* Meta */
.bounty-meta {
  display: flex;
  gap: 12px;
  font-family: var(--wi-font-body);
  font-size: 0.72rem;
  color: var(--wi-text-muted);
  margin-bottom: 10px;
}

.bounty-meta .v-icon { color: var(--wi-gold) !important; opacity: 0.6; }

/* CTA */
.bounty-cta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bounty-donate-btn {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
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

.bounty-donate-btn:hover { filter: brightness(1.1); }
.bounty-donate-btn:disabled { opacity: 0.45; cursor: not-allowed; filter: none; }

.bounty-state-done {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-success);
}

.bounty-state-locked {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

/* Completed stamp */
.bounty-stamp {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-20deg);
  font-family: var(--wi-font-heading);
  font-size: 2.2rem;
  letter-spacing: 0.15em;
  color: var(--wi-success);
  opacity: 0.15;
  border: 4px solid var(--wi-success);
  padding: 4px 14px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 3;
  white-space: nowrap;
}

/* Tooltip */
.bounty-tooltip-wrap { position: relative; display: inline-block; }
.bounty-tooltip-wrap.has-tip:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #0f0a04;
  color: var(--wi-text);
  border: 1px solid var(--wi-border);
  padding: 5px 10px;
  border-radius: 4px;
  white-space: nowrap;
  font-size: 12px;
  z-index: 10;
}

/* Toast */
.bounty-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background: #0f0a04;
  color: var(--wi-text);
  border: 1px solid var(--wi-gold);
  padding: 10px 18px;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 11000;
  font-family: var(--wi-font-heading);
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
}
</style>
