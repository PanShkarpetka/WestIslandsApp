<template>
  <v-container class="py-6">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div>
        <h1 class="text-h5 font-semibold">Мануфактури острова</h1>
        <p class="text-sm text-medium-emphasis">Список мануфактур та їхній цикловий дохід.</p>
      </div>
      <v-btn v-if="isAdmin" color="primary" @click="openAddDialog">
        <v-icon start>mdi-plus</v-icon>
        Додати мануфактуру
      </v-btn>
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
            <div class="flex items-center justify-between gap-2">
              <span>{{ index + 1 }}. {{ item.name || 'Без назви' }}</span>
              <v-btn
                v-if="isAdmin"
                size="small"
                variant="text"
                icon="mdi-pencil"
                @click="openEditDialog(item)"
              />
            </div>
          </v-card-title>
          <v-card-text>
            <div class="text-body-2 text-medium-emphasis mb-3">
              {{ item.description || 'Опис відсутній.' }}
            </div>
            <div class="text-sm">
              <span class="font-semibold">Дохід за цикл:</span>
              <v-chip
                class="ml-2"
                :color="item.income >= 0 ? 'green' : 'red'"
                size="small"
                variant="flat"
              >
                {{ item.income >= 0 ? '+' : '' }}{{ item.income }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialogOpen" max-width="560">
      <v-card>
        <v-card-title class="text-h6 font-semibold">
          {{ dialogMode === 'add' ? 'Нова мануфактура' : 'Редагувати мануфактуру' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="Назва"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Вкажіть назву']"
          />
          <v-textarea
            v-model="form.description"
            label="Опис"
            variant="outlined"
            density="comfortable"
            rows="3"
            auto-grow
          />
          <v-text-field
            v-model.number="form.income"
            label="Дохід за цикл"
            type="number"
            variant="outlined"
            density="comfortable"
            step="0.01"
          />
          <div v-if="formError" class="text-error text-body-2 mt-2">{{ formError }}</div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-btn color="primary" :loading="saving" @click="saveManufacture">
            Зберегти
          </v-btn>
          <v-btn variant="text" @click="dialogOpen = false">Скасувати</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { addDoc, arrayUnion, collection, doc, documentId, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { useIslandStore } from '@/store/islandStore'
import { useUserStore } from '@/store/userStore'
import { db } from '@/services/firebase'

const islandStore = useIslandStore()
const { data: island } = storeToRefs(islandStore)
const userStore = useUserStore()
const isAdmin = computed(() => !!userStore.isAdmin)

const manufactures = ref([])
const loading = ref(false)
const error = ref('')
const dialogOpen = ref(false)
const dialogMode = ref('add')
const saving = ref(false)
const formError = ref('')
const form = ref({
  id: null,
  name: '',
  description: '',
  income: 0,
})

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
          income: normalizeAmount(data.income || 0),
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

function openAddDialog() {
  dialogMode.value = 'add'
  form.value = {
    id: null,
    name: '',
    description: '',
    income: 0,
  }
  formError.value = ''
  dialogOpen.value = true
}

function openEditDialog(item) {
  dialogMode.value = 'edit'
  form.value = {
    id: item.key,
    name: item.name || '',
    description: item.description || '',
    income: item.income || 0,
  }
  formError.value = ''
  dialogOpen.value = true
}

async function saveManufacture() {
  formError.value = ''
  const name = form.value.name?.trim()
  const description = form.value.description?.trim() || ''
  const income = normalizeAmount(form.value.income || 0)

  if (!name) {
    formError.value = 'Вкажіть назву мануфактури.'
    return
  }

  saving.value = true
  try {
    const payload = { name, description, income }
    if (dialogMode.value === 'add') {
      if (!island.value?.id) {
        throw new Error('Острів не вибрано.')
      }
      const docRef = await addDoc(collection(db, 'manufactures'), payload)
      await updateDoc(doc(db, 'islands', island.value.id), {
        manufactures: arrayUnion(docRef.id),
      })
    } else if (form.value.id) {
      await updateDoc(doc(db, 'manufactures', form.value.id), payload)
      const index = manufactures.value.findIndex((item) => item.key === form.value.id)
      if (index !== -1) {
        manufactures.value[index] = {
          ...manufactures.value[index],
          ...payload,
        }
      }
    }
    dialogOpen.value = false
  } catch (e) {
    console.error('[manufactures] Failed to save', e)
    formError.value = e?.message || 'Не вдалося зберегти мануфактуру.'
  } finally {
    saving.value = false
  }
}

function normalizeAmount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
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
