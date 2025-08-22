<template>
  <v-card class="mb-6 island-params-card custom-bg">
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
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useIslandStore } from '@/store/islandStore'
import { useBuildingStore } from '@/store/buildingStore'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useUserStore } from '@/store/userStore.js'
import IslandBuildingDialog from "@/components/IslandBuildingDialog.vue";
import {storeToRefs} from "pinia";

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
.island-map-wrap{
  display:flex;
  justify-content:center;
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
