<template>
  <v-container class="py-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-h5 font-semibold">Мануфактури острова</h1>
        <p class="text-sm text-medium-emphasis">Список мануфактур та їхній цикловий дохід.</p>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <v-alert v-else-if="loading" type="info" variant="tonal" class="mb-4">
      Завантаження мануфактур…
    </v-alert>

    <v-alert v-else-if="!manufactures.length" type="info" variant="tonal">
      Наразі на острові немає мануфактур.
    </v-alert>

    <v-row v-else>
      <v-col
        v-for="(item, index) in manufactures"
        :key="item.key"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card class="h-100" variant="tonal">
          <v-card-title class="text-base font-semibold">
            {{ index + 1 }}. {{ item.name || 'Без назви' }}
          </v-card-title>
          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-3">
              {{ item.description || 'Опис відсутній.' }}
            </div>
            <div class="text-sm">
              <span class="font-semibold">Дохід за цикл:</span>
              <v-chip class="ml-2" color="green" size="small" variant="flat">
                +{{ item.income }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import { useIslandStore } from '@/store/islandStore'
import { db } from '@/services/firebase'

const islandStore = useIslandStore()
const { data: island } = storeToRefs(islandStore)

const manufactures = ref([])
const loading = ref(false)
const error = ref('')

async function loadManufactures(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    manufactures.value = []
    return
  }

  loading.value = true
  error.value = ''
  try {
    const chunks = []
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10))
    }

    const results = []
    for (const chunk of chunks) {
      const q = query(collection(db, 'manufactures'), where(documentId(), 'in', chunk))
      const snap = await getDocs(q)
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() || {}
        results.push({
          key: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          income: Math.trunc(Number(data.income || 0)),
        })
      })
    }

    const order = new Map(ids.map((id, index) => [id, index]))
    results.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
    manufactures.value = results
  } catch (e) {
    console.error('[manufactures] Failed to load list', e)
    error.value = 'Не вдалося завантажити мануфактури.'
    manufactures.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadManufactures(island.value?.manufactures)
})

watch(
  () => island.value?.manufactures,
  (ids) => {
    loadManufactures(ids)
  },
  { deep: true },
)
</script>

<style scoped>
</style>
