<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Острів {{ islandName }}</h1>
      </v-col>
      <v-col cols="12" sm="6" class="text-sm-end">
        <v-btn v-if="isAdmin" color="primary" :loading="saving" @click="save">
          <v-icon start>mdi-plus</v-icon>
          Зберегти
        </v-btn>
      </v-col>
    </v-row>

    <v-card class="mb-6 island-params-card" >
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-text-field class="custom-v-field-background" v-model="form.name" label="Назва острова" :readonly="!isAdmin" />
            <v-text-field class="custom-v-field-background" v-model.number="form.population" type="number" min="0" label="Населення" :readonly="!isAdmin" />
            <v-text-field class="custom-v-field-background" v-model.number="form.sailors" type="number" min="0" label="Моряки" :readonly="!isAdmin" />
            <v-text-field class="custom-v-field-background" v-model.number="form.characters" type="number" min="0" label="Персонажі" :readonly="!isAdmin" />
            <v-text-field class="custom-v-field-background" v-model.number="form.buildingDiscount" type="number" min="0" max="100"
                          label="Знижка на будівництво, %" :readonly="!isAdmin" />
            <v-text-field class="custom-v-field-background" v-model.number="form.repairDiscount" type="number" min="0" max="100"
                          label="Знижка на ремонт кораблів, %" :readonly="!isAdmin" />
          </v-col>
<!--          <v-col cols="12" md="4" class="d-flex align-center">-->
<!--            <div class="text-body-2">-->
<!--            </div>-->
<!--          </v-col>-->
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="custom-bg">
      <v-card-text class="island-map-wrap">
        <div class="island-map" style="max-width: 900px;">
          <img class="map-img" :src="islandImg" alt="Острів" style="width: 800px;">
          <button
              v-for="pin in pins"
              :key="pin.id"
              class="building-pin"
              :class="{ built: isBuilt(pin.id) }"
              :style="{ top: pin.top+'px', left: pin.left+'px', transform: pin.flipX ? 'scaleX(-1)' : undefined }"
              @click="openBuilding(pin.id)"
              :title="buildingName(pin.id)"
          >
            <img :src="`/images/buildings/${pin.id}.png`" alt="" />
          </button>
        </div>
      </v-card-text>
    </v-card>

    <!-- Діалог будівлі -->
    <IslandBuildingDialog
        v-if="activeKey"
        v-model="showDialog"
        :building-key="activeKey"
        :nickname="auth.nickname"
        :is-admin="isAdmin"
    />
  </v-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import IslandBuildingDialog from '@/components/IslandBuildingDialog.vue'
import { useIslandStore } from '@/store/islandStore'
import { useBuildingStore } from '@/store/buildingStore'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useUserStore } from '@/store/userStore.js'

const islandImg = '/images/island/island_rock.jpg'

const pins = [
  { id: 'arcaneStudy',   top: 307, left:  73 },
  { id: 'armory',        top: 280, left: 480 },
  { id: 'barracks',      top: 377, left: 508 },
  { id: 'farm',          top: 412, left: 286 },
  { id: 'garden',        top: 335, left: 294 },
  { id: 'harbor',        top: 315, left: 749 },
  { id: 'houses',        top: 479, left: 503 },
  { id: 'library',       top: 350, left: 200 },
  { id: 'lighthouse',    top: 188, left: 729 },
  { id: 'mill',          top: 457, left: 319 },
  { id: 'pirs',          top: 655, left: 395 },
  { id: 'portCrane',     top: 597, left: 114, flipX: true },
  { id: 'sanctuary',     top: 321, left: 586 },
  { id: 'sawmill',       top: 217, left: 548 },
  { id: 'shipyardBig',   top: 624, left: 224, flipX: true },
  { id: 'shipyardSmall', top: 612, left: 301 },
  { id: 'stonecutter',   top: 204, left: 336 },
  { id: 'storehouse',    top: 127, left: 331 },
  { id: 'tavern',        top: 500, left: 420 },
  { id: 'townhouse',     top: 377, left: 377 },
  { id: 'workshop',      top: 153, left: 465 },
]

const islandStore = useIslandStore()
const buildingStore = useBuildingStore()
const donationStore = useDonationGoalStore()
const auth = useUserStore()

const { data: island } = storeToRefs(islandStore)
const isAdmin = computed(() => auth?.isAdmin ?? false)

onMounted(() => {
  islandStore.subscribe('island_rock')
  buildingStore.subscribe()
  donationStore.subscribeToGoals?.() // існуючий listener для донатів
})
onUnmounted(() => {
  islandStore.stop()
  buildingStore.stop()
  donationStore.stop?.()
})

/* -------- заголовок + знижка -------- */
const islandName = computed(() => island.value?.name || 'Без назви')

/* -------- форма редагування острова -------- */
const saving = ref(false)
const form = reactive({
  name: '',
  population: 0,
  sailors: 0,
  characters: 0,
  buildingDiscount: 0,
  repairDiscount: 0,
})
watch(island, (v) => {
  if (!v) return
  form.name = v.name || ''
  form.population = Number(v.population || 0)
  form.sailors = Number(v.sailors || 0)
  form.characters = Number(v.characters || 0)
  // показуємо % як число (15 або 0.15 — як збережено)
  form.buildingDiscount = v.buildingDiscount ?? 0
  form.repairDiscount = v.repairDiscount ?? 0
}, { immediate: true })

async function save () {
  if (!isAdmin.value) return
  saving.value = true
  try {
    await islandStore.updateIsland({
      name: String(form.name || ''),
      population: Number(form.population || 0),
      sailors: Number(form.sailors || 0),
      characters: Number(form.characters || 0),
      buildingDiscount: Number(form.buildingDiscount || 0),
      repairDiscount: Number(form.repairDiscount || 0),
    })
  } finally { saving.value = false }
}

/* -------- інтеракція з мапою -------- */
const showDialog = ref(false)
const activeKey = ref(null)
const builtMap = computed(() => ({ ...(island.value?.buildings || {}) }))

function isBuilt (key) { return !!builtMap.value[key]?.built }

function buildingName (key) {
  return buildingStore.byId.get(key)?.name || key
}
function openBuilding (key) {
  activeKey.value = key
  showDialog.value = true
}
</script>

<style scoped>
.island-params-card{
  position: relative;
  background-image: url('/images/island/island_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}
.island-params-card::before{
  position:absolute;
  inset:0;
  background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.3));
  pointer-events:none;
}

.island-map-wrap{
  display:flex;
  justify-content:center;   /* centers child horizontally */
}
.island-map{
  position:relative;
  width: 800px;             /* base width you used for pin coordinates */
  max-width: 100%;
  margin: 0 auto;           /* ensure centered if parent isn't flex */
}
.map-img{
  display:block;
  width:100%;
  height:auto;
  border-radius: 12px;
}
.building-pin{
  position:absolute; width:80px; height:80px; border:2px solid rgba(0,0,0,.3);
  border-radius:6px; background:rgba(255,255,255,.2); opacity:.55; padding:2px;
  display:flex; align-items:center; justify-content:center; transition:.15s;
}
.building-pin img{width:100%; height:100%; object-fit:contain}
.building-pin:hover{transform:scale(2.05); outline:2px solid #42a5f5}
.building-pin.built{opacity:1}
.custom-bg {
  background: #0d3d59;
}
</style>
