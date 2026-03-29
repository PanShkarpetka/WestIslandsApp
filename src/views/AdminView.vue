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

      <v-card-title class="text-h6">Герої</v-card-title>
      <v-alert v-if="heroError" type="error" variant="tonal" class="mb-4">{{ heroError }}</v-alert>
      <v-alert v-if="heroSuccess" type="success" variant="tonal" class="mb-4">{{ heroSuccess }}</v-alert>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Додати нового героя</div>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="newHeroForm.name" label="Ім'я героя" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="newHeroForm.religionId"
              :items="religionOptions"
              label="Релігія"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="newHeroForm.dndbeyondCharacterId"
              label="dndbeyondCharacterId"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-end">
            <v-btn color="primary" prepend-icon="mdi-account-plus" :loading="heroSaving" @click="createHero">
              Додати героя
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-data-table
        :headers="heroHeaders"
        :items="heroRows"
        :items-per-page="10"
        class="elevation-1 mb-2"
        density="compact"
      >
        <template #item.name="{ item }">
          <span class="text-body-2">{{ item.name }}</span>
        </template>
        <template #item.religionName="{ item }">
          {{ item.religionName || '—' }}
        </template>
        <template #item.downtimeAvailable="{ item }">
          <v-chip size="small" :color="item.downtimeAvailable ? 'warning' : 'success'" variant="tonal">
            {{ item.downtimeAvailable ? 'Дія не виконана' : 'Дія виконана' }}
          </v-chip>
        </template>
        <template #item.inactive="{ item }">
          <v-chip size="small" :color="item.inactive ? 'error' : 'success'" variant="tonal">
            {{ item.inactive ? 'Неактивний' : 'Активний' }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="openHeroEditor(item)">Редагувати</v-btn>
        </template>
      </v-data-table>

      <v-dialog v-model="heroEditDialog" max-width="560">
        <v-card>
          <v-card-title class="text-h6">Редагування героя</v-card-title>
          <v-card-text>
            <v-text-field v-model="editHeroForm.name" label="Ім'я героя" class="mb-2" />
            <v-select
              v-model="editHeroForm.religionId"
              :items="religionOptions"
              label="Релігія"
              class="mb-2"
            />
            <v-text-field
              v-model="editHeroForm.dndbeyondCharacterId"
              label="dndbeyondCharacterId"
              class="mb-2"
            />
            <v-switch v-model="editHeroForm.downtimeAvailable" label="Дія не виконана" inset color="warning" />
            <v-switch v-model="editHeroForm.inactive" label="Неактивний герой" inset color="error" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="heroEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="heroSaving" @click="saveHero">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

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
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
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

const heroes = ref([]);
const religions = ref([]);
const clergyRows = ref([]);
const heroSaving = ref(false);
const heroError = ref('');
const heroSuccess = ref('');
const heroEditDialog = ref(false);
const selectedHeroId = ref('');

const newHeroForm = reactive({
  name: '',
  religionId: '',
  dndbeyondCharacterId: '',
});

const editHeroForm = reactive({
  name: '',
  religionId: '',
  dndbeyondCharacterId: '',
  downtimeAvailable: true,
  inactive: false,
});

let stopHeroes = null;
let stopReligions = null;
let stopClergy = null;

const headers = [
  { title: 'Час', key: 'timestamp' },
  { title: 'Користувач', key: 'user' },
  { title: 'Дія', key: 'action' },
];

const heroHeaders = [
  { title: 'Герой', key: 'name' },
  { title: 'Релігія', key: 'religionName' },
  { title: 'Статус дії', key: 'downtimeAvailable' },
  { title: 'Стан героя', key: 'inactive' },
  { title: '', key: 'actions', sortable: false },
];

const religionOptions = computed(() =>
  religions.value.map((item) => ({
    title: item.name,
    value: item.id,
  })),
);

const clergyByHeroId = computed(() => {
  const map = new Map();
  for (const row of clergyRows.value) {
    if (row.heroId) map.set(row.heroId, row);
  }
  return map;
});

const religionById = computed(() => {
  const map = new Map();
  for (const religion of religions.value) {
    map.set(religion.id, religion);
  }
  return map;
});

const heroRows = computed(() =>
  heroes.value
    .map((hero) => {
      const clergy = clergyByHeroId.value.get(hero.id) || null;
      const religionId = clergy?.religionId || '';

      return {
        ...hero,
        religionId,
        religionName: religionById.value.get(religionId)?.name || '—',
        clergyId: clergy?.id || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA')),
);

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

function subscribeHeroData() {
  stopHeroes = onSnapshot(collection(db, 'heroes'), (snapshot) => {
    heroes.value = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};

      return {
        id: docSnap.id,
        name: data.name || data.heroName || data.nickname || docSnap.id,
        dndbeyondCharacterId: data.dndbeyondCharacterId || '',
        downtimeAvailable: data.downtimeAvailable !== false,
        inactive: Boolean(data.inactive),
      };
    });
  });

  stopReligions = onSnapshot(collection(db, 'religions'), (snapshot) => {
    religions.value = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data()?.name || docSnap.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'));
  });

  stopClergy = onSnapshot(collection(db, 'clergy'), (snapshot) => {
    clergyRows.value = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const heroRefPath = data.hero?.path || '';
      const religionRefPath = data.religion?.path || '';

      return {
        id: docSnap.id,
        heroId: heroRefPath.split('/')[1] || '',
        religionId: religionRefPath.split('/')[1] || '',
      };
    });
  });
}

function openHeroEditor(hero) {
  selectedHeroId.value = hero.id;
  editHeroForm.name = hero.name;
  editHeroForm.religionId = hero.religionId;
  editHeroForm.dndbeyondCharacterId = hero.dndbeyondCharacterId || '';
  editHeroForm.downtimeAvailable = hero.downtimeAvailable;
  editHeroForm.inactive = hero.inactive;
  heroEditDialog.value = true;
}

async function createHero() {
  heroError.value = '';
  heroSuccess.value = '';

  const name = newHeroForm.name.trim();
  if (!name) {
    heroError.value = 'Вкажіть імʼя героя.';
    return;
  }
  if (!newHeroForm.religionId) {
    heroError.value = 'Оберіть релігію для героя.';
    return;
  }
  const dndbeyondCharacterId = newHeroForm.dndbeyondCharacterId.trim();

  heroSaving.value = true;
  try {
    const religionRef = doc(db, 'religions', newHeroForm.religionId);
    await runTransaction(db, async (transaction) => {
      const heroRef = doc(collection(db, 'heroes'));
      const clergyRef = doc(collection(db, 'clergy'));

      transaction.set(heroRef, {
        name,
        dndbeyondCharacterId,
        downtimeAvailable: true,
        inactive: false,
        createdAt: serverTimestamp(),
      });

      transaction.set(clergyRef, {
        hero: heroRef,
        religion: religionRef,
        faith: 0,
        faithMax: 0,
        createdAt: serverTimestamp(),
      });
    });

    newHeroForm.name = '';
    newHeroForm.religionId = '';
    newHeroForm.dndbeyondCharacterId = '';
    heroSuccess.value = 'Героя створено, духовенство додано автоматично.';
  } catch (error) {
    console.error('[admin] Failed to create hero', error);
    heroError.value = 'Не вдалося створити героя.';
  } finally {
    heroSaving.value = false;
  }
}

async function saveHero() {
  heroError.value = '';
  heroSuccess.value = '';

  const name = editHeroForm.name.trim();
  if (!selectedHeroId.value) {
    heroError.value = 'Не вдалося визначити героя для редагування.';
    return;
  }
  if (!name) {
    heroError.value = 'Вкажіть імʼя героя.';
    return;
  }
  if (!editHeroForm.religionId) {
    heroError.value = 'Оберіть релігію для героя.';
    return;
  }
  const dndbeyondCharacterId = editHeroForm.dndbeyondCharacterId.trim();

  heroSaving.value = true;
  try {
    const heroRef = doc(db, 'heroes', selectedHeroId.value);
    const currentHero = heroRows.value.find((item) => item.id === selectedHeroId.value);
    const targetReligionRef = doc(db, 'religions', editHeroForm.religionId);

    await runTransaction(db, async (transaction) => {
      transaction.update(heroRef, {
        name,
        dndbeyondCharacterId,
        downtimeAvailable: editHeroForm.downtimeAvailable,
        inactive: editHeroForm.inactive,
        updatedAt: serverTimestamp(),
      });

      if (currentHero?.clergyId) {
        transaction.update(doc(db, 'clergy', currentHero.clergyId), {
          religion: targetReligionRef,
        });
      } else {
        const clergyRef = doc(collection(db, 'clergy'));
        transaction.set(clergyRef, {
          hero: heroRef,
          religion: targetReligionRef,
          faith: 0,
          faithMax: 0,
          createdAt: serverTimestamp(),
        });
      }
    });

    heroEditDialog.value = false;
    heroSuccess.value = 'Дані героя оновлено.';
  } catch (error) {
    console.error('[admin] Failed to save hero', error);
    heroError.value = 'Не вдалося оновити героя.';
  } finally {
    heroSaving.value = false;
  }
}

onMounted(async () => {
  populationStore.startListener(islandStore.currentId || 'island_rock');
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  logEntries.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  await loadLatestCycle();
  cycleForm.startedDate = suggestNextCycleDate();
  subscribeHeroData();
});

onBeforeUnmount(() => {
  populationStore.stopListener();
  stopHeroes?.();
  stopReligions?.();
  stopClergy?.();
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
