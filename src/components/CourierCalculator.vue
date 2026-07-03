<template>
  <div class="courier-layout">
    <WiPanel title="Чи долетів кур'єр?" icon="mdi-bird">
      <template #actions>
          <v-chip v-if="success" color="success" variant="flat" size="small" class="success-badge ml-3">✓ ТАК!</v-chip>
      </template>
        <div class="courier-fields">
          <v-text-field v-model.number="distanceToTravel" type="number" label="Відстань, милі" :rules="[v => v > 0 || 'Вкажіть відстань більше нуля']"
                        outlined dense />
          <v-text-field v-model.number="speed" type="number" label="Швидкість, фути" outlined dense :rules="[v => v > 0 || 'Вкажіть швидкість більше нуля']" />
          <v-text-field v-model.number="conSaveMod" label="Модифікатор Con Save. Наприклад: (1, 2, 3, -1, -2)" step="1" outlined dense />
          <v-text-field v-model.number="dangerChance" type="number" label="Шанс небезпеки, %. За замовчуванням: 1%" outlined dense :rules="[v => v > 0 || 'Вкажіть не від\'ємний шанс']" />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <div class="courier-actions">
          <WiActionButton variant="tonal" tone="sea" @click="() => handleSend(false)">Потестувати</WiActionButton>
          <v-tooltip :disabled="!!isLoggedIn" location="top center">
            <template v-slot:activator="{ props }">
              <div v-bind="props" class="d-inline-block">
                <WiActionButton :disabled="!isLoggedIn" @click="() => handleSend(true)">
                  Відправити
                </WiActionButton>
              </div>
            </template>
            <span>Авторизуйтеся для відправки кур'єра</span>
          </v-tooltip>
        </div>
    </WiPanel>

    <WiPanel title="Хроніка подорожі" icon="mdi-map-marker-distance" class="courier-log">
        <v-textarea
            v-model="cardLogger"
            label="Історія подорожі"
            auto-grow
            readonly
            prepend-icon="mdi-map-marker-distance"
        />
    </WiPanel>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useCourierLogStore } from '@/store/courierLogStore.js'
import { didCreatureGetToTarget } from '@/utils/courierDistanceCalculator.js';
import { useUserStore } from "@/store/userStore.js";
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiPanel from '@/components/ui/WiPanel.vue'

const userStore = useUserStore()
const courierLogStore = useCourierLogStore();

const isLoggedIn = computed(() => userStore.isLoggedIn ?? false)

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
.courier-layout {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.courier-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.courier-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

@media (max-width: 700px) {
  .courier-fields { grid-template-columns: 1fr; }
  .courier-actions { justify-content: stretch; }
  .courier-actions > * { flex: 1 1 auto; }
}
</style>
