<template>
  <v-container>
    <v-card class="pa-6" elevation="2">
      <v-card-title class="text-h5">Адмін панель</v-card-title>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Керування циклами</v-card-title>
      <v-alert v-if="cycleError" type="error" variant="tonal" class="mb-4">{{ cycleError }}</v-alert>
      <v-alert v-if="cycleSuccess" type="success" variant="tonal" class="mb-4">{{ cycleSuccess }}</v-alert>
      <v-form class="mb-6">
        <FaerunDatePicker
          v-model="cycleForm.startedDate"
          label="Початок нового циклу"
          placeholder="Оберіть дату початку"
        />
        <v-text-field
          :model-value="cycleDurationLabel"
          label="Тривалість попереднього циклу"
          density="comfortable"
          hide-details="auto"
          readonly
          class="my-3"
        />
        <v-textarea
          v-model="cycleForm.notes"
          label="Нотатки до дії"
          auto-grow
          rows="2"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
        />
        <v-btn color="primary" prepend-icon="mdi-play-circle-outline" :loading="cycleSaving" @click="createCycle">
          Почати новий цикл
        </v-btn>
      </v-form>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Лог подій</v-card-title>
      <v-data-table
          :headers="headers"
          :items="logEntries"
          :items-per-page="10"
          class="elevation-1"
          density="compact"
      >
        <template #item.timestamp="{ item }">
          {{ formatTimestamp(item.timestamp) }}
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { DEFAULT_YEAR, diffInDays, normalizeFaerunDate, parseFaerunDate } from 'faerun-date';
import { db } from '../services/firebase';
import FaerunDatePicker from '@/components/FaerunDatePicker.vue';
import { useIslandStore } from '@/store/islandStore';
import { usePopulationStore } from '@/store/populationStore';
import { createNewCycleWithEffects } from '@/services/cycleService';

const logEntries = ref([]);
const cycleSaving = ref(false);
const cycleError = ref('');
const cycleSuccess = ref('');
const latestCycle = ref(null);
const islandStore = useIslandStore();
const populationStore = usePopulationStore();
const cycleForm = reactive({
  startedDate: null,
  notes: '',
});

const headers = [
  { title: 'Час', key: 'timestamp' },
  { title: 'Користувач', key: 'user' },
  { title: 'Дія', key: 'action' },
];

const cycleDurationLabel = computed(() => {
  const start = normalizeFaerunDate(cycleForm.startedDate);
  const previousCycleStart = parseFaerunDate(latestCycle.value?.startedAt);

  if (!start || !previousCycleStart) return 'Тривалість буде розрахована автоматично';

  const diff = diffInDays(previousCycleStart, start);
  if (diff === null) return 'Тривалість буде розрахована автоматично';
  if (diff <= 0) return 'Дата початку нового циклу має бути пізнішою за попередній';

  return `${diff} днів`;
});

async function loadLatestCycle() {
  const cyclesRef = collection(db, 'cycles');
  const latestCycleQuery = query(cyclesRef, orderBy('createdAt', 'desc'), limit(1));
  const snapshot = await getDocs(latestCycleQuery);
  latestCycle.value = snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
}

function suggestNextCycleDate() {
  const previousCycleStart = parseFaerunDate(latestCycle.value?.startedAt);
  if (!previousCycleStart) {
    const now = new Date();
    return {
      day: now.getUTCDate(),
      month: now.getUTCMonth(),
      year: DEFAULT_YEAR,
    };
  }

  const totalDays = previousCycleStart.month * 30 + (previousCycleStart.day - 1) + 7;
  const normalizedMonth = ((totalDays % 360) + 360) % 360;
  const yearShift = Math.floor(totalDays / 360);
  return {
    day: (normalizedMonth % 30) + 1,
    month: Math.floor(normalizedMonth / 30),
    year: previousCycleStart.year + yearShift,
  };
}

async function createCycle() {
  cycleError.value = '';
  cycleSuccess.value = '';

  if (!normalizeFaerunDate(cycleForm.startedDate)) {
    cycleError.value = 'Вкажіть початок циклу.';
    return;
  }

  cycleSaving.value = true;
  try {
    await createNewCycleWithEffects({
      startedDate: cycleForm.startedDate,
      notes: cycleForm.notes,
      islandId: islandStore.currentId || 'island_rock',
      population: populationStore.totalPopulation,
      populationItems: populationStore.items || [],
    });
    cycleSuccess.value = 'Новий цикл успішно створено.';
    cycleForm.notes = '';
    await loadLatestCycle();
    cycleForm.startedDate = suggestNextCycleDate();
  } catch (error) {
    console.error('[admin] Failed to create cycle', error);
    cycleError.value = 'Не вдалося створити новий цикл.';
  } finally {
    cycleSaving.value = false;
  }
}

onMounted(async () => {
  populationStore.startListener(islandStore.currentId || 'island_rock');
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  logEntries.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  await loadLatestCycle();
  cycleForm.startedDate = suggestNextCycleDate();
});

onBeforeUnmount(() => {
  populationStore.stopListener();
});

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return '-';
  const date = timestamp.toDate();
  return date.toLocaleString('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
</script>

<style scoped>
</style>
