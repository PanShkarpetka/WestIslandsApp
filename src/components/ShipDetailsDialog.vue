<template>
  <v-dialog v-model="dialog" max-width="1000px">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon class="me-2">mdi-sail-boat</v-icon>
        {{ editedShip.name }}
      </v-card-title>
      <v-card-text>
        <v-container fluid>
          <v-row v-if="isAdmin && !editedShip.id" align="end">
            <v-col cols="12" sm="8">
              <v-select
                v-model="copySourceId"
                :items="copyOptions"
                item-title="name"
                item-value="id"
                label="Скопіювати параметри з існуючого корабля"
                clearable
                prepend-icon="mdi-content-copy"
                hint="Підставить характеристики, озброєння та боєприпаси"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-btn
                color="secondary"
                variant="outlined"
                block
                :disabled="!copySourceId"
                @click="copyFromExisting"
              >
                <v-icon start>mdi-content-copy</v-icon>
                Скопіювати
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-subtitle-1 mb-2">Основні характеристики</div>
              <v-text-field v-model="editedShip.name" label="Назва" prepend-icon="mdi-rename-box" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.currentHP" label="Поточні HP" type="number" min="0" prepend-icon="mdi-heart" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.ac" label="КД (AC)" type="number" min="0" prepend-icon="mdi-shield" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.hullDiceUsed" label="Витрачені куби корпусу" type="number" min="0" prepend-icon="mdi-cube-outline" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.crewCurrent" label="Екіпаж (поточний)" type="number" min="0" prepend-icon="mdi-account-group" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.passengerCurrent" label="Пасажири (поточні)" type="number" min="0" prepend-icon="mdi-human-male" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.tonnageCurrent" label="Тоннаж (поточний)" type="number" min="0" prepend-icon="mdi-weight" :readonly="!isAdmin" />
              <v-textarea v-model="editedShip.description" label="Опис" auto-grow rows="3" prepend-icon="mdi-note-text" :readonly="!isAdmin" />
            </v-col>

            <v-col cols="12" sm="6">
              <div class="text-subtitle-1 mb-2">Ліміти та швидкість</div>
              <v-text-field v-model="editedShip.type" label="Тип" prepend-icon="mdi-sail-boat" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.maxHP" label="Макс. HP" type="number" min="0" prepend-icon="mdi-heart" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.hullDices" label="Куби корпусу (макс.)" type="number" min="0" prepend-icon="mdi-cube" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.crewMin" label="Екіпаж (мін.)" type="number" min="0" prepend-icon="mdi-account" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.crewMax" label="Екіпаж (макс.)" type="number" min="0" prepend-icon="mdi-account-group" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.passengerMax" label="Пасажири (макс.)" type="number" min="0" prepend-icon="mdi-human-male" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.tonnageMax" label="Тоннаж (макс.)" type="number" min="0" prepend-icon="mdi-weight" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.damageThreshold" label="Поріг шкоди" type="number" min="0" prepend-icon="mdi-shield-half-full" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.weaponSlotsMax" label="Зброярські слоти (макс.)" type="number" min="0" prepend-icon="mdi-crosshairs" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.initiative" label="Ініціатива" type="number" min="0" prepend-icon="mdi-run-fast" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.sailStations" label="Пости вітрил" type="number" min="0" prepend-icon="mdi-flag-variant" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.speedUnit" label="Одиниці швидкості" type="number" min="0" prepend-icon="mdi-speedometer" :readonly="!isAdmin" />
              <v-text-field v-model.number="editedShip.speedMax" label="Макс. швидкість" type="number" min="0" prepend-icon="mdi-rocket" :readonly="!isAdmin" />
              <v-text-field v-model="editedShip.size" label="Розмір" prepend-icon="mdi-ruler-square" :readonly="!isAdmin" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editedShip.hullUpgrade"
                :items="hullUpgradeOptions"
                item-title="title"
                item-value="value"
                label="Покращення корпусу"
                prepend-icon="mdi-shield-plus"
                :readonly="!isAdmin"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="editedShip.weaponSlotsUsed"
                label="Зайняті зброярські слоти"
                type="number"
                min="0"
                prepend-icon="mdi-crosshairs"
                :readonly="!isAdmin"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-1 mb-2">Слоти зброї</div>
              <v-row
                v-for="(weapon, index) in editedShip.weaponSlots"
                :key="`weapon-${index}`"
                align="center"
              >
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="weapon.type"
                    :items="weaponOptions"
                    item-title="title"
                    item-value="value"
                    label="Зброя"
                    :readonly="!isAdmin"
                  />
                </v-col>
                <v-col cols="8" sm="4">
                  <v-text-field
                    v-model.number="weapon.slots"
                    label="К-сть слотів"
                    type="number"
                    min="1"
                    :readonly="!isAdmin"
                  />
                </v-col>
                <v-col cols="4" sm="2" class="text-end">
                  <v-btn
                    v-if="isAdmin"
                    icon="mdi-delete"
                    variant="text"
                    @click="removeWeaponSlot(index)"
                  />
                </v-col>
              </v-row>
              <v-btn
                v-if="isAdmin"
                color="secondary"
                variant="outlined"
                @click="addWeaponSlot"
              >
                <v-icon start>mdi-plus</v-icon>
                Додати слот зброї
              </v-btn>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-1 mb-2">Боєприпаси</div>
              <v-row>
                <v-col
                  v-for="ammo in ammunitionTypes"
                  :key="ammo.key"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <v-text-field
                    v-model.number="editedShip.ammunition[ammo.key]"
                    :label="ammo.label"
                    type="number"
                    min="0"
                    prepend-icon="mdi-ammunition"
                    :readonly="!isAdmin"
                  />
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false">Закрити</v-btn>
        <v-btn color="primary" @click="saveChanges" v-if="isAdmin">Зберегти</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useUserStore } from '@/store/userStore'
import { useLogStore } from '@/store/logStore'

const props = defineProps({
  dialog: Boolean,
  ship: Object,
  isAdmin: Boolean,
  ships: {
    type: Array,
    default: () => []
  }
})
const emit = defineEmits(['update:dialog', 'save'])

const dialog = ref(props.dialog)
const editedShip = ref(normalizeShip(props.ship || {}))
const copySourceId = ref(null)
const weaponOptions = [
  { title: 'Гармата', value: 'cannon' },
  { title: 'Баліста', value: 'ballista' },
  { title: 'Катапульта', value: 'catapult' },
  { title: 'Саламандра', value: 'salamander' },
  { title: 'Голова дракона', value: 'dragon head' },
  { title: 'Аркана-артилерія', value: 'arcana-tillery' },
  { title: 'Пускова істот', value: 'creature launcher' },
  { title: 'Весловий клинок', value: 'oar blade' },
  { title: 'Таран ауруха', value: 'auroch ram' }
]
const hullUpgradeOptions = [
  { title: 'Шиповані плити', value: 'spiked plates' },
  { title: 'Магічна сітка', value: 'magic mesh' },
  { title: 'Захист від чар', value: 'spell shielding' }
]
const ammunitionTypes = [
  { key: 'cannonballs', label: 'Ядра' },
  { key: 'chain', label: 'Ланцюгові' },
  { key: 'grapeshot', label: 'Картеч' },
  { key: 'smokeBombs', label: 'Димові бомби' },
  { key: 'bolt', label: 'Болти' },
  { key: 'flamingBolt', label: 'Палаючі болти' },
  { key: 'catapultStone', label: 'Каміння для катапульти' },
  { key: 'salamanderFuel', label: 'Пальне саламандри' },
  { key: 'dragonHeadFuel', label: 'Пальне голови дракона' }
]
const userStore = useUserStore()
const logStore = useLogStore()

watch(() => props.dialog, val => {
  dialog.value = val
  if (val) copySourceId.value = null
})
watch(dialog, val => emit('update:dialog', val))
watch(() => props.ship, ship => {
  if (ship) editedShip.value = normalizeShip(ship)
})
watch(
  () => props.ships,
  () => {
    if (copySourceId.value && !copyOptions.value.find(option => option.id === copySourceId.value)) {
      copySourceId.value = null
    }
  }
)

const copyOptions = computed(() => props.ships.filter(ship => ship.id))

function normalizeShip(ship) {
  const defaultAmmunition = {
    cannonballs: 0,
    chain: 0,
    grapeshot: 0,
    smokeBombs: 0,
    bolt: 0,
    flamingBolt: 0,
    catapultStone: 0,
    salamanderFuel: 0,
    dragonHeadFuel: 0
  }

  return {
    ...ship,
    weaponSlots: ship.weaponSlots || [],
    hullUpgrade: ship.hullUpgrade || '',
    ammunition: {
      ...defaultAmmunition,
      ...(ship.ammunition || {})
    }
  }
}

function copyFromExisting() {
  const source = props.ships.find(ship => ship.id === copySourceId.value)
  if (!source) return
  const { id, ...rest } = normalizeShip(source)
  editedShip.value = { ...rest }
}

function addWeaponSlot() {
  editedShip.value.weaponSlots = [...(editedShip.value.weaponSlots || []), { type: '', slots: 1 }]
}

function removeWeaponSlot(index) {
  editedShip.value.weaponSlots = editedShip.value.weaponSlots.filter((_, idx) => idx !== index)
}

async function saveChanges() {
  try {
    if (!editedShip.value.id) {
      emit('save', editedShip.value)
      dialog.value = false
      return
    }

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
