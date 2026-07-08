<template>
  <v-dialog v-model="dialog" max-width="800px" :fullscreen="$vuetify.display.smAndDown" scrollable>
    <WiDialogFrame :title="editedShip.name || 'Новий корабель'" icon="mdi-sail-boat" class="ship-dialog-frame">
      <template #header-actions>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false" aria-label="Закрити" />
      </template>

      <!-- Admin: copy from existing -->
      <div v-if="isAdmin && !editedShip.id" class="copy-section">
        <v-row align="center" dense>
          <v-col cols="12" sm="8">
            <v-select
              v-model="copySourceId"
              :items="copyOptions"
              item-title="name"
              item-value="id"
              label="Скопіювати параметри з існуючого корабля"
              clearable
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-content-copy"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-btn variant="outlined" block :disabled="!copySourceId" @click="copyFromExisting" class="copy-btn">
              <v-icon start>mdi-content-copy</v-icon>
              Скопіювати
            </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" class="ship-tabs">
        <v-tab value="status">
          <v-icon start size="16">mdi-heart-pulse</v-icon>
          Стан
        </v-tab>
        <v-tab value="specs">
          <v-icon start size="16">mdi-ruler-square</v-icon>
          Характеристики
        </v-tab>
        <v-tab value="weapons">
          <v-icon start size="16">mdi-crosshairs</v-icon>
          Зброя
        </v-tab>
        <v-tab value="ammo">
          <v-icon start size="16">mdi-ammunition</v-icon>
          Боєприпаси
        </v-tab>
      </v-tabs>

      <v-divider class="tab-divider" />

      <v-card-text class="ship-dialog-body">
        <v-tabs-window v-model="activeTab">

          <!-- ── Status tab ─────────────────────────────── -->
          <v-tabs-window-item value="status">
            <v-row dense>
              <v-col cols="12">
                <div class="section-label">Поточний стан</div>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="editedShip.name" label="Назва" prepend-inner-icon="mdi-rename-box" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model.number="editedShip.currentHP" label="Поточні HP" type="number" min="0" prepend-inner-icon="mdi-heart" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model.number="editedShip.hullDiceUsed" label="Куби корпусу (витрачено)" type="number" min="0" prepend-inner-icon="mdi-cube-outline" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.crewCurrent" label="Екіпаж (поточний)" type="number" min="0" prepend-inner-icon="mdi-account-group" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.passengerCurrent" label="Пасажири (поточні)" type="number" min="0" prepend-inner-icon="mdi-human-male" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.tonnageCurrent" label="Тоннаж (поточний)" type="number" min="0" prepend-inner-icon="mdi-weight" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="editedShip.description" label="Опис" auto-grow rows="3" prepend-inner-icon="mdi-note-text" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- ── Specs tab ──────────────────────────────── -->
          <v-tabs-window-item value="specs">
            <v-row dense>
              <v-col cols="12">
                <div class="section-label">Ліміти та параметри</div>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model="editedShip.type" label="Тип" prepend-inner-icon="mdi-sail-boat" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model="editedShip.size" label="Розмір" prepend-inner-icon="mdi-ruler-square" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.ac" label="КД (AC)" type="number" min="0" prepend-inner-icon="mdi-shield" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model.number="editedShip.maxHP" label="Макс. HP" type="number" min="0" prepend-inner-icon="mdi-heart" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model.number="editedShip.hullDices" label="Куби корпусу (макс.)" type="number" min="0" prepend-inner-icon="mdi-cube" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model.number="editedShip.damageThreshold" label="Поріг шкоди" type="number" min="0" prepend-inner-icon="mdi-shield-half-full" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field v-model.number="editedShip.initiative" label="Ініціатива" type="number" min="0" prepend-inner-icon="mdi-run-fast" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.crewMin" label="Екіпаж (мін.)" type="number" min="0" prepend-inner-icon="mdi-account" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.crewMax" label="Екіпаж (макс.)" type="number" min="0" prepend-inner-icon="mdi-account-group" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.passengerMax" label="Пасажири (макс.)" type="number" min="0" prepend-inner-icon="mdi-human-male" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.tonnageMax" label="Тоннаж (макс.)" type="number" min="0" prepend-inner-icon="mdi-weight" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.speedUnit" label="Одиниці швидкості" type="number" min="0" prepend-inner-icon="mdi-speedometer" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field v-model.number="editedShip.speedMax" label="Макс. швидкість" type="number" min="0" prepend-inner-icon="mdi-rocket" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="editedShip.sailStations" label="Пости вітрил" type="number" min="0" prepend-inner-icon="mdi-flag-variant" :readonly="!isAdmin" variant="outlined" density="compact" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="editedShip.hullUpgrade"
                  :items="hullUpgradeOptions"
                  item-title="title"
                  item-value="value"
                  label="Покращення корпусу"
                  prepend-inner-icon="mdi-shield-plus"
                  :readonly="!isAdmin"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- ── Weapons tab ────────────────────────────── -->
          <v-tabs-window-item value="weapons">
            <v-row dense align="center" class="mb-2">
              <v-col cols="12">
                <div class="section-label">Зброярські слоти</div>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedShip.weaponSlotsMax"
                  label="Слотів (макс.)"
                  type="number" min="0"
                  prepend-inner-icon="mdi-crosshairs"
                  :readonly="!isAdmin"
                  variant="outlined" density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedShip.weaponSlotsUsed"
                  label="Слотів (зайнято)"
                  type="number" min="0"
                  prepend-inner-icon="mdi-crosshairs-gps"
                  :readonly="!isAdmin"
                  variant="outlined" density="compact"
                />
              </v-col>
            </v-row>

            <v-row
              v-for="(weapon, index) in editedShip.weaponSlots"
              :key="`weapon-${index}`"
              dense
              align="center"
              class="weapon-row"
            >
              <v-col cols="12" sm="6">
                <v-select
                  v-model="weapon.type"
                  :items="weaponOptions"
                  item-title="title"
                  item-value="value"
                  label="Зброя"
                  :readonly="!isAdmin"
                  variant="outlined" density="compact"
                />
              </v-col>
              <v-col cols="8" sm="4">
                <v-text-field
                  v-model.number="weapon.slots"
                  label="Слотів"
                  type="number" min="1"
                  :readonly="!isAdmin"
                  variant="outlined" density="compact"
                />
              </v-col>
              <v-col cols="4" sm="2" class="d-flex justify-end align-center">
                <v-btn v-if="isAdmin" icon="mdi-delete" variant="text" size="small" color="error" @click="removeWeaponSlot(index)" />
              </v-col>
            </v-row>

            <v-btn v-if="isAdmin" variant="outlined" class="mt-3 add-slot-btn" @click="addWeaponSlot">
              <v-icon start>mdi-plus</v-icon>
              Додати слот зброї
            </v-btn>
          </v-tabs-window-item>

          <!-- ── Ammo tab ───────────────────────────────── -->
          <v-tabs-window-item value="ammo">
            <v-row dense>
              <v-col cols="12">
                <div class="section-label">Запаси боєприпасів</div>
              </v-col>
              <v-col
                v-for="ammo in ammunitionTypes"
                :key="ammo.key"
                cols="12" sm="6" md="4"
              >
                <v-text-field
                  v-model.number="editedShip.ammunition[ammo.key]"
                  :label="ammo.label"
                  type="number" min="0"
                  prepend-inner-icon="mdi-ammunition"
                  :readonly="!isAdmin"
                  variant="outlined" density="compact"
                />
              </v-col>
            </v-row>
          </v-tabs-window-item>

        </v-tabs-window>
      </v-card-text>

      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Закрити</v-btn>
        <WiActionButton v-if="isAdmin" prepend-icon="mdi-content-save" @click="saveChanges">
          Зберегти
        </WiActionButton>
      </template>

    </WiDialogFrame>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useUserStore } from '@/store/userStore'
import { useLogStore } from '@/store/logStore'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiDialogFrame from '@/components/ui/WiDialogFrame.vue'

const props = defineProps({
  dialog: Boolean,
  ship: Object,
  isAdmin: Boolean,
  ships: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:dialog', 'save'])

const dialog = ref(props.dialog)
const editedShip = ref(normalizeShip(props.ship || {}))
const copySourceId = ref(null)
const activeTab = ref('status')

const weaponOptions = [
  { title: 'Гармата', value: 'cannon' },
  { title: 'Баліста', value: 'ballista' },
  { title: 'Катапульта', value: 'catapult' },
  { title: 'Саламандра', value: 'salamander' },
  { title: 'Голова дракона', value: 'dragon head' },
  { title: 'Аркана-артилерія', value: 'arcana-tillery' },
  { title: 'Пускова істот', value: 'creature launcher' },
  { title: 'Весловий клинок', value: 'oar blade' },
  { title: 'Таран ауруха', value: 'auroch ram' },
]
const hullUpgradeOptions = [
  { title: 'Шиповані плити', value: 'spiked plates' },
  { title: 'Магічна сітка', value: 'magic mesh' },
  { title: 'Захист від чар', value: 'spell shielding' },
  { title: 'Таран', value: 'naval ram' },
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
  { key: 'dragonHeadFuel', label: 'Пальне голови дракона' },
]

const userStore = useUserStore()
const logStore = useLogStore()

watch(() => props.dialog, val => {
  dialog.value = val
  if (val) { copySourceId.value = null; activeTab.value = 'status' }
})
watch(dialog, val => emit('update:dialog', val))
watch(() => props.ship, ship => { if (ship) editedShip.value = normalizeShip(ship) })
watch(() => props.ships, () => {
  if (copySourceId.value && !copyOptions.value.find(o => o.id === copySourceId.value))
    copySourceId.value = null
})

const copyOptions = computed(() => props.ships.filter(s => s.id))

function normalizeShip(ship) {
  return {
    ...ship,
    weaponSlots: ship.weaponSlots || [],
    hullUpgrade: ship.hullUpgrade || '',
    ammunition: {
      cannonballs: 0, chain: 0, grapeshot: 0, smokeBombs: 0,
      bolt: 0, flamingBolt: 0, catapultStone: 0,
      salamanderFuel: 0, dragonHeadFuel: 0,
      ...(ship.ammunition || {}),
    },
  }
}

function copyFromExisting() {
  const source = props.ships.find(s => s.id === copySourceId.value)
  if (!source) return
  const { id, ...rest } = normalizeShip(source)
  editedShip.value = { ...rest }
}

function addWeaponSlot() {
  editedShip.value.weaponSlots = [...(editedShip.value.weaponSlots || []), { type: '', slots: 1 }]
}

function removeWeaponSlot(index) {
  editedShip.value.weaponSlots = editedShip.value.weaponSlots.filter((_, i) => i !== index)
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
        timestamp: new Date(),
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
/* ── Card ───────────────────────────────────────────────────── */
.ship-dialog-frame {
  display: flex;
  flex-direction: column;
}

/* ── Copy section ───────────────────────────────────────────── */
.copy-section {
  padding: 12px 20px;
  background: rgba(200,150,42,0.05);
  border-bottom: 1px solid var(--wi-border);
}

.copy-btn {
  border-color: var(--wi-border) !important;
  color: var(--wi-text) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.05em !important;
}

/* ── Tabs ───────────────────────────────────────────────────── */
.ship-tabs {
  background: #1a1108 !important;
}

.tab-divider {
  border-color: var(--wi-border) !important;
  opacity: 1 !important;
}

/* ── Body ───────────────────────────────────────────────────── */
.ship-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px !important;
}

.section-label {
  font-family: var(--wi-font-heading);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: var(--wi-text-muted);
  text-transform: uppercase;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--wi-border);
}

/* ── Weapon rows ────────────────────────────────────────────── */
.weapon-row {
  background: rgba(255,255,255,0.02);
  border-radius: 4px;
  margin-bottom: 4px !important;
}

.add-slot-btn {
  border-color: var(--wi-border) !important;
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.05em !important;
}

/* ── Footer ─────────────────────────────────────────────────── */
</style>
