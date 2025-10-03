<template>
  <div>
    <!-- Картка з великою скринею -->
    <v-card
        class="treasury-card rounded-2xl overflow-hidden"
        height="280"
        :elevation="2"
    >
      <!-- Фон-скриня -->
      <div
          class="treasury-bg"
          role="button"
          tabindex="0"
          @click="open()"
          @keydown.enter.prevent="open()"
          @keydown.space.prevent="open()"
      >
        <div class="treasury-overlay" aria-hidden="true"></div>  <!-- НОВЕ -->

        <v-row class="treasury-balance">
          {{ balance }} 🪙
        </v-row>
        <div class="treasury-hint">Натисніть, щоб {{ isAdmin ? 'внести або зняти' : 'внести' }}</div>
      </div>
    </v-card>

    <!-- Модальне вікно -->
    <!-- REPLACE your modal with this -->
    <v-dialog v-model="isOpen" max-width="560">
      <v-card rounded="xl" elevation="2" class="tax-dialog">
        <!-- Header у стилі донатів -->
        <v-sheet color="primary" variant="tonal" class="px-5 py-4 rounded-t-xl d-flex align-center gap-3">
          <v-avatar color="primary" variant="flat" size="36">
            <v-icon icon="mdi-sack" />
          </v-avatar>
          <div class="text-h6">
            {{ mode === 'deposit' ? 'Внесок у скарбницю' : 'Зняття зі скарбниці' }}
          </div>
          <v-spacer />
          <v-chip size="small" color="primary" variant="elevated" class="opacity-90">
            {{ balance }} 🪙
          </v-chip>
        </v-sheet>

        <v-card-text class="pt-5 pb-1 px-5">
          <!-- перемикач режиму для адміна -->
          <div v-if="isAdmin" class="mb-4">
            <v-btn-toggle
                v-model="mode"
                color="primary"
                rounded="xl"
                mandatory
                density="comfortable"
                class="donate-toggle"
            >
              <v-btn value="deposit" prepend-icon="mdi-tray-arrow-down">Внести</v-btn>
              <v-btn value="withdraw" prepend-icon="mdi-tray-arrow-up">Зняти</v-btn>
            </v-btn-toggle>
          </div>

          <!-- Сума -->
          <v-text-field
              v-model.number="amount"
              type="number"
              label="Сума (золото)"
              variant="outlined"
              density="comfortable"
              min="1"
              prefix="🪙"
              :rules="[v => !!v || 'Вкажіть суму', v => v > 0 || 'Більше нуля']"
              hide-details="auto"
          />

          <!-- Швидкі суми як у донатах -->
          <div class="mt-2 mb-4 d-flex flex-wrap gap-2">
            <v-chip
                v-for="n in [5,10,25,50,100]"
                :key="n"
                :text="`+${n}`"
                color="primary"
                variant="tonal"
                size="small"
                @click="amount = (Number(amount) || 0) + n"
            />
            <v-chip
                text="Очистити"
                size="small"
                variant="text"
                @click="amount = null"
            />
          </div>

          <!-- Коментар -->
          <v-textarea
              v-model="comment"
              label="Коментар"
              variant="outlined"
              density="comfortable"
              rows="2"
              auto-grow
              maxlength="500"
              :rules="[v => !!v || 'Вкажіть коментар']"
              hide-details="auto"
          />

          <div class="text-caption mt-3 opacity-70">
            Баланс після операції порахується автоматично. Транзакція з’явиться в списку нижче.
            <b>{{ isLoggedIn ? '' : 'Для операції необхідна авторизація.'}}</b>
          </div>

          <div v-if="error" class="text-error text-body-2 mt-2">{{ error }}</div>
        </v-card-text>

        <v-card-actions class="px-5 pb-5 pt-2">
          <v-btn
              :loading="loading"
              class="primary px-5"
              variant="flat"
              size="large"
              :prepend-icon="mode === 'deposit' ? 'mdi-cash-plus' : 'mdi-cash-minus'"
              @click="submit"
              :disabled="!isLoggedIn"
          >
            Підтвердити
          </v-btn>
          <v-btn variant="text" @click="isOpen = false">
            Скасувати
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useTreasuryStore } from '@/store/treasuryStore';
import { useUserStore } from '@/store/userStore';

const treasury = useTreasuryStore();
const user = useUserStore();

const isOpen = ref(false);
const mode = ref('deposit');
const amount = ref(null);
const comment = ref('');
const loading = ref(false);
const error = ref('');

const isAdmin = computed(() => !!user.isAdmin);
const isLoggedIn = computed(() => user.nickname !== '');
const balance = computed(() => treasury.balance);

function open() {
  mode.value = 'deposit';
  amount.value = null;
  comment.value = '';
  error.value = '';
  isOpen.value = true;
}

async function submit() {
  error.value = '';
  if (!amount.value || amount.value <= 0) {
    error.value = 'Вкажіть коректну суму.';
    return;
  }
  loading.value = true;
  try {
    const payload = {
      amount: Number(amount.value),
      comment: comment.value,
      user: { uid: user.uid, nickname: user.nickname || 'Гравець' }
    };
    if (mode.value === 'withdraw') {
      await treasury.withdraw(payload);
    } else {
      await treasury.deposit(payload);
    }
    isOpen.value = false;
  } catch (e) {
    error.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => treasury.subscribeBalance());
onBeforeUnmount(() => treasury.unsubscribeBalance());
</script>

<style scoped>

.treasury-card{ position:relative; }

/* Зона з фоном-скринею */
.treasury-bg{
  position:relative;
  width:100%;
  height:100%;
  cursor:pointer; outline:0;
  background-image:url(@/images/island/treasury/chest.png);
  background-repeat:no-repeat;
  background-position:right 24px center;
  background-size: 300px;
  display:flex;
  align-items:center;
  justify-content:center;
}

/* Рівномірний напівпрозорий оверлей поверх скрині (без «плями») */
.treasury-overlay{
  position:absolute; inset:0;
  background: rgba(0,0,0,0.08);              /* базова ледь помітна затемненість */
  transition: background 180ms ease-in-out, opacity 180ms ease-in-out;
  pointer-events:none;
}
.treasury-bg:hover .treasury-overlay,
.treasury-bg:focus-visible .treasury-overlay{
  background: rgba(0,0,0,0.18);              /* сильніше, щоб цифра/підпис читались */
}

/* Видимий фокус */
.treasury-bg:focus-visible{
  box-shadow:0 0 0 3px rgba(99,102,241,.6) inset;
  border-radius:16px;
}

/* Велике число по центру */
.treasury-balance{
  margin-left: 10px;
  position:relative;
  z-index:1;
  font-weight:800;
  line-height:1;
  font-size:clamp(48px, 9vw, 112px);
  color:#f6d13b;
  letter-spacing:1px;
  text-align:center;
  text-shadow:0 2px 14px rgba(0,0,0,.35);
  display:flex;
  align-items:baseline;
  gap:.25em;
}
.treasury-bg:hover .treasury-balance,
.treasury-bg:focus-visible .treasury-balance{
  text-shadow:0 3px 18px rgba(0,0,0,.55);
}

/* Підпис знизу, по центру */
.treasury-hint{
  position:absolute;
  z-index:1;
  bottom:12px;
  left:0;
  right:0;
  text-align:center;
  font-size:30px;
  color:#fff;
  opacity:.75;
  text-shadow:0 1px 6px rgba(0,0,0,.6);
  transition: opacity 180ms ease-in-out;
}
.treasury-bg:hover .treasury-hint,
.treasury-bg:focus-visible .treasury-hint{ opacity:1; }

@media (prefers-reduced-motion: reduce){
  .treasury-overlay, .treasury-hint, .treasury-balance{ transition:none; }
}

.primary{ background:#059669; color:#fff; }
.primary:hover{ background:#047857; }
</style>
