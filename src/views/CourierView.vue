<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Чи долетів кур’єр?
          <span :hidden="!success" class="text-h5 text-green">ТАК!</span>
        </h1>
      </v-col>
    </v-row>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12">
        <v-card class="pa-6" elevation="4" width="100%">
          <v-card-text>
            <v-text-field v-model.number="distanceToTravel" type="number" label="Відстань, милі" :rules="[v => v > 0 || 'Вкажіть відстань більше нуля']"
                          outlined dense />
            <v-text-field v-model.number="speed" type="number" label="Швидкість, фути" outlined dense :rules="[v => v > 0 || 'Вкажіть швидкість більше нуля']" />
            <v-text-field v-model.number="conSaveMod" label="Модифікатор Con Save. Наприклад: (1, 2, 3, -1, -2)" step="1" outlined dense />
            <v-text-field v-model.number="dangerChance" type="number" label="Шанс небезпеки, %. За замовчуванням: 1%" outlined dense :rules="[v => v > 0 || 'Вкажіть не від\'ємний шанс']" />
          </v-card-text>
          <p v-if="error" class="error">{{ error }}</p>
          <v-card-actions class="justify-end">
            <v-btn color="secondary" @click="() => handleSend(false)">Потестувати</v-btn>
            <v-tooltip :disabled="!!isLoggedIn" location="top center">
              <template v-slot:activator="{ props }">
                <div v-bind="props" class="d-inline-block">
                  <v-btn color="primary" :disabled="!isLoggedIn" @click="() => handleSend(true)">
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
        <v-card class="pa-6" elevation="4" width="100%">
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
  </v-container>

</template>

<script setup>
import { ref } from 'vue';
import { useCourierLogStore } from '@/store/courierLogStore.js'
import { didCreatureGetToTarget } from '@/utils/courierDistanceCalculator.js';
import {useUserStore} from "@/store/userStore.js";

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
.error{ color:#dc2626; font-size: 15px; margin-top: 8px; }

</style>
