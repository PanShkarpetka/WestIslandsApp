<template>
  <v-row justify="space-between" align="center" class="my-4">
    <v-col cols="12">
      <v-card class="pa-6 courier-card" elevation="0" width="100%">
        <v-card-title class="courier-title">
          Чи долетів кур'єр?
          <v-chip v-if="success" color="success" variant="flat" size="small" class="success-badge ml-3">✓ ТАК!</v-chip>
        </v-card-title>
        <v-card-text>
          <v-text-field v-model.number="distanceToTravel" type="number" label="Відстань, милі" :rules="[v => v > 0 || 'Вкажіть відстань більше нуля']"
                        outlined dense />
          <v-text-field v-model.number="speed" type="number" label="Швидкість, фути" outlined dense :rules="[v => v > 0 || 'Вкажіть швидкість більше нуля']" />
          <v-text-field v-model.number="conSaveMod" label="Модифікатор Con Save. Наприклад: (1, 2, 3, -1, -2)" step="1" outlined dense />
          <v-text-field v-model.number="dangerChance" type="number" label="Шанс небезпеки, %. За замовчуванням: 1%" outlined dense :rules="[v => v > 0 || 'Вкажіть не від\'ємний шанс']" />
        </v-card-text>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <v-card-actions class="justify-end">
          <v-btn color="secondary" class="theme-btn" @click="() => handleSend(false)">Потестувати</v-btn>
          <v-tooltip :disabled="!!isLoggedIn" location="top center">
            <template v-slot:activator="{ props }">
              <div v-bind="props" class="d-inline-block">
                <v-btn color="primary" class="theme-btn theme-btn--primary" :disabled="!isLoggedIn" @click="() => handleSend(true)">
                  Відправити
                </v-btn>
              </div>
            </template>
            <span>Авторизуйтеся для відправки кур'єра</span>
          </v-tooltip>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
  <v-row justify="space-between" align="center" class="my-4">
    <v-col cols="12">
      <div class="log-label mb-2">Хроніка подорожі</div>
      <v-card class="pa-6 courier-card courier-log" elevation="0" width="100%">
        <v-textarea
            v-model="cardLogger"
            label="Історія подорожі"
            auto-grow
            readonly
            prepend-icon="mdi-map-marker-distance"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref } from 'vue';
import { useCourierLogStore } from '@/store/courierLogStore.js'
import { didCreatureGetToTarget } from '@/utils/courierDistanceCalculator.js';
import { useUserStore } from "@/store/userStore.js";

const userStore = useUserStore()
const courierLogStore = useCourierLogStore();

const isLoggedIn = userStore.isLoggedIn;

const distanceToTravel = ref();
const speed = ref(30);
const conSaveMod = ref(0);
const dangerChance = ref(5);
const cardLogger = ref('Дорога далека...');
const error = ref('')
const success = ref(false);

const logger = {
  log: function (msg = '') {
    cardLogger.value += '\n' + msg;
  },
  reset: function () {
    cardLogger.value = '';
  },
  save: function (success) {
    courierLogStore.addLog({
      history: cardLogger.value,
      distance: distanceToTravel.value,
      conSaveMod: conSaveMod.value,
      dangerChance: dangerChance.value,
      speed: speed.value,
      character: userStore.nickname || 'невідомо',
      success,
    });
  }
}

function handleSend(save = false) {
  logger.reset()
  success.value = false;

  if (distanceToTravel.value <= 0 || speed.value <= 0 || dangerChance.value <= 0) {
    error.value = 'Задано не коректні дані. Схоже, що це шпигуни Хараду скоїли диверсію...'
    return;
  }
  try {
    success.value = didCreatureGetToTarget(logger, distanceToTravel.value, speed.value, conSaveMod.value, dangerChance.value)
    if (save) logger.save(success.value);
  } catch (e) {
    error.value = e?.message || 'Щось пішло не так. Напевно це все через Харад...'
  }
}
</script>

<style scoped>
.courier-card {
  background: linear-gradient(135deg, rgba(14, 9, 4, 0.9), rgba(26, 17, 8, 0.85)) !important;
  border: 1px solid var(--wi-border) !important;
  border-radius: 16px !important;
}

.courier-title {
  font-family: var(--wi-font-heading);
  text-transform: uppercase;
  color: var(--wi-gold);
  font-size: 0.88rem !important;
  letter-spacing: 0.06em;
  padding-bottom: 8px;
}

.log-label {
  font-family: var(--wi-font-heading);
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--wi-text-muted);
  letter-spacing: 0.08em;
}

.courier-log :deep(.v-textarea textarea) {
  font-family: monospace;
  font-size: 0.78rem;
  color: var(--wi-text-muted);
  background: rgba(4, 3, 2, 0.6) !important;
  line-height: 1.6;
}

.error-msg {
  color: #ef4444;
  font-style: italic;
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  padding: 8px 16px;
  margin: 0;
}

.success-badge {
  animation: pulse-success 1.4s ease-in-out 3;
}

@keyframes pulse-success {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

.theme-btn {
  font-family: var(--wi-font-heading);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.78rem;
}

.theme-btn--primary {
  background-color: var(--wi-gold) !important;
  color: #0e0904 !important;
}
</style>
