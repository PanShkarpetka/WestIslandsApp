<template>
  <v-container class="ships-container">
    <WiPageHeader title="Флотилія острову" icon="mdi-sail-boat">
      <template #actions>
        <WiActionButton v-if="isAdmin" prepend-icon="mdi-plus" @click="openNewShipDialog">
          Спорядити судно
        </WiActionButton>
      </template>
    </WiPageHeader>

    <WiPanel v-if="!sortedShips.length">
      <WiEmptyState title="Кораблі відсутні" icon="mdi-sail-boat-sink" />
    </WiPanel>

    <v-row v-else class="mt-2">
      <ShipCard
        v-for="ship in sortedShips"
        :key="ship.id"
        :ship="ship"
        :is-admin="isAdmin"
        @edit="editShip"
      />
    </v-row>

    <ShipEditor
      v-model:dialog="editorDialog"
      :ship="editingShip"
      :ships="shipStore.ships"
      :is-admin="isAdmin"
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
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'

const userStore = useUserStore();
const shipStore = useShipStore();
const editorDialog = ref(false);
const editingShip = ref({ name: '', type: '', speedUnit: 0, capacity: 0 });
const isAdmin = computed(() => userStore.isAdmin ?? false)

onMounted(() => shipStore.subscribeToShips());

const sortedShips = computed(() => {
  const ships = shipStore.ships.slice();
  if (isAdmin.value) {
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
  padding-bottom: 40px;
}
</style>
