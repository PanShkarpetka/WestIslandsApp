<template>
  <v-dialog v-model="dialog" max-width="1000px">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon class="me-2">mdi-sail-boat</v-icon>
        {{ editedShip.name }}
      </v-card-title>
      <v-card-text>
        <v-container fluid>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="editedShip.name" label="Name" prepend-icon="mdi-rename-box" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.currentHP" label="Current HP" type="number" prepend-icon="mdi-heart" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.ac" label="AC" type="number" prepend-icon="mdi-shield" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.hullDiceUsed" label="Hull Dice Used" type="number" prepend-icon="mdi-cube-outline" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.crewCurrent" label="Crew Current" type="number" prepend-icon="mdi-account-group" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.passengerCurrent" label="Passenger Current" type="number" prepend-icon="mdi-human-male" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.tonnageCurrent" label="Tonnage Current" type="number" prepend-icon="mdi-weight" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.weaponSlotsUsed" label="Weapon Slots Used" type="number" prepend-icon="mdi-crosshairs" :readonly="!isAdmin" />
              <v-textarea v-model="editedShip.description" label="Description" auto-grow rows="2" prepend-icon="mdi-note-text" :readonly="!isAdmin" />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field v-model="editedShip.type" label="Type" prepend-icon="mdi-sail-boat" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.maxHP" label="Max HP" type="number" prepend-icon="mdi-heart" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.hullDices" label="Hull Dice (Max)" type="number" prepend-icon="mdi-cube" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.crewMin" label="Min Crew" type="number" prepend-icon="mdi-account" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.crewMax" label="Max Crew" type="number" prepend-icon="mdi-account-group" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.passengerMax" label="Max Passengers" type="number" prepend-icon="mdi-human-male" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.tonnageMax" label="Max Tonnage" type="number" prepend-icon="mdi-weight" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.damageThreshold" label="Damage Threshold" type="number" prepend-icon="mdi-shield-half-full" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.weaponSlotsMax" label="Max Weapon Slots" type="number" prepend-icon="mdi-crosshairs" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.initiative" label="Initiative" type="number" prepend-icon="mdi-run-fast" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.sailStations" label="Sail Stations" type="number" prepend-icon="mdi-flag-variant" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.speedUnit" label="Speed Unit" type="number" prepend-icon="mdi-speedometer" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.speedMax" label="Max Speed" type="number" prepend-icon="mdi-rocket" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.size" label="Size" prepend-icon="mdi-ruler-square" :readonly="!isAdmin" />
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false">Close</v-btn>
        <v-btn color="primary" @click="saveChanges" v-if="isAdmin">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script setup>
import { ref, watch } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useUserStore } from '../store/userStore'
import { useLogStore } from '../store/logStore'

const props = defineProps({
  dialog: Boolean,
  ship: Object,
  isAdmin: Boolean
})
const emit = defineEmits(['update:dialog', 'save'])

const dialog = ref(props.dialog)
const editedShip = ref({ ...props.ship })
const userStore = useUserStore()
const logStore = useLogStore()

watch(() => props.dialog, val => dialog.value = val)
watch(dialog, val => emit('update:dialog', val))
watch(() => props.ship, ship => {
  if (ship) editedShip.value = { ...ship }
})

async function saveChanges() {
  try {
    const shipRef = doc(db, 'ships', editedShip.value.id)

    const changedFields = {}
    const changes = []
    for (const key in editedShip.value) {
      if (editedShip.value[key] !== props.ship[key]) {
        changedFields[key] = editedShip.value[key]
        changes.push(`${key} = ${editedShip.value[key]}`)
      }
    }

    if (Object.keys(changedFields).length > 0) {
      await updateDoc(shipRef, changedFields)

      await logStore.addLog({
        action: `Admin updated ship ${editedShip.value.name}: ${changes.join(', ')}`,
        user: userStore.nickname,
        timestamp: new Date()
      })
    }

    emit('save', editedShip.value)
    dialog.value = false
  } catch (e) {
    console.error('Error updating ship:', e)
  }
}
</script>

<style scoped>
th {
  background-color: #f5f5f5;
  text-align: left;
  padding: 8px;
  font-weight: 600;
}
td {
  padding: 6px 12px;
}
.zebra-table tbody tr:nth-child(odd) {
  background-color: #f9f9f9;
}
.zebra-table tbody tr:nth-child(even) {
  background-color: #ffffff;
}
</style>