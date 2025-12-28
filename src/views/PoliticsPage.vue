<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Актуальні пропозиції</h1>
      </v-col>
    </v-row>
    <div v-if="!proposals.length">
      Наразі немає актуальних пропозицій.
    </div>
    <v-row v-if="!isAdmin" justify="space-between" align="center" class="my-4">
      <v-col cols="12">
        <div class="space-y-4">
          <v-card
              v-for="p in proposals"
              :key="p.id"
              class="proposal-card overflow-hidden with-bg"
              elevation="1"
              rounded="xl"
          >
            <!-- header -->
            <div class="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
              <div class="text-h6 font-semibold leading-tight">{{ p.title }}</div>

              <v-chip
                  density="comfortable"
                  size="small"
                  class="votes-chip"
                  variant="elevated"
              >
                {{ VOTE_FMT(proposalVotes[p.id] ?? 0) }} / {{ VOTE_FMT(TOTAL_VOTES) }} голосів
              </v-chip>
            </div>

            <!-- body -->
            <div class="px-5 pb-2 text-[15px] text-gray-700 clamp-3 proposal-summary">
              {{ p.summary || '—' }}
            </div>

            <!-- progress -->
            <div class="px-5 pb-4">
              <v-progress-linear
                  :model-value="Math.round(((proposalVotes[p.id] ?? 0) / TOTAL_VOTES) * 1000) / 10"
                  height="8"
                  color="success"
                  rounded
                  class="progress"
              />
              <div class="progress-meta">
                Підтримка: <b>{{ Math.round(((proposalVotes[p.id] ?? 0) / TOTAL_VOTES) * 1000) / 10 }}%</b>
              </div>
            </div>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <!-- ==== ADMIN VIEW ==== -->
    <div v-else class="space-y-8">
      <!-- Proposals table -->
      <div class="space-y-4">
        <div v-if="proposals.length === 0" class="text-gray-500">
          Немає пропозицій.
        </div>

        <v-table class="rounded-xl border">
          <thead>
          <tr>
            <th><b>Назва</b></th>
            <th><b>Опис</b></th>
            <th class="text-center"><b>Актуальна</b></th>
            <th class="text-center"><b>Голосів (всього)</b></th>
            <th class="text-center"><b>Дії</b></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="p in proposals" :key="p.id">
            <td class="font-medium">{{ p.title }}</td>
            <td class="admin-table-summary text-sm">{{ p.summary || '—' }}</td>
            <td class="text-center">
              <v-switch
                  :model-value="p.actual"
                  inset
                  color="blue"
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
      <!-- Add proposal -->
      <div class="rounded-xl border p-4 space-y-3">
        <h4 class="text-center">Додати пропозицію</h4>
        <div class="admin-proposal-input grid gap-3 md:grid-cols-2">
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
        <v-btn class="admin-proposal-input" :loading="adding" color="primary" @click="addProposal">
          Додати
        </v-btn>
      </div>
    </div>
    <!-- Interests matrix -->
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Інтереси груп</h1>
      </v-col>
    </v-row>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="12">
        Всього голосів: <b>{{ VOTE_FMT(TOTAL_VOTES) }}</b>;
        Розподіл між групами:
        <span v-for="g in groups" :key="g.id" class="ml-2">
            {{ g.name || g.id }} — <b>{{ VOTE_FMT(groupVotes[g.id] || 0) }}</b>
          </span>
      </v-col>
    </v-row>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="12" class="rounded-xl border">
        <div class="matrix-wrap">
          <table class="matrix">
          <thead>
          <tr>
            <th class="sticky-col p-3 text-left">Населення групи</th>
            <th class="p-3 text-center col-votes">Голоси групи</th>
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
            <td class="sticky-col p-3 font-medium">{{ g.name || g.id }} - {{ g.count }}. Вагаються: {{ groupUndecided[g.id] }}</td>
            <td class="p-3 text-center col-votes">{{ VOTE_FMT(groupVotes[g.id] || 0) }}</td>

            <td v-for="p in proposals" :key="p.id" class="p-2">
              <v-text-field
                  type="number"
                  min="0"
                  :model-value="interests[keyGI(g.id,p.id)]?.people ?? 0"
                  hide-details
                  density="compact"
                  @update:model-value="val => updatePeople(g.id, p.id, val)"
                  :disabled="!isAdmin"
              />
              <div class="mt-1 text-[11px] text-gray-500 text-center">
                Голоси від групи: {{ VOTE_FMT(cellVotes(g.id, p.id)) }}
              </div>
            </td>
          </tr>
          </tbody>
          </table>
        </div>
      </v-col>

      <p :hidden="!isAdmin" class="text-sm text-gray-600">
        Адмін заповнює <b>кількість осіб</b> (people), яких цікавить кожна
        пропозиція. Система автоматично розподіляє групові голоси
        (із {{ VOTE_FMT(TOTAL_VOTES) }} загальних) між пропозиціями пропорційно
        значенням people з точністю до десятих.
      </p>
    </v-row>
  </v-container>
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
import { useUserStore } from "@/store/userStore.js";
import { useInterestGroupStore } from '@/store/interestGroupStore';

const auth = useUserStore()

// =================== CONFIG ===================
const db = getFirestore();
const TOTAL_VOTES = 10;         // загальний пул голосів (з точністю до 0.1)
const DECIMALS = 1;             // 1 знак після коми
const VOTE_FMT = (n) => (Number(n) || 0).toFixed(DECIMALS);

const isAdmin = computed(() => auth?.isAdmin ?? false)

// =================== STATE ====================
const proposals = ref([]);      // [{id, title, summary, actual, createdAt}, ...]
const interestGroupStore = useInterestGroupStore();
const groups = computed(() => interestGroupStore.items || []);   // [{id, name, count}, ...]
const interests = ref({});      // { `${groupId}_${proposalId}`: {id, groupId, proposalId, people} }

let unsubProposals, unsubInterests;

// =================== SUBSCRIPTIONS ============
onMounted(() => {
  // Groups (наприклад: sailors/peasants/workers)
  interestGroupStore.startListener();

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
  unsubInterests && unsubInterests();
  interestGroupStore.stopListener();
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
    const pop = groupPop(g);
    const gVotes = Number(groupVotes.value[g.id] || 0);
    if (pop <= 0 || gVotes <= 0) return;

    const peopleByP = proposals.value.map(p => {
      const it = interests.value[keyGI(g.id, p.id)];
      return Math.max(0, Math.floor(Number(it?.people) || 0));
    });
    const sumPeople = peopleByP.reduce((a, b) => a + b, 0);
    if (sumPeople <= 0) return;

    // РОЗПОДІЛЯЄМО ЛИШЕ ЧАСТКУ квоти, що вже має вподобання
    const ratio = Math.min(1, sumPeople / pop);
    const totalAlloc = gVotes * ratio;                 // ← не вся квота, а її частка
    const dist = apportionFixed(totalAlloc, peopleByP, DECIMALS);

    proposals.value.forEach((p, idx) => {
      byProposal[p.id] = +(((byProposal[p.id] || 0) + dist[idx]).toFixed(DECIMALS));
    });
  });

  return byProposal; // сума може бути < TOTAL_VOTES (нерозподілена частка = «вагаються»)
});
const groupCellVotes = computed(() => {
  const out = {};
  groups.value.forEach(g => {
    const pop = groupPop(g);
    const gVotes = Number(groupVotes.value[g.id] || 0);
    const perProposal = {};
    if (pop > 0 && gVotes > 0) {
      const peopleByP = proposals.value.map(p => {
        const it = interests.value[keyGI(g.id, p.id)];
        return Math.max(0, Math.floor(Number(it?.people) || 0));
      });
      const sumPeople = peopleByP.reduce((a, b) => a + b, 0);

      if (sumPeople > 0) {
        const ratio = Math.min(1, sumPeople / pop);
        const totalAlloc = gVotes * ratio;
        const dist = apportionFixed(totalAlloc, peopleByP, DECIMALS);
        proposals.value.forEach((p, idx) => {
          perProposal[p.id] = +dist[idx].toFixed(DECIMALS);
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

const groupPop = (g) => Number(g?.population ?? g?.count ?? 0) || 0;

// скільки осіб уже мають вподобання (усі інпути по пропозиціях) у межах групи
const groupPeopleTotals = computed(() => {
  const res = {};
  groups.value.forEach(g => {
    let sum = 0;
    proposals.value.forEach(p => {
      const it = interests.value[keyGI(g.id, p.id)];
      sum += Math.max(0, Math.floor(Number(it?.people) || 0)); // цілі особи
    });
    res[g.id] = sum;
  });
  return res; // { groupId: usedPeople }
});

// скільки вагаються = населення - заповнені вподобання
const groupUndecided = computed(() => {
  const res = {};
  groups.value.forEach(g => {
    const pop = groupPop(g);
    const used = groupPeopleTotals.value[g.id] || 0;
    res[g.id] = Math.max(0, pop - used);
  });
  return res; // { groupId: undecidedPeople }
});

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
/* ширина як на сторінці зборів */


/* заголовок розділу */
.page-title { font-size: 28px; font-weight: 800; }

/* картка у стилі «цілей зборів» */
.proposal-card {
  border-radius: 16px;
  background: #fff;
  min-height: 250px;
}

/* темна пігулка голосів, як бейджі на «зборах» */
.votes-chip {
  background: #2f2f2f !important;
  color: #fff !important;
  font-weight: 600;
}

/* прогрес і підпис під ним */
.progress { --v-theme-success: #1a9c52; }
.progress-meta {
  margin-top: 6px;
  font-size: 12px;
}

/* обрізання опису на 3 рядки */
.clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.matrix-wrap {
  max-height: 70vh;        /* можна підкрутити під сторінку */
  overflow: auto;          /* і вертикальний, і горизонтальний скрол */
  width: 100%;
  -webkit-overflow-scrolling: touch; /* плавний скрол на мобільних */
  background: #fff;
}

/* Базова таблиця */
.matrix {
  width: 100%;
  min-width: 960px;        /* щоб з’являвся горизонтальний скрол при багатьох колонках */
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.matrix th, .matrix td { padding: 12px; }
.matrix thead th {
  white-space: normal;              /* ← дозволити перенос */
  overflow-wrap: anywhere;
}

/* Липкий заголовок */
.matrix thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  box-shadow: inset 0 -1px 0 #e5e7eb; /* лінія під хедером */
}

/* Липка перша колонка ("Група") */
.matrix .sticky-col {
  position: sticky;
  left: 0;
  z-index: 15;
  background: #fff;              /* перекриває сусідні клітинки при скролі */
  box-shadow: 1px 0 0 #e5e7eb;   /* вертикальна лінія справа */
}

/* акуратні межі між рядками */
.matrix tbody tr { border-top: 1px solid #e5e7eb; }

.col-votes {
  width: 80px;
}

.admin-proposal-input {
  margin: 10px;
}

.with-bg {
  --bgW: 42%;
  background:
      linear-gradient(rgba(255,255,255,.55),
      rgba(255,255,255,.55)),
      url('@/images/politics/proposal-bg.png') no-repeat right center / var(--bgW) auto;
  position: relative;
}
.with-bg > *{
  padding-right: calc(var(--bgW) + 12px);
}
@media (max-width: 960px){
  .with-bg{ --bgW: 50%; }
}
@media (max-width: 600px){
  .with-bg{ --bgW: 100%; }
}
.proposal-summary {
  width: auto;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.proposal-summary.clamp-3{
  display: block;
  -webkit-line-clamp: initial;
  -webkit-box-orient: initial;
  overflow: visible;
}
@media (min-width: 900px){
  .proposal-summary.clamp-3{
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* Optional: shrink/hide the image on very small screens */
@media (max-width: 600px){ .with-bg{ --bgW: 100%; } }

</style>
