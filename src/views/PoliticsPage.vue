<template>
  <section class="space-y-8">

    <!-- ==== USER VIEW ==== -->
    <div v-if="!isAdmin" class="space-y-4">
      <h2 class="text-xl font-semibold">Актуальні пропозиції</h2>

      <div v-if="proposals.length === 0" class="text-gray-500">
        Наразі немає актуальних пропозицій.
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <v-card v-for="p in proposals" :key="p.id" class="rounded-xl">
          <v-card-title class="flex items-center justify-between">
            <span>{{ p.title }}</span>
            <v-chip variant="flat" size="small">
              {{ VOTE_FMT(proposalVotes[p.id] ?? 0) }} / {{ VOTE_FMT(TOTAL_VOTES) }} голосів
            </v-chip>
          </v-card-title>
          <v-card-text class="text-sm text-gray-700 whitespace-pre-line">
            {{ p.summary || '—' }}
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- ==== ADMIN VIEW ==== -->
    <div v-else class="space-y-8">
      <!-- Add proposal -->
      <div class="rounded-xl border p-4 space-y-3">
        <h2 class="text-lg font-semibold">Додати пропозицію</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <v-text-field
              v-model="newProposal.title"
              label="Назва"
              density="comfortable"
          />
          <v-text-field
              v-model="newProposal.summary"
              label="Короткий опис"
              density="comfortable"
          />
        </div>
        <v-btn :loading="adding" color="primary" @click="addProposal">
          Додати
        </v-btn>
      </div>

      <!-- Proposals table -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Усі пропозиції (адмін)</h2>
        <div v-if="proposals.length === 0" class="text-gray-500">
          Немає пропозицій.
        </div>

        <v-table class="rounded-xl border">
          <thead>
          <tr>
            <th>Назва</th>
            <th>Опис</th>
            <th class="text-center">Актуальна</th>
            <th class="text-right">Голосів (всього)</th>
            <th class="text-right">Дії</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="p in proposals" :key="p.id">
            <td class="font-medium">{{ p.title }}</td>
            <td class="text-sm">{{ p.summary || '—' }}</td>
            <td class="text-center">
              <v-switch
                  :model-value="p.actual"
                  inset
                  hide-details
                  @click.stop="toggleActual(p)"
              />
            </td>
            <td class="text-right">
              <v-chip size="small" variant="flat">
                {{ VOTE_FMT(proposalVotes[p.id] ?? 0) }}
              </v-chip>
            </td>
            <td class="text-right">
              <v-btn variant="text" color="error" @click="deleteProposal(p)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
          </tbody>
        </v-table>
      </div>

      <!-- Interests matrix -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Інтереси груп → пропозиції</h2>
          <div class="text-sm text-gray-600">
            Всього голосів: <b>{{ VOTE_FMT(TOTAL_VOTES) }}</b>;
            Розподіл між групами:
            <span v-for="g in groups" :key="g.id" class="ml-2">
              {{ g.name || g.id }} — <b>{{ VOTE_FMT(groupVotes[g.id] || 0) }}</b>
            </span>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border">
          <table class="min-w-[720px] w-full">
            <thead>
            <tr>
              <th class="p-3 text-left">Група</th>
              <th class="p-3 text-right">Населення</th>
              <th class="p-3 text-right">Голоси групи</th>
              <th
                  v-for="p in proposals"
                  :key="p.id"
                  class="p-3 text-center"
              >
                {{ p.title }}
                <div class="text-xs text-gray-500">
                  (всього голосів: {{ VOTE_FMT(proposalVotes[p.id] ?? 0) }})
                </div>
              </th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="g in groups" :key="g.id" class="border-t">
              <td class="p-3 font-medium">{{ g.name || g.id }}</td>
              <td class="p-3 text-right">{{ g.count }}</td>
              <td class="p-3 text-right">{{ VOTE_FMT(groupVotes[g.id] || 0) }}</td>

              <td v-for="p in proposals" :key="p.id" class="p-2">
                <v-text-field
                    type="number"
                    min="0"
                    :model-value="interests[keyGI(g.id,p.id)]?.people ?? 0"
                    hide-details
                    density="compact"
                    @update:model-value="val => updatePeople(g.id, p.id, val)"
                />
                <div class="mt-1 text-[11px] text-gray-500 text-center">
                  Голоси від групи: {{ VOTE_FMT(cellVotes(g.id, p.id)) }}
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <p class="text-sm text-gray-600">
          Адмін заповнює <b>кількість осіб</b> (people), яких цікавить кожна
          пропозиція. Система автоматично розподіляє групові голоси
          (із {{ VOTE_FMT(TOTAL_VOTES) }} загальних) між пропозиціями пропорційно
          значенням people з точністю до десятих.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * PoliticsPage.vue
 * - Користувачам показує тільки актуальні пропозиції (actual: true) і підсумкові голоси.
 * - Адмін: CRUD пропозицій, toggle actual, редагування "people" у матриці інтересів.
 * - Голоси розподіляються з точністю до однієї десятки (0.1).
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  getFirestore, collection, doc, addDoc, deleteDoc, updateDoc, setDoc,
  onSnapshot, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { apportionFixed } from '@/utils/votes';
import {useUserStore} from "@/store/userStore.js";

const auth = useUserStore()

// =================== CONFIG ===================
const db = getFirestore();
const TOTAL_VOTES = 10;         // загальний пул голосів (з точністю до 0.1)
const DECIMALS = 1;             // 1 знак після коми
const VOTE_FMT = (n) => (Number(n) || 0).toFixed(DECIMALS);

const isAdmin = computed(() => auth?.isAdmin ?? false)

// =================== STATE ====================
const proposals = ref([]);      // [{id, title, summary, actual, createdAt}, ...]
const groups = ref([]);         // [{id, name, count}, ...]
const interests = ref({});      // { `${groupId}_${proposalId}`: {id, groupId, proposalId, people} }

let unsubProposals, unsubGroups, unsubInterests;

// =================== SUBSCRIPTIONS ============
onMounted(() => {
  // Groups (наприклад: sailors/peasants/workers)
  unsubGroups = onSnapshot(collection(db, 'interestGroup'), (snap) => {
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    groups.value = arr;
  });

  // Proposals
  const base = collection(db, 'proposals');
  const q = isAdmin.value
      ? query(base, orderBy('createdAt', 'desc'))
      : query(base, where('actual', '==', true), orderBy('createdAt', 'desc'));

  unsubProposals = onSnapshot(q, (snap) => {
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    proposals.value = arr;
  });

  // Interests (усі; фільтруємо при обчисленнях)
  unsubInterests = onSnapshot(collection(db, 'interests'), (snap) => {
    const map = {};
    snap.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
    interests.value = map;
  });
});

onBeforeUnmount(() => {
  unsubProposals && unsubProposals();
  unsubGroups && unsubGroups();
  unsubInterests && unsubInterests();
});

// =================== HELPERS ==================
const keyGI = (groupId, proposalId) => `${groupId}_${proposalId}`;

// Розподіл голосів між групами пропорційно population (у десятках)
const groupVotes = computed(() => {
  const pops = groups.value.map(g => Number(g.count) || 0);
  const shares = apportionFixed(TOTAL_VOTES, pops, DECIMALS);
  const res = {};
  groups.value.forEach((g, idx) => { res[g.id] = shares[idx]; });
  return res; // напр.: { sailors: 3.4, peasants: 4.7, workers: 1.9 }
});

// Розподіл голосів по пропозиціях (сума по всіх групах) у десятках
const proposalVotes = computed(() => {
  const byProposal = {};
  proposals.value.forEach(p => { byProposal[p.id] = 0; });

  groups.value.forEach(g => {
    const gVotes = Number(groupVotes.value[g.id] || 0);
    if (gVotes <= 0) return;

    // people по пропозиціях для цієї групи
    const peopleByP = proposals.value.map(p => {
      const it = interests.value[keyGI(g.id, p.id)];
      return Number(it?.people) || 0;
    });
    const sumPeople = peopleByP.reduce((a, b) => a + b, 0);
    if (sumPeople <= 0) return;

    // Розподіл голосів групи між її пропозиціями (0.1 точність)
    const dist = apportionFixed(gVotes, peopleByP, DECIMALS);

    // Сумуємо у загальний підсумок по пропозиції
    proposals.value.forEach((p, idx) => {
      byProposal[p.id] = +( (byProposal[p.id] || 0) + dist[idx] ).toFixed(DECIMALS);
    });
  });

  return byProposal; // { [proposalId]: число з 1 десятковим }
});
const groupCellVotes = computed(() => {
  const out = {};
  groups.value.forEach(g => {
    const gVotes = Number(groupVotes.value[g.id] || 0);
    const perProposal = {};
    if (gVotes > 0) {
      const peopleByP = proposals.value.map(p => {
        const it = interests.value[keyGI(g.id, p.id)];
        return Number(it?.people) || 0;
      });
      const sumPeople = peopleByP.reduce((a, b) => a + b, 0);

      if (sumPeople > 0) {
        const dist = apportionFixed(gVotes, peopleByP, DECIMALS);
        proposals.value.forEach((p, idx) => {
          perProposal[p.id] = +(dist[idx]).toFixed(DECIMALS);
        });
      } else {
        proposals.value.forEach(p => { perProposal[p.id] = 0; });
      }
    } else {
      proposals.value.forEach(p => { perProposal[p.id] = 0; });
    }
    out[g.id] = perProposal;
  });
  return out;
});
const cellVotes = (groupId, proposalId) =>
    groupCellVotes.value?.[groupId]?.[proposalId] ?? 0;
// =================== MUTATIONS (ADMIN) ========
const newProposal = ref({ title: '', summary: '' });
const adding = ref(false);

async function addProposal() {
  if (!newProposal.value.title.trim()) return;
  adding.value = true;
  await addDoc(collection(db, 'proposals'), {
    title: newProposal.value.title.trim(),
    summary: newProposal.value.summary.trim(),
    actual: true,
    createdAt: serverTimestamp(),
  });
  newProposal.value = { title: '', summary: '' };
  adding.value = false;
}

async function deleteProposal(p) {
  await deleteDoc(doc(db, 'proposals', p.id));
  const deletes = [];
  Object.values(interests.value).forEach(it => {
    if (it.proposalId === p.id) {
      deletes.push(deleteDoc(doc(db, 'interests', it.id)));
    }
  });
  await Promise.all(deletes);
}

async function toggleActual(p) {
  await updateDoc(doc(db, 'proposals', p.id), { actual: !p.actual });
}

function ensureIntDoc(groupId, proposalId) {
  const id = keyGI(groupId, proposalId);
  if (!interests.value[id]) {
    return setDoc(doc(db, 'interests', id), {
      groupId, proposalId, people: 0,
    });
  }
  return Promise.resolve();
}

async function updatePeople(groupId, proposalId, value) {
  const id = keyGI(groupId, proposalId);
  const people = Math.max(0, Math.floor(Number(value) || 0)); // цілі особи
  await ensureIntDoc(groupId, proposalId);
  await updateDoc(doc(db, 'interests', id), { people });
}
</script>



<style scoped>
.space-y-8 > * + * { margin-top: 2rem; }
.space-y-4 > * + * { margin-top: 1rem; }
</style>
