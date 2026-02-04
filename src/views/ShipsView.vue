<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Флотилія острову</h1>
      </v-col>
      <v-col cols="12" sm="6" class="text-sm-end">
        <v-btn v-if="userStore.isAdmin" color="primary" @click="openNewShipDialog">
          <v-icon start>mdi-plus</v-icon>
          Додати корабель
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
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

onMounted(() => {
  shipStore.subscribeToShips();
})

const sortedShips = computed(() => {
  const ships = shipStore.ships.slice()

  if (userStore.isAdmin) {
    // показати спочатку видимі, потім приховані, всередині сортувати по maxHP
    return ships.sort((a, b) => {
      if ((!!a.visibility && !b.visibility)) return -1
      if ((!a.visibility && !!b.visibility)) return 1
      return (b.maxHP || 0) - (a.maxHP || 0)
    })
  } else {
    // для гравців показуємо лише видимі, і сортуємо по maxHP
    return ships
        .filter(ship => !!ship.visibility)
        .sort((a, b) => (b.maxHP || 0) - (a.maxHP || 0))
  }
})

function openNewShipDialog() {
  editingShip.value = {
    name: '',
    type: '',
    speedUnit: 0,
    capacity: 0,
    hp: 0,
    hpMax: 0,
    ac: 0,
    hullDiceUsed: 0,
    crewCurrent: 0,
    passengerCurrent: 0,
    tonnageCurrent: 0,
    weaponSlotsUsed: 0,
    weaponSlots: [],
    hullUpgrade: '',
    ammunition: {
      cannonballs: 0,
      chain: 0,
      grapeshot: 0,
      smokeBombs: 0,
      bolt: 0,
      flamingBolt: 0,
      catapultStone: 0,
      salamanderFuel: 0,
      dragonHeadFuel: 0
    },
    size: '',
    description: '',
    image: ''
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
