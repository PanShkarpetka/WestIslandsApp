import { defineStore } from 'pinia';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { computed, ref } from 'vue';
import { resolveFishValue } from '@/utils/fishingUtils';
import { FISHING_EXCLUDED_USERS } from '@/config/constants';

export const useFishingLeaderboardStore = defineStore('fishingLeaderboard', () => {
  const logs = ref([]);
  const heroes = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let _unsub = null;
  let _heroesUnsub = null;

  function normalizeTelegramUsername(value) {
    return String(value || '').trim().replace(/^@+/, '').toLowerCase();
  }

  function isNumericTelegramIdentity(value) {
    return /^\d+$/.test(String(value || '').trim());
  }

  function logTelegramUsername(log) {
    return log.telegramUsername || log.telegramUserNickname || '';
  }

  function logTelegramFallback(log) {
    return logTelegramUsername(log) || String(log.telegramUserId || 'unknown');
  }

  function isExcludedLog(log) {
    return FISHING_EXCLUDED_USERS.has(logTelegramFallback(log));
  }

  function findHeroForLog(log) {
    if (log.heroId || log.heroName) {
      return { id: log.heroId || '', name: log.heroName || log.heroId || '' };
    }

    const userId = String(log.telegramUserId || '').trim();
    const username = normalizeTelegramUsername(logTelegramUsername(log));
    return heroes.value.find((hero) => {
      const link = String(hero.telegramId || '').trim();
      if (!link) return false;
      if (isNumericTelegramIdentity(link)) return link === userId;
      return normalizeTelegramUsername(link) === username;
    }) || null;
  }

  function getLogDisplayName(log) {
    const hero = findHeroForLog(log);
    return hero?.name || logTelegramFallback(log);
  }

  function getLogParticipantKey(log) {
    const hero = findHeroForLog(log);
    if (hero?.id) return `hero:${hero.id}`;
    if (hero?.name) return `hero-name:${hero.name}`;
    return `telegram:${logTelegramFallback(log)}`;
  }

  function subscribe() {
    if (_unsub) return;
    loading.value = true;
    error.value = null;

    const db = getFirestore();
    const q = query(collection(db, 'fishing-logs'), orderBy('timestamp', 'desc'));

    _unsub = onSnapshot(
      q,
      (snap) => {
        logs.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        loading.value = false;
      },
      (err) => {
        error.value = err?.message || String(err);
        loading.value = false;
      },
    );

    _heroesUnsub = onSnapshot(
      collection(db, 'heroes'),
      (snap) => {
        heroes.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      },
      () => {
        heroes.value = [];
      },
    );
  }

  function unsubscribe() {
    _unsub?.();
    _heroesUnsub?.();
    _unsub = null;
    _heroesUnsub = null;
  }

  /** Top 8 best catches — one per angler, sorted by resolved fish value. */
  const rareCatches = computed(() => {
    const bestPerUser = new Map();

    for (const log of logs.value) {
      const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true;
      if (!isSuccess) continue;
      if (isExcludedLog(log)) continue;
      const participantKey = getLogParticipantKey(log);
      const participantName = getLogDisplayName(log);

      for (const f of (Array.isArray(log.fishSelected) ? log.fishSelected : [])) {
        const val = resolveFishValue(f, log.effectiveRollUsed);
        const existing = bestPerUser.get(participantKey);
        if (!existing || val > existing.fishValue) {
          bestPerUser.set(participantKey, {
            fishName: f.fishName || '?',
            fishValue: val,
            username: participantName,
            timestamp: log.timestamp,
          });
        }
      }
    }

    return Array.from(bestPerUser.values())
      .sort((a, b) => b.fishValue - a.fishValue)
      .slice(0, 8);
  });

  /** Last 20 log entries for non-excluded users, enriched for display. */
  const recentFeed = computed(() => {
    return logs.value
      .filter((log) => {
        return !isExcludedLog(log);
      })
      .slice(0, 20)
      .map((log) => {
        const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true;
        const fish = Array.isArray(log.fishSelected) ? log.fishSelected : [];
        const username = getLogDisplayName(log);
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

  return {
    logs,
    heroes,
    loading,
    error,
    subscribe,
    unsubscribe,
    rareCatches,
    recentFeed,
    getLogDisplayName,
    getLogParticipantKey,
    isExcludedLog,
  };
});
