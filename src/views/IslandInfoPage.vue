<template>
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
      </v-row>
    </v-card-text>
  </v-card>
  <v-btn v-if="isAdmin" color="primary" :loading="saving" @click="save">
    <v-icon start>mdi-plus</v-icon>
    Зберегти
  </v-btn>
</template>

<script setup>
import {reactive, ref, watch, computed, onMounted, onUnmounted} from "vue";
import {storeToRefs} from "pinia";
import {useIslandStore} from "@/store/islandStore.js";
import {useUserStore} from "@/store/userStore.js";

const auth = useUserStore()
const isAdmin = computed(() => auth?.isAdmin ?? false)
const islandStore = useIslandStore()
const { data: island } = storeToRefs(islandStore)

const saving = ref(false)
const form = reactive({
  name: '',
  population: 0,
  sailors: 0,
  characters: 0,
  buildingDiscount: 0,
  repairDiscount: 0,
})

onMounted(() => {
  islandStore.subscribe('island_rock')
})
onUnmounted(() => {
  islandStore.stop()
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
</style>
