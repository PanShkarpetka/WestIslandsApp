<template>
  <v-row class="my-4">
    <v-col cols="12">
      <v-card class="pa-6" elevation="4">
        <v-card-title class="text-h6">Калькулятор подорожі кораблем</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                  v-model="selectedShipId"
                  :items="visibleShips"
                  item-title="name"
                  item-value="id"
                  label="Корабель"
                  prepend-icon="mdi-sail-boat"
                  :rules="[v => !!v || 'Оберіть корабель']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                  v-model.number="distance"
                  type="number"
                  min="0"
                  label="Відстань, милі"
                  prepend-icon="mdi-map-marker-distance"
                  :rules="[v => v > 0 || 'Вкажіть відстань більше нуля']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                  v-model.number="sailors"
                  type="number"
                  min="0"
                  label="Кількість моряків"
                  prepend-icon="mdi-account-group"
                  :rules="sailorRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-checkbox
                  v-model="advancedEnabled"
                  label="Додаткові функції"
                  prepend-icon="mdi-flask"
              />
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <v-row>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Швидкість за годину (поточна зміна)</div>
              <div class="text-h6">{{ formattedSpeedPerHour }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Час в один бік</div>
              <div class="text-h6">{{ formattedOneWayTime }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Час туди й назад</div>
              <div class="text-h6">{{ formattedRoundTripTime }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Вартість (в один бік)</div>
              <div class="text-h6">{{ formattedCostOneWay }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Вартість (туди й назад)</div>
              <div class="text-h6">{{ formattedCostRoundTrip }}</div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2 text-grey">Годин плавання на добу</div>
              <div class="text-h6">{{ formattedSailingHoursPerDay }}</div>
            </v-col>
          </v-row>

          <v-expand-transition>
            <div v-if="advancedEnabled">
              <v-divider class="my-4" />
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                      v-model.number="dangerModifier"
                      type="number"
                      label="Модифікатор небезпеки, %"
                      prepend-icon="mdi-alert"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                      :model-value="weaponSlotsUsed"
                      type="number"
                      label="Використані слоти зброї"
                      prepend-icon="mdi-crosshairs"
                      readonly
                  />
                </v-col>
                <v-col cols="12">
                  <v-card class="pa-4" variant="outlined">
                    <div class="text-subtitle-2 text-grey">Ризик подорожі (Шанс небезпеки)</div>
                    <div v-if="dangerArea" class="text-body-1 mt-1">
                      Зона небезпеки: {{ dangerArea.area }} (мін. ШБ {{ formatPercent(dangerArea.min) }})
                    </div>
                    <div v-else class="text-body-1 mt-1">—</div>
                    <v-list class="mt-2" density="compact" v-if="dangerArea">
                      <v-list-item>
                        <v-list-item-title>Базовий шанс небезпеки: {{ formatPercent(dangerArea.base) }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Модифікатор небезпеки: {{ formatSignedPercent(dangerModifierValue) }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Зайві моряки: {{ formatSignedPercent(-sailorReduction) }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Озброєння: {{ formatSignedPercent(-weaponReduction) }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                    <div class="text-h6 mt-3">Фінальний шанс небезпеки: {{ formattedFinalChance }}</div>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useShipStore } from '@/store/shipStore';

const shipStore = useShipStore();

const selectedShipId = ref(null);
const distance = ref(0);
const sailors = ref(0);
const dangerModifier = ref(0);
const advancedEnabled = ref(false);

onMounted(() => {
  shipStore.subscribeToShips();
})

const visibleShips = computed(() => shipStore.ships.filter(ship => !!ship.visibility))
const selectedShip = computed(() => visibleShips.value.find(ship => ship.id === selectedShipId.value))
const sailStations = computed(() => Number(selectedShip.value?.sailStations) || 0)
const weaponSlotsUsed = computed(() => Number(selectedShip.value?.weaponSlotsUsed) || 0)
const fullSpeedPerHour = computed(() => Number(selectedShip.value?.speedMax) ? Number(selectedShip.value.speedMax) / 10 : 0)

const speedPerHour = computed(() => {
  if (!selectedShip.value || sailStations.value <= 0) return 0
  const activeSailors = Math.min(Number(sailors.value) || 0, sailStations.value)
  return (activeSailors / sailStations.value) * fullSpeedPerHour.value
})

const sailingHoursPerDay = computed(() => {
  if (!selectedShip.value || sailStations.value <= 0) return 0
  const totalSailorHours = (Number(sailors.value) || 0) * 8
  return Math.min(24, totalSailorHours / sailStations.value)
})

const distancePerDay = computed(() => fullSpeedPerHour.value * sailingHoursPerDay.value)

function getTravelHours(travelDistance) {
  if (!selectedShip.value || travelDistance <= 0 || distancePerDay.value <= 0 || speedPerHour.value <= 0) return 0
  const fullDays = Math.floor(travelDistance / distancePerDay.value)
  const remainingDistance = travelDistance - fullDays * distancePerDay.value
  const remainingHours = remainingDistance > 0 ? remainingDistance / speedPerHour.value : 0

  return fullDays * 24 + remainingHours;
}

const oneWayHours = computed(() => getTravelHours(distance.value))
const roundTripHours = computed(() => getTravelHours(distance.value * 2))

const oneWayDays = computed(() => (oneWayHours.value ? oneWayHours.value / 24 : 0))
const roundTripDays = computed(() => (roundTripHours.value ? roundTripHours.value / 24 : 0))

const sailorRules = [
  v => (Number(v) || 0) > 0 || 'Вкажіть кількість моряків',
  v => {
    if (!selectedShip.value) return true
    const value = Number(v) || 0
    const min = Number(selectedShip.value.crewMin) || 0
    return value >= min || `Мінімум ${min} моряків`
  },
  v => {
    if (!selectedShip.value) return true
    const value = Number(v) || 0
    const max = Number(selectedShip.value.passengerMax) || 0
    return value <= max || `Не більше ${max} моряків`
  }
]

function formatDuration(totalHours) {
  if (!totalHours || totalHours <= 0) return '—'
  const days = Math.floor(totalHours / 24)
  const hours = totalHours - days * 24
  const hoursLabel = hours.toFixed(1)
  return `${days} дн. ${hoursLabel} год.`
}

const formattedSpeedPerHour = computed(() => speedPerHour.value ? `${speedPerHour.value.toFixed(2)} м/год` : '—')
const formattedSailingHoursPerDay = computed(() => sailingHoursPerDay.value ? `${sailingHoursPerDay.value.toFixed(1)} год.` : '—')
const formattedOneWayTime = computed(() => formatDuration(oneWayHours.value))
const formattedRoundTripTime = computed(() => formatDuration(roundTripHours.value))
const formattedCostOneWay = computed(() => {
  if (!selectedShip.value || oneWayDays.value <= 0) return '—'
  const total = (Number(sailors.value) || 0) * oneWayDays.value * 2
  return `${total.toFixed(1)} золота`
})
const formattedCostRoundTrip = computed(() => {
  if (!selectedShip.value || roundTripDays.value <= 0) return '—'
  const total = (Number(sailors.value) || 0) * roundTripDays.value * 2
  return `${total.toFixed(1)} золота`
})

const dangerArea = computed(() => {
  if (oneWayDays.value <= 0) return null
  if (oneWayDays.value <= 1) {
    return { area: 1, base: 10, min: 5 }
  }
  if (oneWayDays.value <= 3) {
    return { area: 2, base: 25, min: 15 }
  }
  return { area: 3, base: 60, min: 30 }
})

const dangerModifierValue = computed(() => Number(dangerModifier.value) || 0)
const extraSailors = computed(() => Math.max(0, (Number(sailors.value) || 0) - sailStations.value))
const sailorReduction = computed(() => extraSailors.value)
const weaponReduction = computed(() => weaponSlotsUsed.value * 5)

const finalChance = computed(() => {
  if (!dangerArea.value) return null
  const rawChance = dangerArea.value.base + dangerModifierValue.value - sailorReduction.value - weaponReduction.value
  return Math.max(dangerArea.value.min, rawChance)
})

function formatPercent(value) {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(0)}%`
}

function formatSignedPercent(value) {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(0)}%`
}

const formattedFinalChance = computed(() => (finalChance.value === null ? '—' : formatPercent(finalChance.value)))
</script>
