import { defineStore } from 'pinia';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { computed, ref } from 'vue';
import { resolveFishValue } from '@/utils/fishingUtils';
import { FISHING_EXCLUDED_USERS } from '@/config/constants';

export const useFishingLeaderboardStore = defineStore('fishingLeaderboard', () => {
  const logs = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let _unsub = null;

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
  }

  function unsubscribe() {
    _unsub?.();
    _unsub = null;
  }

  /** Top 8 best catches — one per angler, sorted by resolved silver value. */
  const rareCatches = computed(() => {
    const bestPerUser = new Map();

    for (const log of logs.value) {
      const isSuccess = log.successFailureResult === 'success' || log.successFailureResult === true;
      if (!isSuccess) continue;
      const username = log.telegramUsername || String(log.telegramUserId || 'unknown');
      if (FISHING_EXCLUDED_USERS.has(username)) continue;

      for (const f of (Array.isArray(log.fishSelected) ? log.fishSelected : [])) {
        const val = resolveFishValue(f, log.effectiveRollUsed);
        const existing = bestPerUser.get(username);
        if (!existing || val > existing.fishValue) {
          bestPerUser.set(username, {
            fishName: f.fishName || '?',
            fishValue: val,
            username,
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
        const username = log.telegramUsername || String(log.telegramUserId || 'unknown');
        return !FISHING_EXCLUDED_USERS.has(username);
      })
      .slice(0, 20)
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

  return {
    logs,
    loading,
    error,
    subscribe,
    unsubscribe,
    rareCatches,
    recentFeed,
  };
});
