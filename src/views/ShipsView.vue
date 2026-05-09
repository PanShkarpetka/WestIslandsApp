<template>
  <v-container class="ships-container">
    <div class="ships-header">
      <div class="ships-header-title">
        <v-icon class="mr-2" color="primary">mdi-sail-boat</v-icon>
        <h1 class="wi-heading">Флотилія острову</h1>
      </div>
      <v-btn v-if="userStore.isAdmin" class="commission-btn" @click="openNewShipDialog">
        <v-icon start>mdi-plus</v-icon>
        Спорядити судно
      </v-btn>
    </div>

    <v-row class="mt-2">
      <ShipCard
        v-for="ship in sortedShips"
        :key="ship.id"
        :ship="ship"
        :is-admin="userStore.isAdmin"
        @edit="editShip"
      />
    </v-row>

    <ShipEditor
      v-model:dialog="editorDialog"
      :ship="editingShip"
      :ships="shipStore.ships"
      :is-admin="userStore.isAdmin"
      @save="saveShip"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../store/userStore';
import { useShipStore } from '../store/shipStore';
import ShipCard from '../components/ShipCard.vue';
import ShipEditor from '../components/ShipDetailsDialog.vue';

const userStore = useUserStore();
const shipStore = useShipStore();
const editorDialog = ref(false);
const editingShip = ref({ name: '', type: '', speedUnit: 0, capacity: 0 });

onMounted(() => shipStore.subscribeToShips());

const sortedShips = computed(() => {
  const ships = shipStore.ships.slice();
  if (userStore.isAdmin) {
    return ships.sort((a, b) => {
      if (!!a.visibility && !b.visibility) return -1;
      if (!a.visibility && !!b.visibility) return 1;
      return (b.maxHP || 0) - (a.maxHP || 0);
    });
  }
  return ships.filter(s => !!s.visibility).sort((a, b) => (b.maxHP || 0) - (a.maxHP || 0));
});

function openNewShipDialog() {
  editingShip.value = {
    name: '', type: '', speedUnit: 0, capacity: 0,
    hp: 0, hpMax: 0, ac: 0, hullDiceUsed: 0,
    crewCurrent: 0, passengerCurrent: 0, tonnageCurrent: 0,
    weaponSlotsUsed: 0, weaponSlots: [], hullUpgrade: '',
    ammunition: {
      cannonballs: 0, chain: 0, grapeshot: 0, smokeBombs: 0,
      bolt: 0, flamingBolt: 0, catapultStone: 0,
      salamanderFuel: 0, dragonHeadFuel: 0,
    },
    size: '', description: '', image: '',
  };
  editorDialog.value = true;
}

function editShip(ship) {
  editingShip.value = { ...ship };
  editorDialog.value = true;
}

async function saveShip(updatedShip) {
  await shipStore.saveShip(updatedShip);
  editorDialog.value = false;
}
</script>

<style scoped>
.ships-container {
  padding-top: 24px;
}

.ships-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--wi-border);
}

.ships-header-title {
  display: flex;
  align-items: center;
}

.commission-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
}
</style>
