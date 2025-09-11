<template>
  <v-col cols="12" sm="6" md="6">
    <v-card class="ship-card" @click="openDetails">
      <div class="ship-image-wrapper">
        <v-img
            :src="ship.imageUrl || '/images/ships/ship-default.png'"
            height="300"
            contain
            class="ship-image"
        >
          <div class="ship-overlay d-flex flex-column justify-end pa-4">
            <div class="text-h6 text-white mb-2">{{ ship.name }}</div>

            <div class="d-flex align-center text-white text-caption mb-2">
              <v-icon size="16" class="me-1">mdi-account-group</v-icon> {{ ship.crewCurrent ?? '-' }}
              <v-icon size="16" class="mx-2">mdi-arm-flex</v-icon> {{ ship.crewMin ?? '-' }}/{{ ship.crewMax ?? '-' }}
              <v-icon size="16" class="mx-2">mdi-human-male</v-icon> {{ ship.passengerMax ?? '-' }}
            </div>

            <div class="d-flex align-center text-white text-caption mb-2">
              <template v-if="(ship.hullDices || 5) <= 8">
                <span v-for="i in (ship.hullDices || 5)" :key="i">
                  <v-icon :color="i <= (ship.hullDiceUsed || 0) ? 'red' : 'green'" size="18" class="me-1">
                    mdi-cube-outline
                  </v-icon>
                </span>
              </template>
              <template v-else>
                <v-icon size="18" color="white" class="me-1">mdi-cube-outline</v-icon>
                <span>{{ ship.hullDices - ship.hullDiceUsed }}</span>/<span>{{ ship.hullDices }}</span>
              </template>
            </div>

            <v-progress-linear
                :model-value="ship.maxHP ? (ship.currentHP / ship.maxHP) * 100 : 0"
                height="8"
                :color="ship.currentHP < ship.maxHP / 2 ? 'red' : 'green'"
                class="mb-1"
            />
            <div class="text-white text-caption mb-2">
              <strong>{{ ship.currentHP }}/{{ ship.maxHP }} HP</strong>
            </div>

            <div class="text-white text-caption mb-1">
              <strong>Тип:</strong> {{ ship.type }}
            </div>
            <div class="text-white text-caption mb-1">
              <strong>Швидкість:</strong> {{ ship.speedMax / 10 }} М/год
            </div>
            <div class="text-white text-caption mb-1">
              <strong>Розмір:</strong> {{ ship.size || '/' }}
            </div>
          </div>
          <div
              v-if="ship.description"
              class="ship-hover-description"
          >
            {{ ship.description }}
          </div>
        </v-img>
      </div>
      <ShipDetailsDialog
          v-model:dialog="dialog"
          :ship="ship"
          :is-admin="isAdmin"
          @save="$emit('edit', $event)"
      />
    </v-card>
  </v-col>
</template>

<script setup>
import { ref } from 'vue';
import ShipDetailsDialog from './ShipDetailsDialog.vue';

const props = defineProps({
  ship: Object,
  isAdmin: Boolean
});
const emit = defineEmits(['edit']);

const dialog = ref(false);
function openDetails() {
  dialog.value = true;
}
</script>

<style scoped>
.ship-card {
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}
.ship-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.ship-image-wrapper {
  background-color: #5b717a;
  height: 300px;
}
.ship-overlay {
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  color: white;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 160px;
}

.ship-image {
  height: 300px;
}
.text-red {
  color: #ff5252;
}
.ship-hover-description {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 16px;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.ship-card:hover .ship-hover-description {
  opacity: 1;
  z-index: 2;
}
</style>
