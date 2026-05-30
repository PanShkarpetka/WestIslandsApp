<template>
  <v-container class="fishing-page">

    <!-- Header -->
    <div class="fishing-header">
      <div class="fishing-title">
        <v-icon class="mr-2" size="20">mdi-fish</v-icon>
        Таблиця рибалок
      </div>
      <v-select
        v-model="timeFilter"
        :items="filterOptions"
        item-title="label"
        item-value="value"
        density="compact"
        variant="outlined"
        hide-details
        class="filter-select"
      />
    </div>

    <div v-if="store.error" class="fishing-error">
      <v-icon class="mr-2" size="14">mdi-skull-crossbones</v-icon>{{ store.error }}
    </div>

    <!-- Summary stats -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6">
        <div class="stat-card">
          <div class="stat-value wi-number">{{ totalCatches }}</div>
          <div class="stat-label wi-muted-text">Всього зловлено</div>
        </div>
      </v-col>
      <v-col cols="12" sm="6">
        <div class="stat-card">
          <div class="stat-value wi-number">{{ successRate }}%</div>
          <div class="stat-label wi-muted-text">Успішність</div>
        </div>
      </v-col>
    </v-row>

    <!-- Rankings table -->
    <div class="section-title">
      <v-icon class="mr-2" size="16">mdi-podium</v-icon>
      Рейтинг рибалок
    </div>

    <div class="rankings-table-wrap mb-6">
      <v-table density="compact" class="rankings-table">
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="sortable-col"
              :class="{ 'active-sort': sortKey === col.key }"
              @click="setSort(col.key)"
            >
              {{ col.label }}
              <v-icon v-if="sortKey === col.key" size="12" class="ml-1">
                {{ sortDesc ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
              </v-icon>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading">
            <td colspan="7" class="text-center wi-muted-text py-4">Завантаження...</td>
          </tr>
          <tr v-else-if="sortedAnglers.length === 0">
            <td colspan="7" class="text-center wi-muted-text py-4">Немає даних за вибраний період</td>
          </tr>
          <tr v-for="(angler, idx) in sortedAnglers" :key="angler.username" class="angler-row">
            <td class="rank-col">
              <span v-if="idx === 0">🥇</span>
              <span v-else-if="idx === 1">🥈</span>
              <span v-else-if="idx === 2">🥉</span>
              <span v-else class="wi-muted-text">{{ idx + 1 }}</span>
            </td>
            <td class="angler-name">{{ angler.username }}</td>
            <td class="wi-gold-text">{{ angler.catches }}</td>
            <td>{{ formatAmount(angler.totalSilver) }}</td>
            <td class="wi-muted-text">{{ angler.bestFish || '—' }}</td>
            <td>{{ angler.winRate }}%</td>
            <td class="wi-muted-text">{{ angler.attempts }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <!-- Rare catches hall of fame -->
    <div v-if="store.rareCatches.length > 0" class="section-title">
      <v-icon class="mr-2" size="16">mdi-trophy</v-icon>
      Найрідкісніші улови
    </div>
    <div v-if="store.rareCatches.length > 0" class="rare-catches-row mb-6">
      <div v-for="(catch_, i) in store.rareCatches" :key="i" class="rare-catch-card">
        <div class="rare-rank wi-muted-text">#{{ i + 1 }}</div>
        <div class="rare-fish-name wi-gold-text">{{ catch_.fishName }}</div>
        <div class="rare-angler wi-muted-text">
          <v-icon size="12" class="mr-1">mdi-hook</v-icon>{{ catch_.username }}
        </div>
        <div class="rare-value wi-number">{{ formatAmount(catch_.fishValue) }} <span class="wi-coin">SP</span></div>
        <div class="rare-date wi-muted-text">{{ formatDate(catch_.timestamp) }}</div>
      </div>
    </div>

    <!-- Fish availability -->
    <div class="section-title mt-2">
      <v-icon class="mr-2" size="16">mdi-waves</v-icon>
      Наявність риби
      <span v-if="isAdmin" class="avail-admin-hint wi-muted-text ml-auto">
        <v-icon size="13" class="mr-1">mdi-pencil</v-icon>натисніть на рибу для зміни
      </span>
    </div>
    <div class="avail-overall-card mb-6">
      <div class="avail-bar-wrap">
        <div
          class="avail-bar"
          :style="{ width: (fishStore.availabilityRating * 10) + '%', background: ratingColor(fishStore.availabilityRating) }"
        />
      </div>
      <div class="avail-overall-bottom">
        <span class="avail-overall-score" :style="{ color: ratingColor(fishStore.availabilityRating) }">
          {{ fishStore.availabilityRating }}/10
        </span>
        <span class="avail-overall-desc wi-muted-text">{{ ratingLabel(fishStore.availabilityRating) }}</span>
        <div v-if="isAdmin" class="avail-rating-controls ml-auto">
          <v-btn
            icon size="x-small" variant="tonal"
            :disabled="fishStore.availabilityRating <= 0 || adjustingRating"
            :loading="adjustingRating && ratingDelta === -1"
            @click="doAdjustRating(-1)"
          ><v-icon size="14">mdi-minus</v-icon></v-btn>
          <v-btn
            icon size="x-small" variant="tonal"
            :disabled="fishStore.availabilityRating >= 10 || adjustingRating"
            :loading="adjustingRating && ratingDelta === 1"
            @click="doAdjustRating(1)"
          ><v-icon size="14">mdi-plus</v-icon></v-btn>
        </div>
      </div>
      <!-- Admin: per-fish dots for editing only -->
      <div v-if="isAdmin" class="avail-fish-row">
        <div
          v-for="fish in fishStore.fishes"
          :key="fish.id"
          class="avail-fish-dot-wrap avail-fish-clickable"
          :title="fish.fishName + ': ' + fish.fishAmountAvailableNow + '/' + fish.fishAmountDaily"
          @click="openSetDialog(fish)"
        >
          <div class="avail-fish-dot" :style="{ background: ratingColor(fishRating(fish)) }" />
          <span class="avail-fish-name wi-muted-text">{{ fish.fishName }}</span>
        </div>
      </div>
    </div>

    <!-- Admin: set fish availability dialog -->
    <v-dialog v-model="setDialog.open" max-width="320">
      <v-card class="set-avail-dialog">
        <div class="guild-dialog-header">
          <v-icon class="mr-2">mdi-fish</v-icon>
          {{ setDialog.fish?.fishName }}
        </div>
        <v-card-text>
          <div class="avail-dialog-current wi-muted-text mb-3">
            Наразі: {{ setDialog.fish?.fishAmountAvailableNow }} / {{ setDialog.fish?.fishAmountDaily }}
          </div>
          <v-text-field
            v-model.number="setDialog.value"
            type="number" min="0"
            :label="`Нова кількість (макс. ${setDialog.fish?.fishAmountDaily})`"
            variant="outlined" density="compact" hide-details="auto"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="setDialog.open = false">Скасувати</v-btn>
          <v-btn variant="tonal" :loading="savingFishId === setDialog.fish?.id" @click="confirmSet">Зберегти</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Recent activity feed -->
    <div class="section-title">
      <v-icon class="mr-2" size="16">mdi-clock-outline</v-icon>
      Улови за день
      <v-spacer />
      <div class="feed-date-nav">
        <v-btn icon size="x-small" variant="text" :disabled="!canGoPrevDay" @click="shiftFeedDay(-1)">
          <v-icon size="16">mdi-chevron-left</v-icon>
        </v-btn>
        <span class="feed-date-label">{{ feedDateLabel }}</span>
        <v-btn icon size="x-small" variant="text" :disabled="!canGoNextDay" @click="shiftFeedDay(1)">
          <v-icon size="16">mdi-chevron-right</v-icon>
        </v-btn>
      </div>
    </div>
    <div class="feed-list">
      <div v-if="store.loading" class="wi-muted-text py-2 px-4">Завантаження...</div>
      <div v-else-if="feedEntries.length === 0" class="wi-muted-text feed-empty">Немає записів за цей день</div>
      <div
        v-for="entry in feedEntries"
        :key="entry.id"
        class="feed-entry"
        :class="entry.success ? 'feed-success' : 'feed-fail'"
      >
        <v-icon size="13" class="mr-2">{{ entry.success ? 'mdi-fish' : 'mdi-fish-off' }}</v-icon>
        <span class="feed-user">{{ entry.username }}</span>
        <span v-if="entry.success && entry.fishName" class="feed-text">
          зловив <strong>{{ entry.fishName }}</strong>
          <span v-if="entry.fishCount > 1"> +{{ entry.fishCount - 1 }} ін.</span>
          ({{ formatAmount(entry.fishValue) }} <span class="wi-coin">SP</span>)
        </span>
        <span v-else-if="!entry.success" class="feed-text wi-muted-text"> нічого не спіймав</span>
        <span class="feed-time wi-muted-text ml-auto">{{ timeAgo(entry.timestamp) }}</span>
      </div>
    </div>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useFishingLeaderboardStore } from '@/store/fishingLeaderboardStore';
import { useFishStore } from '@/store/fishStore';
import { useUserStore } from '@/store/userStore';
import { formatAmount } from '@/utils/formatters';
import { resolveFishValue } from '@/utils/fishingUtils';
import { FISHING_EXCLUDED_USERS } from '@/config/constants';

const store = useFishingLeaderboardStore();
const fishStore = useFishStore();
const isAdmin = computed(() => useUserStore().isAdmin ?? false);

onMounted(() => { store.subscribe(); fishStore.subscribe(); });
onBeforeUnmount(() => { store.unsubscribe(); fishStore.unsubscribe(); });

// Fish availability helpers
function fishRating(fish) {
  const daily = Number(fish.fishAmountDaily || 0);
  if (daily === 0) return 0;
  return Math.min(10, Math.round((Math.max(0, Number(fish.fishAmountAvailableNow || 0)) / daily) * 10));
}

function ratingColor(rating) {
  if (rating >= 7) return 'var(--wi-success)';
  if (rating >= 4) return 'var(--wi-gold)';
  return 'var(--wi-danger)';
}

function ratingLabel(rating) {
  if (rating >= 8) return 'Риби вдосталь';
  if (rating >= 5) return 'Помірна наявність';
  if (rating >= 2) return 'Риби мало';
  return 'Майже вичерпано';
}

const savingFishId = ref(null);
const setDialog = ref({ open: false, fish: null, value: 0 });

// Rating-level adjustment
const adjustingRating = ref(false);
const ratingDelta = ref(0);

async function doAdjustRating(delta) {
  adjustingRating.value = true;
  ratingDelta.value = delta;
  try {
    await fishStore.adjustRating(delta);
  } finally {
    adjustingRating.value = false;
    ratingDelta.value = 0;
  }
}

function openSetDialog(fish) {
  setDialog.value = { open: true, fish, value: fish.fishAmountAvailableNow };
}

async function confirmSet() {
  savingFishId.value = setDialog.value.fish.id;
  try {
    await fishStore.setAvailability(setDialog.value.fish.id, setDialog.value.value);
    setDialog.value.open = false;
  } finally {
    savingFishId.value = null;
  }
}

// Time filter
const timeFilter = ref('all');
const filterOptions = [
  { label: 'Весь час', value: 'all' },
  { label: 'Цей тиждень', value: 'week' },
  { label: 'Сьогодні', value: 'today' },
];

function getFilterStart() {
  const now = new Date();
  if (timeFilter.value === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (timeFilter.value === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

const filteredLogs = computed(() => {
  const start = getFilterStart();
  return store.logs.filter((log) => {
    const username = log.telegramUsername || String(log.telegramUserId || 'unknown');
    if (FISHING_EXCLUDED_USERS.has(username)) return false;
    if (start && new Date(log.timestamp) < start) return false;
    return true;
  });
});

// Summary stats from filtered logs
const totalCatches = computed(() => filteredLogs.value.reduce((sum, log) => {
  const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true;
  return sum + (isSuccess ? Number(log.fishQuantityCaught || 0) : 0);
}, 0));

const totalAttempts = computed(() => filteredLogs.value.length);

const successRate = computed(() => {
  if (totalAttempts.value === 0) return 0;
  const successes = filteredLogs.value.filter(
    (l) => l.successFailureResult === 'success' || l.successFailureResult === true,
  ).length;
  return Math.round((successes / totalAttempts.value) * 100);
});

// Angler stats filtered by time period
const filteredAnglerStats = computed(() => {
  const map = new Map();
  for (const log of filteredLogs.value) {
    const key = log.telegramUsername || String(log.telegramUserId || 'unknown');
    const s = map.get(key) || {
      username: key, attempts: 0, successAttempts: 0, catches: 0, totalSilver: 0, bestFish: null, bestFishValue: 0,
    };
    s.attempts += 1;
    const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true;
    if (isSuccess) {
      s.successAttempts += 1;
      const fish = Array.isArray(log.fishSelected) ? log.fishSelected : [];
      s.catches += fish.length;
      for (const f of fish) {
        const val = resolveFishValue(f, log.effectiveRollUsed);
        s.totalSilver += val;
        if (val > s.bestFishValue) { s.bestFishValue = val; s.bestFish = f.fishName || null; }
      }
    }
    map.set(key, s);
  }
  return Array.from(map.values()).map((s) => ({
    ...s,
    winRate: s.attempts > 0 ? Math.round((s.successAttempts / s.attempts) * 100) : 0,
  }));
});

// Sorting
const sortKey = ref('catches');
const sortDesc = ref(true);

const columns = [
  { key: 'username', label: 'Рибалка' },
  { key: 'catches', label: 'Улови' },
  { key: 'totalSilver', label: 'Срібло' },
  { key: 'bestFish', label: 'Найкращий улов' },
  { key: 'winRate', label: 'Успіх %' },
  { key: 'attempts', label: 'Спроби' },
];

function setSort(key) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortKey.value = key;
    sortDesc.value = true;
  }
}

const sortedAnglers = computed(() => {
  const arr = [...filteredAnglerStats.value];
  arr.sort((a, b) => {
    const aVal = a[sortKey.value] ?? '';
    const bVal = b[sortKey.value] ?? '';
    if (typeof aVal === 'string') {
      return sortDesc.value ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    return sortDesc.value ? bVal - aVal : aVal - bVal;
  });
  return arr;
});

// Feed day navigation — default to today
const feedDayOffset = ref(0); // 0 = today, -1 = yesterday, etc.

function feedDayStart(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function feedDayEnd(offset) {
  const d = feedDayStart(offset);
  d.setDate(d.getDate() + 1);
  return d;
}

const feedDateLabel = computed(() => {
  if (feedDayOffset.value === 0) return 'Сьогодні';
  if (feedDayOffset.value === -1) return 'Вчора';
  const d = feedDayStart(feedDayOffset.value);
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
});

const canGoNextDay = computed(() => feedDayOffset.value < 0);
const canGoPrevDay = computed(() => {
  // Allow navigating back as long as the earliest log predates the day we'd show
  if (!store.logs.length) return false;
  const earliestLog = store.logs[store.logs.length - 1];
  return new Date(earliestLog.timestamp) < feedDayStart(feedDayOffset.value);
});

function shiftFeedDay(delta) {
  feedDayOffset.value += delta;
}

const feedEntries = computed(() => {
  const start = feedDayStart(feedDayOffset.value);
  const end = feedDayEnd(feedDayOffset.value);
  return store.logs
    .filter((log) => {
      const username = log.telegramUsername || String(log.telegramUserId || 'unknown');
      if (FISHING_EXCLUDED_USERS.has(username)) return false;
      const ts = new Date(log.timestamp);
      return ts >= start && ts < end;
    })
    .map((log) => {
      const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true;
      const fish = Array.isArray(log.fishSelected) ? log.fishSelected : [];
      const username = log.telegramUsername || String(log.telegramUserId || 'unknown');
      const topFish = fish[0] || null;
      return {
        id: log.id,
        username,
        success: isSuccess,
        fishName: topFish?.fishName || null,
        fishValue: topFish ? resolveFishValue(topFish, log.effectiveRollUsed) : 0,
        fishCount: fish.length,
        timestamp: log.timestamp,
      };
    });
});

// Helpers
function formatDate(ts) {
  if (!ts) return '?';
  const d = new Date(ts);
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'щойно';
  if (mins < 60) return `${mins} хв тому`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} год тому`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'вчора';
  return `${days} дн тому`;
}
</script>

<style scoped>
.fishing-page {
  max-width: 900px;
}

.fishing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.fishing-title {
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
}

.filter-select {
  max-width: 160px;
}

.fishing-error {
  color: var(--wi-danger);
  font-size: 0.85rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

/* Stat cards */
.stat-card {
  background: linear-gradient(160deg, var(--wi-surface) 0%, var(--wi-bg) 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 1.6rem;
  color: var(--wi-gold);
  line-height: 1.2;
}

.stat-unit {
  font-size: 1rem;
}

.stat-label {
  font-size: 0.78rem;
  margin-top: 4px;
}

/* Section titles */
.section-title {
  font-family: var(--wi-font-heading);
  font-size: 0.85rem;
  color: var(--wi-gold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--wi-border);
}

/* Rankings table */
.rankings-table-wrap {
  background: linear-gradient(160deg, var(--wi-surface) 0%, var(--wi-bg) 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
}

.rankings-table :deep(table) {
  background: transparent;
}

.rankings-table :deep(th) {
  color: var(--wi-text-muted) !important;
  font-size: 0.78rem !important;
  font-family: var(--wi-font-heading);
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--wi-border) !important;
  background: transparent !important;
}

.rankings-table :deep(td) {
  color: var(--wi-text);
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(90, 62, 32, 0.3) !important;
}

.rankings-table :deep(tr:last-child td) {
  border-bottom: none !important;
}

.sortable-col {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}

.sortable-col:hover,
.active-sort {
  color: var(--wi-gold) !important;
}

.rank-col {
  width: 40px;
  text-align: center;
}

.angler-name {
  font-family: var(--wi-font-mono, monospace);
  color: var(--wi-text) !important;
}

.angler-row:hover :deep(td) {
  background: rgba(200, 150, 42, 0.04) !important;
}

/* Rare catches */
.rare-catches-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.rare-catch-card {
  flex: 0 0 140px;
  background: linear-gradient(160deg, var(--wi-surface) 0%, var(--wi-bg) 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.rare-rank {
  font-size: 0.7rem;
  margin-bottom: 4px;
}

.rare-fish-name {
  font-family: var(--wi-font-heading);
  font-size: 0.82rem;
  line-height: 1.3;
  margin-bottom: 6px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rare-angler {
  font-size: 0.72rem;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rare-value {
  font-size: 1rem;
  color: var(--wi-gold);
  margin-bottom: 4px;
}

.rare-date {
  font-size: 0.7rem;
}

.feed-date-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.feed-date-label {
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  color: var(--wi-text-muted);
  min-width: 70px;
  text-align: center;
}

.feed-empty {
  padding: 16px;
  font-size: 0.85rem;
}

/* Feed */
.feed-list {
  background: linear-gradient(160deg, var(--wi-surface) 0%, var(--wi-bg) 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
}

.feed-entry {
  display: flex;
  align-items: center;
  padding: 9px 14px;
  font-size: 0.83rem;
  border-bottom: 1px solid rgba(90, 62, 32, 0.3);
  flex-wrap: wrap;
  gap: 4px;
}

.feed-entry:last-child {
  border-bottom: none;
}

.feed-success .feed-user {
  color: var(--wi-gold);
  font-weight: 600;
}

.feed-fail .feed-user {
  color: var(--wi-text-muted);
}

.feed-text {
  color: var(--wi-text);
}

.feed-time {
  font-size: 0.74rem;
  white-space: nowrap;
}

/* Fish availability */
.avail-admin-hint {
  font-size: 0.72rem;
  font-family: var(--wi-font-body, serif);
  text-transform: none;
  letter-spacing: 0;
  display: flex;
  align-items: center;
}

.avail-overall-card {
  background: linear-gradient(160deg, var(--wi-surface) 0%, var(--wi-bg) 100%);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  padding: 16px 18px;
}

.avail-overall-top {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  margin-bottom: 8px;
}

.avail-bar-wrap {
  height: 8px;
  background: rgba(90, 62, 32, 0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.avail-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease, background 0.5s ease;
  min-width: 3px;
}

.avail-overall-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.avail-rating-controls {
  display: flex;
  gap: 4px;
}

.avail-overall-score {
  font-family: var(--wi-font-heading);
  font-size: 1.4rem;
  font-weight: 700;
}

.avail-overall-desc {
  font-size: 0.8rem;
}

.avail-fish-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  border-top: 1px solid rgba(90, 62, 32, 0.3);
  padding-top: 12px;
}

.avail-fish-dot-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
}

.avail-fish-clickable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.15s;
}

.avail-fish-clickable:hover {
  background: rgba(200, 150, 42, 0.08);
}

.avail-fish-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.avail-fish-name {
  font-size: 0.72rem;
  white-space: nowrap;
}

.set-avail-dialog .guild-dialog-header {
  padding: 16px 20px 0;
  font-family: var(--wi-font-heading);
  font-size: 1rem;
  color: var(--wi-gold);
  display: flex;
  align-items: center;
}

.avail-dialog-current {
  font-size: 0.82rem;
}
</style>
