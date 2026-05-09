<template>
  <div class="buildings-page">
    <div class="map-frame">
      <div class="island-map-wrap">
        <div class="island-map">
          <img class="map-img" :src="islandImg" alt="Острів" />

          <button
            v-for="pin in pins"
            :key="pin.id"
            class="building-pin"
            :class="{ built: isBuilt(pin.id) }"
            :style="{ top: pin.top + 'px', left: pin.left + 'px', transform: pin.flipX ? 'scaleX(-1)' : undefined }"
            @click="openBuilding(pin.id)"
          >
            <img :src="`/images/buildings/${pin.id}.png`" :alt="buildingName(pin.id)" />
            <span class="pin-glow" />
          </button>
        </div>
      </div>
    </div>
  </div>

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
import IslandBuildingDialog from "@/components/IslandBuildingDialog.vue"
import { storeToRefs } from 'pinia'
import { DEFAULT_ISLAND_ID } from '@/config/constants.js'

const islandImg = `/images/island/${DEFAULT_ISLAND_ID}.jpg`
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
  islandStore.subscribe()
  buildingStore.subscribe()
  donationStore.subscribeToGoals?.()
})
onUnmounted(() => {
  islandStore.stop()
  buildingStore.stop()
  donationStore.stop?.()
})

const showDialog = ref(false)
const activeKey = ref(null)
const builtMap = computed(() => ({ ...(island.value?.buildings || {}) }))

function isBuilt(key) { return !!builtMap.value[key]?.built }
function buildingName(key) { return buildingStore.byId.get(key)?.name || key }
function openBuilding(key) { activeKey.value = key; showDialog.value = true }
</script>

<style scoped>
.buildings-page {
  padding-bottom: 16px;
}

/* ── Map frame ──────────────────────────────────────────────── */
.map-frame {
  border: 2px solid var(--wi-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 6px 32px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.3);
  background: #0a1a10;
}

.island-map-wrap {
  overflow: auto;
  display: flex;
  justify-content: center;
}

.island-map {
  position: relative;
  width: 800px;
  flex-shrink: 0;
}

.map-img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 0;
  /* Slight aged-map filter */
  filter: sepia(15%) contrast(105%) brightness(92%);
}

/* ── Building pins ──────────────────────────────────────────── */
.building-pin {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 6px;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  /* Unbuilt: rusted grey */
  background: rgba(30, 20, 10, 0.55);
  border: 2px solid rgba(90, 62, 32, 0.5);
  opacity: 0.55;
  filter: grayscale(60%) brightness(0.7);
}

.building-pin img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Built: gold lantern glow */
.building-pin.built {
  opacity: 1;
  filter: none;
  background: rgba(20, 12, 4, 0.4);
  border: 2px solid rgba(200, 150, 42, 0.6);
  box-shadow: 0 0 10px rgba(200, 150, 42, 0.3), 0 0 4px rgba(200, 150, 42, 0.2);
}

.building-pin:hover {
  transform: scale(2.1);
  z-index: 10;
  border-color: var(--wi-gold) !important;
  box-shadow: 0 0 16px rgba(200, 150, 42, 0.6), 0 4px 12px rgba(0,0,0,0.6) !important;
  filter: none !important;
  opacity: 1 !important;
}

/* Subtle pulse on built pins */
.building-pin.built .pin-glow {
  position: absolute;
  inset: -4px;
  border-radius: 8px;
  border: 1px solid rgba(200, 150, 42, 0.2);
  animation: lantern-pulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes lantern-pulse {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.8; }
}
</style>
